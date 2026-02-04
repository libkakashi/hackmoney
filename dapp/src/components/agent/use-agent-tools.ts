'use client';

import {useCallback} from 'react';
import {
  type Address,
  type Hex,
  parseUnits,
  formatUnits,
  erc20Abi,
  zeroAddress,
  maxUint160,
  maxUint48,
} from 'viem';
import {
  usePublicClient,
  useWalletClient,
  useConnection,
  useWriteContract,
} from 'wagmi';
import {useQueryClient} from '@tanstack/react-query';
import {ccaAbi} from '~/abi/cca';
import {permit2Abi} from '~/abi/permit2';
import {PERMIT2_ADDRESS, usePermit2} from '~/hooks/use-permit2';
import {roundPriceToTick} from '~/lib/cca/utils';
import {getAuctionState} from '~/lib/cca/auction';
import {getUserBids} from '~/lib/cca/bid';
import {exitAndClaimBatch} from '~/lib/cca/claim';
import {useSwap} from '~/hooks/swap/use-swap';
import {launchpadLensAbi} from '~/abi/launchpad-lens';
import {quoterAbi} from '~/abi/quoter';
import {env} from '~/lib/env';

const QUOTER_ADDRESS = '0x52f0e24d1c21c8a0cb1e5a5dd6198556bd9e1203' as const;
const DEFAULT_SLIPPAGE_BPS = 100n; // 1%
const DEFAULT_DEADLINE_MINUTES = 20;

export function useAgentTools() {
  const publicClient = usePublicClient();
  const {data: walletClient} = useWalletClient();
  const {address: userAddress} = useConnection();
  const {mutateAsync: writeContractAsync} = useWriteContract();
  const queryClient = useQueryClient();
  const {needsErc20Approval, needsPermit2Signature} = usePermit2();
  const {swapExactInSingle} = useSwap();

  const placeBid = useCallback(
    async (auctionAddress: string, amountEth: string) => {
      if (!publicClient || !walletClient || !userAddress) {
        return {
          error: 'Wallet not connected. Please connect your wallet first.',
        };
      }

      const auctionAddr = auctionAddress as Address;
      const amount = parseUnits(amountEth, 18);

      try {
        // Read auction state
        const auctionState = await getAuctionState(auctionAddr, publicClient);
        if (auctionState.status !== 'active') {
          return {
            error: `Cannot bid: auction is '${auctionState.status}', not 'active'.`,
          };
        }

        const currency = auctionState.currency;
        const isNative = currency === zeroAddress;

        // Handle ERC20 approvals if needed
        if (!isNative) {
          const needsApproval = await needsErc20Approval(currency, amount);
          if (needsApproval) {
            const approvalHash = await writeContractAsync({
              address: currency,
              abi: erc20Abi,
              functionName: 'approve',
              args: [PERMIT2_ADDRESS, 2n ** 256n - 1n],
            });
            await publicClient.waitForTransactionReceipt({hash: approvalHash});
          }

          const needsPermit = await needsPermit2Signature(
            currency,
            auctionAddr,
            1n,
          );
          if (needsPermit) {
            const approveHash = await writeContractAsync({
              address: PERMIT2_ADDRESS,
              abi: permit2Abi,
              functionName: 'approve',
              args: [currency, auctionAddr, maxUint160, Number(maxUint48)],
            });
            await publicClient.waitForTransactionReceipt({hash: approveHash});
          }
        }

        // Get max bid price and round it
        const maxBidPrice = await publicClient.readContract({
          address: auctionAddr,
          abi: ccaAbi,
          functionName: 'MAX_BID_PRICE',
        });
        const maxPriceQ96 = roundPriceToTick(
          maxBidPrice,
          auctionState.tickSpacingQ96,
          auctionState.floorPriceQ96,
        );

        const hookData: Hex = '0x';

        // Simulate first
        await publicClient.simulateContract({
          address: auctionAddr,
          abi: ccaAbi,
          functionName: 'submitBid',
          args: [maxPriceQ96, amount, userAddress, hookData],
          account: userAddress,
          value: isNative ? amount : 0n,
        });

        // Execute bid
        const hash = await writeContractAsync({
          address: auctionAddr,
          abi: ccaAbi,
          functionName: 'submitBid',
          args: [maxPriceQ96, amount, userAddress, hookData],
          value: isNative ? amount : 0n,
        });
        await publicClient.waitForTransactionReceipt({hash});

        await queryClient.invalidateQueries();
        return {success: true, txHash: hash, amount: amountEth};
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Transaction failed';
        return {error: msg};
      }
    },
    [
      publicClient,
      walletClient,
      userAddress,
      writeContractAsync,
      queryClient,
      needsErc20Approval,
      needsPermit2Signature,
    ],
  );

  const claimTokens = useCallback(
    async (auctionAddress: string) => {
      if (!publicClient || !walletClient || !userAddress) {
        return {
          error: 'Wallet not connected. Please connect your wallet first.',
        };
      }

      const auctionAddr = auctionAddress as Address;

      try {
        const auctionState = await getAuctionState(auctionAddr, publicClient);
        if (auctionState.status !== 'claimable') {
          return {
            error: `Cannot claim: auction is '${auctionState.status}', not 'claimable'.`,
          };
        }

        const bids = await getUserBids(
          auctionAddr,
          userAddress,
          publicClient,
          auctionState.startBlock,
        );

        if (bids.length === 0) {
          return {error: 'No bids found for this auction.'};
        }

        const bidIds = bids.map(b => b.id);
        const hash = await exitAndClaimBatch(
          walletClient,
          publicClient,
          auctionAddr,
          bidIds,
          userAddress,
        );
        await publicClient.waitForTransactionReceipt({hash});

        await queryClient.invalidateQueries();
        return {success: true, txHash: hash, bidsProcessed: bids.length};
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Transaction failed';
        return {error: msg};
      }
    },
    [publicClient, walletClient, userAddress, queryClient],
  );

  const swapTokens = useCallback(
    async (
      tokenAddress: string,
      sellAmount: string,
      buyToken: 'token' | 'quote',
    ) => {
      if (!publicClient || !walletClient || !userAddress) {
        return {
          error: 'Wallet not connected. Please connect your wallet first.',
        };
      }

      const tokenAddr = tokenAddress as Address;

      try {
        // 1. Look up the token's strategy address, then get on-chain strategy state
        const {graphqlClient} = await import('~/graphql/client');
        const tokenData = await graphqlClient.GetTokenByAddress({
          token: tokenAddr.toLowerCase(),
        });
        const token = tokenData.Launchpad_TokenLaunched[0];
        if (!token) return {error: 'Token not found'};

        const strategyAddr = token.strategy as Address;

        // Get strategy state (contains pool key)
        const strategyState = await publicClient.readContract({
          address: env.launchpadLensAddr,
          abi: launchpadLensAbi,
          functionName: 'getStrategyState',
          args: [strategyAddr],
        });

        if (!strategyState.isMigrated) {
          return {
            error:
              'Pool not yet migrated to Uniswap V4. Swaps are not available yet.',
          };
        }

        const poolKey = {
          currency0: strategyState.currency0,
          currency1: strategyState.currency1,
          fee: strategyState.fee,
          tickSpacing: strategyState.tickSpacing,
          hooks: strategyState.hooks,
        };

        // 2. Determine swap direction
        // buyToken === 'token' means user wants to buy the launched token (sell quote)
        // buyToken === 'quote' means user wants to sell the launched token (buy quote)
        const tokenIsToken0 =
          strategyState.currency0.toLowerCase() === tokenAddr.toLowerCase();

        // zeroForOne = selling token0 for token1
        // If buying the token and token is token0: selling token1 (quote) for token0 → zeroForOne = false
        // If buying the token and token is token1: selling token0 (quote) for token1 → zeroForOne = true
        // If buying quote and token is token0: selling token0 for token1 (quote) → zeroForOne = true
        // If buying quote and token is token1: selling token1 for token0 (quote) → zeroForOne = false
        const zeroForOne =
          buyToken === 'token' ? !tokenIsToken0 : tokenIsToken0;

        // 3. Get decimals for the sell token
        const tokenIn = zeroForOne ? poolKey.currency0 : poolKey.currency1;
        const tokenInData = await publicClient.readContract({
          address: env.launchpadLensAddr,
          abi: launchpadLensAbi,
          functionName: 'getTokenData',
          args: [tokenIn],
        });

        const amountIn = parseUnits(sellAmount, tokenInData.decimals);

        // 4. Get a quote
        const quoteResult = await publicClient.simulateContract({
          address: QUOTER_ADDRESS,
          abi: quoterAbi,
          functionName: 'quoteExactInputSingle',
          args: [
            {
              poolKey,
              zeroForOne,
              exactAmount: amountIn,
              hookData: '0x' as Hex,
            },
          ],
        });

        const quotedAmountOut = quoteResult.result[0];

        // Apply 1% slippage
        const amountOutMin =
          quotedAmountOut - (quotedAmountOut * DEFAULT_SLIPPAGE_BPS) / 10000n;

        // 5. Execute swap
        const deadline = BigInt(
          Math.floor(Date.now() / 1000) + DEFAULT_DEADLINE_MINUTES * 60,
        );

        const receipt = await swapExactInSingle(
          poolKey,
          amountIn,
          amountOutMin,
          zeroForOne,
          deadline,
        );

        if (receipt.status !== 'success') {
          return {error: 'Swap transaction reverted'};
        }

        // Get output token info for display
        const tokenOut = zeroForOne ? poolKey.currency1 : poolKey.currency0;
        const tokenOutData = await publicClient.readContract({
          address: env.launchpadLensAddr,
          abi: launchpadLensAbi,
          functionName: 'getTokenData',
          args: [tokenOut],
        });

        await queryClient.invalidateQueries();

        return {
          success: true,
          txHash: receipt.transactionHash,
          sold: `${sellAmount} ${tokenInData.symbol}`,
          received: `~${Number(formatUnits(quotedAmountOut, tokenOutData.decimals)).toFixed(4)} ${tokenOutData.symbol}`,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Swap failed';
        return {error: msg};
      }
    },
    [publicClient, walletClient, userAddress, swapExactInSingle, queryClient],
  );

  return {placeBid, claimTokens, swapTokens};
}
