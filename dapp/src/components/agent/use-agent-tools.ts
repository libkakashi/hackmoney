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
    async (auctionAddress: string, amountStr: string) => {
      if (!publicClient || !walletClient || !userAddress) {
        return {
          error: 'Wallet not connected. Please connect your wallet first.',
        };
      }

      const auctionAddr = auctionAddress as Address;

      try {
        // Read auction state to get currency info and decimals
        const auctionState = await getAuctionState(auctionAddr, publicClient);
        if (auctionState.status !== 'active') {
          return {
            error: `Cannot bid: auction is '${auctionState.status}', not 'active'.`,
          };
        }

        const currency = auctionState.currency;
        const isNative = currency === zeroAddress;
        const amount = parseUnits(amountStr, auctionState.currencyDecimals);
        const hookData: Hex = '0x';

        // Handle ERC20 approvals if needed (mirrors use-submit-bid.ts exactly)
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

          // Check Permit2 allowance for auction (use 1n to check for any valid allowance)
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
        return {success: true, txHash: hash, amount: amountStr};
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

  const getBalances = useCallback(
    async (tokenAddress: string) => {
      if (!publicClient || !userAddress) {
        return {
          error: 'Wallet not connected. Please connect your wallet first.',
        };
      }

      const tokenAddr = tokenAddress as Address;

      try {
        const {graphqlClient} = await import('~/graphql/client');
        const tokenQueryData = await graphqlClient.GetTokenByAddress({
          token: tokenAddr.toLowerCase(),
        });
        const token = tokenQueryData.Launchpad_TokenLaunched[0];
        if (!token) return {error: 'Token not found'};

        const strategyAddr = token.strategy as Address;
        const strategyState = await publicClient.readContract({
          address: env.launchpadLensAddr,
          abi: launchpadLensAbi,
          functionName: 'getStrategyState',
          args: [strategyAddr],
        });

        const tokenIsToken0 =
          strategyState.currency0.toLowerCase() === tokenAddr.toLowerCase();
        const quoteAddr = tokenIsToken0
          ? strategyState.currency1
          : strategyState.currency0;

        const [tokenData, quoteData, tokenBalance, quoteBalance] =
          await Promise.all([
            publicClient.readContract({
              address: env.launchpadLensAddr,
              abi: launchpadLensAbi,
              functionName: 'getTokenData',
              args: [tokenAddr],
            }),
            publicClient.readContract({
              address: env.launchpadLensAddr,
              abi: launchpadLensAbi,
              functionName: 'getTokenData',
              args: [quoteAddr],
            }),
            publicClient.readContract({
              address: tokenAddr,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [userAddress],
            }),
            publicClient.readContract({
              address: quoteAddr,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [userAddress],
            }),
          ]);

        return {
          success: true,
          balances: {
            [tokenData.symbol]: formatUnits(tokenBalance, tokenData.decimals),
            [quoteData.symbol]: formatUnits(quoteBalance, quoteData.decimals),
          },
          wallet: userAddress,
        };
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Failed to fetch balances';
        return {error: msg};
      }
    },
    [publicClient, userAddress],
  );

  // Helper to resolve swap context (pool key, direction, token data)
  const resolveSwapContext = useCallback(
    async (
      tokenAddress: string,
      sellAmount: string,
      buyToken: 'token' | 'quote',
    ) => {
      if (!publicClient || !userAddress) {
        throw new Error('Wallet not connected');
      }

      const tokenAddr = tokenAddress as Address;
      const {graphqlClient} = await import('~/graphql/client');
      const tokenData = await graphqlClient.GetTokenByAddress({
        token: tokenAddr.toLowerCase(),
      });
      const token = tokenData.Launchpad_TokenLaunched[0];
      if (!token) throw new Error('Token not found');

      const strategyAddr = token.strategy as Address;
      const strategyState = await publicClient.readContract({
        address: env.launchpadLensAddr,
        abi: launchpadLensAbi,
        functionName: 'getStrategyState',
        args: [strategyAddr],
      });

      if (!strategyState.isMigrated) {
        throw new Error(
          'Pool not yet migrated to Uniswap V4. Swaps are not available yet.',
        );
      }

      const poolKey = {
        currency0: strategyState.currency0,
        currency1: strategyState.currency1,
        fee: strategyState.fee,
        tickSpacing: strategyState.tickSpacing,
        hooks: strategyState.hooks,
      };

      const tokenIsToken0 =
        strategyState.currency0.toLowerCase() === tokenAddr.toLowerCase();
      const zeroForOne = buyToken === 'token' ? !tokenIsToken0 : tokenIsToken0;

      const tokenIn = zeroForOne ? poolKey.currency0 : poolKey.currency1;
      const tokenOut = zeroForOne ? poolKey.currency1 : poolKey.currency0;

      const [tokenInData, tokenOutData] = await Promise.all([
        publicClient.readContract({
          address: env.launchpadLensAddr,
          abi: launchpadLensAbi,
          functionName: 'getTokenData',
          args: [tokenIn],
        }),
        publicClient.readContract({
          address: env.launchpadLensAddr,
          abi: launchpadLensAbi,
          functionName: 'getTokenData',
          args: [tokenOut],
        }),
      ]);

      const amountIn = parseUnits(sellAmount, tokenInData.decimals);

      return {
        poolKey,
        zeroForOne,
        tokenIn,
        tokenOut,
        tokenInData,
        tokenOutData,
        amountIn,
      };
    },
    [publicClient, userAddress],
  );

  const previewSwap = useCallback(
    async (
      tokenAddress: string,
      sellAmount: string,
      buyToken: 'token' | 'quote',
    ) => {
      if (!publicClient || !userAddress) {
        return {
          error: 'Wallet not connected. Please connect your wallet first.',
        };
      }

      try {
        const ctx = await resolveSwapContext(
          tokenAddress,
          sellAmount,
          buyToken,
        );

        // Get user balances
        const [balanceIn, balanceOut] = await Promise.all([
          publicClient.readContract({
            address: ctx.tokenIn,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [userAddress],
          }),
          publicClient.readContract({
            address: ctx.tokenOut,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [userAddress],
          }),
        ]);

        // Get quote
        const quoteResult = await publicClient.simulateContract({
          address: QUOTER_ADDRESS,
          abi: quoterAbi,
          functionName: 'quoteExactInputSingle',
          args: [
            {
              poolKey: ctx.poolKey,
              zeroForOne: ctx.zeroForOne,
              exactAmount: ctx.amountIn,
              hookData: '0x' as Hex,
            },
          ],
        });
        const quotedAmountOut = quoteResult.result[0];

        // Check if approval is needed (ERC20 -> Permit2)
        const approvalNeeded = await needsErc20Approval(
          ctx.tokenIn,
          ctx.amountIn,
        );

        // Calculate price impact (rough: compare against simple ratio)
        const amountOutMin =
          quotedAmountOut - (quotedAmountOut * DEFAULT_SLIPPAGE_BPS) / 10000n;

        const balanceInFormatted = formatUnits(
          balanceIn,
          ctx.tokenInData.decimals,
        );
        const balanceOutFormatted = formatUnits(
          balanceOut,
          ctx.tokenOutData.decimals,
        );
        const quotedOutFormatted = formatUnits(
          quotedAmountOut,
          ctx.tokenOutData.decimals,
        );
        const minOutFormatted = formatUnits(
          amountOutMin,
          ctx.tokenOutData.decimals,
        );

        return {
          success: true,
          selling: `${sellAmount} ${ctx.tokenInData.symbol}`,
          receiving: `~${Number(quotedOutFormatted).toFixed(6)} ${ctx.tokenOutData.symbol}`,
          minimumReceived: `${Number(minOutFormatted).toFixed(6)} ${ctx.tokenOutData.symbol}`,
          slippage: '1%',
          balanceBefore: {
            [ctx.tokenInData.symbol]:
              `${Number(balanceInFormatted).toFixed(6)}`,
            [ctx.tokenOutData.symbol]:
              `${Number(balanceOutFormatted).toFixed(6)}`,
          },
          balanceAfter: {
            [ctx.tokenInData.symbol]:
              `${Number(Number(balanceInFormatted) - Number(sellAmount)).toFixed(6)}`,
            [ctx.tokenOutData.symbol]:
              `${Number(Number(balanceOutFormatted) + Number(quotedOutFormatted)).toFixed(6)}`,
          },
          needsApproval: approvalNeeded,
          approvalToken: approvalNeeded ? ctx.tokenInData.symbol : null,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Preview failed';
        return {error: msg};
      }
    },
    [publicClient, userAddress, resolveSwapContext, needsErc20Approval],
  );

  const approveIfNeeded = useCallback(
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

      try {
        const ctx = await resolveSwapContext(
          tokenAddress,
          sellAmount,
          buyToken,
        );
        const needsApproval = await needsErc20Approval(
          ctx.tokenIn,
          ctx.amountIn,
        );

        if (!needsApproval) {
          return {
            success: true,
            message: `${ctx.tokenInData.symbol} already approved, no action needed`,
            alreadyApproved: true,
          };
        }

        // Send ERC20 approval to Permit2
        const approvalHash = await writeContractAsync({
          address: ctx.tokenIn,
          abi: erc20Abi,
          functionName: 'approve',
          args: [PERMIT2_ADDRESS, 2n ** 256n - 1n],
        });
        await publicClient.waitForTransactionReceipt({hash: approvalHash});

        return {
          success: true,
          message: `${ctx.tokenInData.symbol} approved for trading`,
          txHash: approvalHash,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Approval failed';
        return {error: msg};
      }
    },
    [
      publicClient,
      walletClient,
      userAddress,
      writeContractAsync,
      resolveSwapContext,
      needsErc20Approval,
    ],
  );

  const executeSwap = useCallback(
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

      try {
        const ctx = await resolveSwapContext(
          tokenAddress,
          sellAmount,
          buyToken,
        );

        // Get balances before swap
        const [balanceInBefore, balanceOutBefore] = await Promise.all([
          publicClient.readContract({
            address: ctx.tokenIn,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [userAddress],
          }),
          publicClient.readContract({
            address: ctx.tokenOut,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [userAddress],
          }),
        ]);

        // Get quote for min amount
        const quoteResult = await publicClient.simulateContract({
          address: QUOTER_ADDRESS,
          abi: quoterAbi,
          functionName: 'quoteExactInputSingle',
          args: [
            {
              poolKey: ctx.poolKey,
              zeroForOne: ctx.zeroForOne,
              exactAmount: ctx.amountIn,
              hookData: '0x' as Hex,
            },
          ],
        });
        const quotedAmountOut = quoteResult.result[0];
        const amountOutMin =
          quotedAmountOut - (quotedAmountOut * DEFAULT_SLIPPAGE_BPS) / 10000n;

        // Execute swap
        const deadline = BigInt(
          Math.floor(Date.now() / 1000) + DEFAULT_DEADLINE_MINUTES * 60,
        );

        const receipt = await swapExactInSingle(
          ctx.poolKey,
          ctx.amountIn,
          amountOutMin,
          ctx.zeroForOne,
          deadline,
        );

        if (receipt.status !== 'success') {
          return {error: 'Swap transaction reverted'};
        }

        // Get balances after swap
        const [balanceInAfter, balanceOutAfter] = await Promise.all([
          publicClient.readContract({
            address: ctx.tokenIn,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [userAddress],
          }),
          publicClient.readContract({
            address: ctx.tokenOut,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [userAddress],
          }),
        ]);

        await queryClient.invalidateQueries();

        return {
          success: true,
          txHash: receipt.transactionHash,
          sold: `${formatUnits(balanceInBefore - balanceInAfter, ctx.tokenInData.decimals)} ${ctx.tokenInData.symbol}`,
          received: `${formatUnits(balanceOutAfter - balanceOutBefore, ctx.tokenOutData.decimals)} ${ctx.tokenOutData.symbol}`,
          balanceBefore: {
            [ctx.tokenInData.symbol]: formatUnits(
              balanceInBefore,
              ctx.tokenInData.decimals,
            ),
            [ctx.tokenOutData.symbol]: formatUnits(
              balanceOutBefore,
              ctx.tokenOutData.decimals,
            ),
          },
          balanceAfter: {
            [ctx.tokenInData.symbol]: formatUnits(
              balanceInAfter,
              ctx.tokenInData.decimals,
            ),
            [ctx.tokenOutData.symbol]: formatUnits(
              balanceOutAfter,
              ctx.tokenOutData.decimals,
            ),
          },
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Swap failed';
        return {error: msg};
      }
    },
    [
      publicClient,
      walletClient,
      userAddress,
      swapExactInSingle,
      queryClient,
      resolveSwapContext,
    ],
  );

  return {
    placeBid,
    claimTokens,
    getBalances,
    previewSwap,
    approveIfNeeded,
    executeSwap,
  };
}
