'use client';

import {useCallback} from 'react';
import {
  type Address,
  type Hex,
  parseUnits,
  formatUnits,
  erc20Abi,
  zeroAddress,
} from 'viem';
import {
  usePublicClient,
  useWalletClient,
  useConnection,
  useWriteContract,
} from 'wagmi';
import {useQueryClient} from '@tanstack/react-query';
import {PERMIT2_ADDRESS, usePermit2} from '~/hooks/use-permit2';
import {useSwap} from '~/hooks/swap/use-swap';
import {
  USDC_ADDRESS,
  isDirectSwap,
  getQuoteTokenBySymbol,
  buildQuotePoolKey,
  type QuoteToken,
} from '~/lib/pools';
import {
  type PathKey,
  buildMultiHopPath,
  getQuoteExactInput,
  getQuoteExactOutput,
  getQuoteExactInputMultiHop,
  getQuoteExactOutputMultiHop,
} from '~/hooks/swap/use-quote';
import {useSubmitBidImperative} from '~/hooks/cca/use-submit-bid-imperative';
import {useClaimTokensImperative} from '~/hooks/cca/use-claim-tokens-imperative';
import {env} from '~/lib/env';
import {launchpadLensAbi} from '~/abi/launchpad-lens';
const DEFAULT_SLIPPAGE_BPS = 100n; // 1%
const DEFAULT_DEADLINE_MINUTES = 20;

export function useAgentTools() {
  const publicClient = usePublicClient();
  const {data: walletClient} = useWalletClient();
  const {address: userAddress} = useConnection();
  const {mutateAsync: writeContractAsync} = useWriteContract();
  const queryClient = useQueryClient();
  const {needsErc20Approval} = usePermit2();
  const {
    swapExactInSingle,
    swapExactIn,
    swapExactOutSingle,
    swapExactOut,
    swapExactInGeneric,
    swapExactOutGeneric,
  } = useSwap();

  // CCA hooks (imperative)
  const submitBidMutation = useSubmitBidImperative();
  const claimTokensMutation = useClaimTokensImperative();

  const placeBid = useCallback(
    async (auctionAddress: string, amountStr: string) => {
      try {
        const result = await submitBidMutation.mutateAsync({
          auctionAddress,
          amount: amountStr,
        });
        return {success: true, txHash: result.txHash, amount: result.amount};
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Transaction failed';
        return {error: msg};
      }
    },
    [submitBidMutation],
  );

  const claimTokens = useCallback(
    async (auctionAddress: string) => {
      try {
        const result = await claimTokensMutation.mutateAsync(auctionAddress);
        return {
          success: true,
          txHash: result.txHash,
          bidsProcessed: result.bidsProcessed,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Transaction failed';
        return {error: msg};
      }
    },
    [claimTokensMutation],
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

  // Helper to resolve swap context (pool key, direction, token data, multi-hop info)
  const resolveSwapContext = useCallback(
    async (
      tokenAddress: string,
      sellAmount: string,
      buyToken: 'token' | 'quote',
      quoteTokenSymbol: string = 'USDC',
    ) => {
      if (!publicClient || !userAddress) {
        throw new Error('Wallet not connected');
      }

      const tokenAddr = tokenAddress as Address;
      const quoteToken = getQuoteTokenBySymbol(quoteTokenSymbol);
      const isDirect = isDirectSwap(quoteToken);
      const sellingToken = buyToken === 'quote';

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

      // For single-hop (USDC), determine direction within the launchpad pool
      const zeroForOne = buyToken === 'token' ? !tokenIsToken0 : tokenIsToken0;

      // Determine the actual tokenIn/tokenOut from the user's perspective
      let tokenIn: Address;
      let tokenOut: Address;

      if (isDirect) {
        // Single-hop: swap within the launchpad pool directly
        tokenIn = zeroForOne ? poolKey.currency0 : poolKey.currency1;
        tokenOut = zeroForOne ? poolKey.currency1 : poolKey.currency0;
      } else {
        // Multi-hop: the real tokenIn/tokenOut are the launchpad token and the external quote token
        tokenIn = sellingToken ? tokenAddr : quoteToken.address;
        tokenOut = sellingToken ? quoteToken.address : tokenAddr;
      }

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

      // Build multi-hop path if needed
      const multiHopPath = isDirect
        ? undefined
        : buildMultiHopPath({
            poolKey,
            quoteToken,
            tokenAddr,
            sellingToken,
          });

      return {
        poolKey,
        zeroForOne,
        tokenIn,
        tokenOut,
        tokenInData,
        tokenOutData,
        amountIn,
        tokenAddr,
        quoteToken,
        isDirect,
        sellingToken,
        multiHopPath,
      };
    },
    [publicClient, userAddress],
  );

  const previewSwap = useCallback(
    async (
      tokenAddress: string,
      sellAmount: string,
      buyToken: 'token' | 'quote',
      quoteTokenSymbol: string = 'USDC',
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
          quoteTokenSymbol,
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

        // Get quote — single-hop or multi-hop
        let quotedAmountOut: bigint;

        if (ctx.isDirect) {
          quotedAmountOut = await getQuoteExactInput(publicClient, {
            poolKey: ctx.poolKey,
            zeroForOne: ctx.zeroForOne,
            exactAmount: ctx.amountIn,
            hookData: '0x' as Hex,
          });
        } else {
          if (!ctx.multiHopPath)
            throw new Error('Failed to build multi-hop path');
          quotedAmountOut = await getQuoteExactInputMultiHop(publicClient, {
            ...ctx.multiHopPath,
            exactAmount: ctx.amountIn,
          });
        }

        // Check if approval is needed (ERC20 -> Permit2)
        const approvalNeeded = await needsErc20Approval(
          ctx.tokenIn,
          ctx.amountIn,
        );

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
          route: ctx.isDirect
            ? `${ctx.tokenInData.symbol} -> ${ctx.tokenOutData.symbol}`
            : `${ctx.tokenInData.symbol} -> USDC -> ${ctx.tokenOutData.symbol}`,
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

  const previewSwapExactOutput = useCallback(
    async (
      tokenAddress: string,
      receiveAmount: string,
      buyToken: 'token' | 'quote',
      quoteTokenSymbol: string = 'USDC',
    ) => {
      if (!publicClient || !userAddress) {
        return {
          error: 'Wallet not connected. Please connect your wallet first.',
        };
      }

      try {
        // We still resolve the same swap context to get pool info, directions, etc.
        // We pass "1" as a dummy sellAmount since we only need the context, not amountIn.
        const ctx = await resolveSwapContext(
          tokenAddress,
          '1',
          buyToken,
          quoteTokenSymbol,
        );

        const amountOut = parseUnits(receiveAmount, ctx.tokenOutData.decimals);

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

        // Quote exact output — get the required input amount
        let quotedAmountIn: bigint;

        if (ctx.isDirect) {
          quotedAmountIn = await getQuoteExactOutput(publicClient, {
            poolKey: ctx.poolKey,
            zeroForOne: ctx.zeroForOne,
            exactAmount: amountOut,
            hookData: '0x' as Hex,
          });
        } else {
          const multiHopPath = buildMultiHopPath({
            poolKey: ctx.poolKey,
            quoteToken: ctx.quoteToken,
            tokenAddr: ctx.tokenAddr,
            sellingToken: ctx.sellingToken,
            exactInput: false,
          });
          if (!multiHopPath) throw new Error('Failed to build multi-hop path');
          quotedAmountIn = await getQuoteExactOutputMultiHop(publicClient, {
            ...multiHopPath,
            exactAmount: amountOut,
          });
        }

        // Check if approval is needed
        const approvalNeeded = await needsErc20Approval(
          ctx.tokenIn,
          quotedAmountIn,
        );

        // Slippage on input side: maxAmountIn = quotedAmountIn + slippage
        const maxAmountIn =
          quotedAmountIn + (quotedAmountIn * DEFAULT_SLIPPAGE_BPS) / 10000n;

        const balanceInFormatted = formatUnits(
          balanceIn,
          ctx.tokenInData.decimals,
        );
        const balanceOutFormatted = formatUnits(
          balanceOut,
          ctx.tokenOutData.decimals,
        );
        const quotedInFormatted = formatUnits(
          quotedAmountIn,
          ctx.tokenInData.decimals,
        );
        const maxInFormatted = formatUnits(
          maxAmountIn,
          ctx.tokenInData.decimals,
        );

        return {
          success: true,
          exactOutput: true,
          selling: `~${Number(quotedInFormatted).toFixed(6)} ${ctx.tokenInData.symbol}`,
          receiving: `${receiveAmount} ${ctx.tokenOutData.symbol}`,
          maximumSold: `${Number(maxInFormatted).toFixed(6)} ${ctx.tokenInData.symbol}`,
          slippage: '1%',
          route: ctx.isDirect
            ? `${ctx.tokenInData.symbol} -> ${ctx.tokenOutData.symbol}`
            : `${ctx.tokenInData.symbol} -> USDC -> ${ctx.tokenOutData.symbol}`,
          balanceBefore: {
            [ctx.tokenInData.symbol]:
              `${Number(balanceInFormatted).toFixed(6)}`,
            [ctx.tokenOutData.symbol]:
              `${Number(balanceOutFormatted).toFixed(6)}`,
          },
          balanceAfter: {
            [ctx.tokenInData.symbol]:
              `${Number(Number(balanceInFormatted) - Number(quotedInFormatted)).toFixed(6)}`,
            [ctx.tokenOutData.symbol]:
              `${Number(Number(balanceOutFormatted) + Number(receiveAmount)).toFixed(6)}`,
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
      quoteTokenSymbol: string = 'USDC',
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
          quoteTokenSymbol,
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

  const executeSwapExactInput = useCallback(
    async (
      tokenAddress: string,
      sellAmount: string,
      buyToken: 'token' | 'quote',
      quoteTokenSymbol: string = 'USDC',
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
          quoteTokenSymbol,
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

        // Get fresh quote for min amount — single-hop or multi-hop
        let quotedAmountOut: bigint;

        if (ctx.isDirect) {
          quotedAmountOut = await getQuoteExactInput(publicClient, {
            poolKey: ctx.poolKey,
            zeroForOne: ctx.zeroForOne,
            exactAmount: ctx.amountIn,
            hookData: '0x' as Hex,
          });
        } else {
          if (!ctx.multiHopPath)
            throw new Error('Failed to build multi-hop path');
          quotedAmountOut = await getQuoteExactInputMultiHop(publicClient, {
            ...ctx.multiHopPath,
            exactAmount: ctx.amountIn,
          });
        }

        const amountOutMin =
          quotedAmountOut - (quotedAmountOut * DEFAULT_SLIPPAGE_BPS) / 10000n;

        const deadline = BigInt(
          Math.floor(Date.now() / 1000) + DEFAULT_DEADLINE_MINUTES * 60,
        );

        // Execute swap — single-hop or multi-hop
        let receipt;

        if (ctx.isDirect) {
          receipt = await swapExactInSingle(
            ctx.poolKey,
            ctx.amountIn,
            amountOutMin,
            ctx.zeroForOne,
            deadline,
          );
        } else {
          receipt = await swapExactIn(
            ctx.poolKey,
            ctx.quoteToken,
            ctx.tokenAddr,
            ctx.amountIn,
            amountOutMin,
            ctx.sellingToken,
            deadline,
          );
        }

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
      swapExactIn,
      queryClient,
      resolveSwapContext,
    ],
  );

  const executeSwapExactOutput = useCallback(
    async (
      tokenAddress: string,
      receiveAmount: string,
      buyToken: 'token' | 'quote',
      quoteTokenSymbol: string = 'USDC',
    ) => {
      if (!publicClient || !walletClient || !userAddress) {
        return {
          error: 'Wallet not connected. Please connect your wallet first.',
        };
      }

      try {
        const ctx = await resolveSwapContext(
          tokenAddress,
          '1',
          buyToken,
          quoteTokenSymbol,
        );

        const amountOut = parseUnits(receiveAmount, ctx.tokenOutData.decimals);

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

        // Get fresh quote for max amount in
        let quotedAmountIn: bigint;

        if (ctx.isDirect) {
          quotedAmountIn = await getQuoteExactOutput(publicClient, {
            poolKey: ctx.poolKey,
            zeroForOne: ctx.zeroForOne,
            exactAmount: amountOut,
            hookData: '0x' as Hex,
          });
        } else {
          const multiHopPath = buildMultiHopPath({
            poolKey: ctx.poolKey,
            quoteToken: ctx.quoteToken,
            tokenAddr: ctx.tokenAddr,
            sellingToken: ctx.sellingToken,
            exactInput: false,
          });
          if (!multiHopPath) throw new Error('Failed to build multi-hop path');
          quotedAmountIn = await getQuoteExactOutputMultiHop(publicClient, {
            ...multiHopPath,
            exactAmount: amountOut,
          });
        }

        const maxAmountIn =
          quotedAmountIn + (quotedAmountIn * DEFAULT_SLIPPAGE_BPS) / 10000n;

        const deadline = BigInt(
          Math.floor(Date.now() / 1000) + DEFAULT_DEADLINE_MINUTES * 60,
        );

        // Execute swap — single-hop or multi-hop exact output
        let receipt;

        if (ctx.isDirect) {
          receipt = await swapExactOutSingle(
            ctx.poolKey,
            amountOut,
            maxAmountIn,
            ctx.zeroForOne,
            deadline,
          );
        } else {
          receipt = await swapExactOut(
            ctx.poolKey,
            ctx.quoteToken,
            ctx.tokenAddr,
            amountOut,
            maxAmountIn,
            ctx.sellingToken,
            deadline,
          );
        }

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
      swapExactOutSingle,
      swapExactOut,
      queryClient,
      resolveSwapContext,
    ],
  );

  // ── General swap tools (quote-to-quote) ─────────────────────────────────────

  const isNativeToken = (addr: Address) => addr.toLowerCase() === zeroAddress;

  /** Get balance for a quote token, handling native ETH */
  const getQuoteBalance = useCallback(
    async (addr: Address): Promise<bigint> => {
      if (!publicClient || !userAddress) return 0n;
      if (isNativeToken(addr)) {
        return publicClient.getBalance({address: userAddress});
      }
      return publicClient.readContract({
        address: addr,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [userAddress],
      });
    },
    [publicClient, userAddress],
  );

  /**
   * Build quoting/swap path for a general quote-to-quote swap.
   *
   * - If one side is USDC: single-hop through the other token's USDC pool.
   * - If neither is USDC: 2-hop through USDC (fromToken -> USDC -> toToken).
   *
   * Returns pool key + zeroForOne for single-hop, or path array for multi-hop.
   */
  const resolveGeneralSwapRoute = useCallback(
    (fromSymbol: string, toSymbol: string) => {
      const from = getQuoteTokenBySymbol(fromSymbol);
      const to = getQuoteTokenBySymbol(toSymbol);

      if (from.address.toLowerCase() === to.address.toLowerCase()) {
        throw new Error('Cannot swap a token for itself');
      }

      const fromIsUsdc = !from.intermediatePool;
      const toIsUsdc = !to.intermediatePool;

      if (fromIsUsdc) {
        // USDC -> otherToken: single-hop through otherToken's USDC pool
        const poolKey = buildQuotePoolKey(to);
        const zeroForOne =
          poolKey.currency0.toLowerCase() === USDC_ADDRESS.toLowerCase();
        return {
          type: 'single' as const,
          from,
          to,
          poolKey,
          zeroForOne,
        };
      }

      if (toIsUsdc) {
        // otherToken -> USDC: single-hop through fromToken's USDC pool
        const poolKey = buildQuotePoolKey(from);
        const zeroForOne =
          poolKey.currency0.toLowerCase() === from.address.toLowerCase();
        return {
          type: 'single' as const,
          from,
          to,
          poolKey,
          zeroForOne,
        };
      }

      // Neither is USDC: 2-hop fromToken -> USDC -> toToken
      const fromPool = from.intermediatePool!;
      const toPool = to.intermediatePool!;
      return {
        type: 'multi' as const,
        from,
        to,
        fromPool,
        toPool,
      };
    },
    [],
  );

  /** Build PathKey[] for multi-hop general swaps */
  const buildGeneralMultiHopPath = (
    from: QuoteToken,
    to: QuoteToken,
    exactInput: boolean,
  ): {currencyIn: Address; currencyOut: Address; path: PathKey[]} => {
    const fromPool = from.intermediatePool!;
    const toPool = to.intermediatePool!;

    const fromPoolKey = {
      fee: fromPool.fee,
      tickSpacing: fromPool.tickSpacing,
      hooks: fromPool.hooks,
      hookData: '0x' as Hex,
    };
    const toPoolKey = {
      fee: toPool.fee,
      tickSpacing: toPool.tickSpacing,
      hooks: toPool.hooks,
      hookData: '0x' as Hex,
    };

    if (exactInput) {
      // fromToken -> USDC -> toToken
      return {
        currencyIn: from.address,
        currencyOut: to.address,
        path: [
          {...fromPoolKey, intermediateCurrency: USDC_ADDRESS},
          {...toPoolKey, intermediateCurrency: to.address},
        ],
      };
    } else {
      // exactOutput: V4 quoter iterates path in REVERSE
      // Buy token is toToken. Reverse: path[1]+toToken → pool(toToken, USDC), path[0]+USDC → pool(USDC, fromToken)
      return {
        currencyIn: to.address,
        currencyOut: from.address,
        path: [
          {...fromPoolKey, intermediateCurrency: from.address},
          {...toPoolKey, intermediateCurrency: USDC_ADDRESS},
        ],
      };
    }
  };

  const previewGeneralSwap = useCallback(
    async (fromSymbol: string, toSymbol: string, sellAmount: string) => {
      if (!publicClient || !userAddress) {
        return {
          error: 'Wallet not connected. Please connect your wallet first.',
        };
      }
      try {
        const route = resolveGeneralSwapRoute(fromSymbol, toSymbol);
        const amountIn = parseUnits(sellAmount, route.from.decimals);

        const [balanceIn, balanceOut] = await Promise.all([
          getQuoteBalance(route.from.address),
          getQuoteBalance(route.to.address),
        ]);

        let quotedAmountOut: bigint;

        if (route.type === 'single') {
          quotedAmountOut = await getQuoteExactInput(publicClient, {
            poolKey: route.poolKey,
            zeroForOne: route.zeroForOne,
            exactAmount: amountIn,
            hookData: '0x' as Hex,
          });
        } else {
          const multiHop = buildGeneralMultiHopPath(route.from, route.to, true);
          quotedAmountOut = await getQuoteExactInputMultiHop(publicClient, {
            exactCurrency: multiHop.currencyIn,
            path: multiHop.path,
            exactAmount: amountIn,
          });
        }

        const approvalNeeded = isNativeToken(route.from.address)
          ? false
          : await needsErc20Approval(route.from.address, amountIn);

        const amountOutMin =
          quotedAmountOut - (quotedAmountOut * DEFAULT_SLIPPAGE_BPS) / 10000n;

        const balInFmt = formatUnits(balanceIn, route.from.decimals);
        const balOutFmt = formatUnits(balanceOut, route.to.decimals);
        const quotedOutFmt = formatUnits(quotedAmountOut, route.to.decimals);
        const minOutFmt = formatUnits(amountOutMin, route.to.decimals);

        return {
          success: true,
          selling: `${sellAmount} ${route.from.symbol}`,
          receiving: `~${Number(quotedOutFmt).toFixed(6)} ${route.to.symbol}`,
          minimumReceived: `${Number(minOutFmt).toFixed(6)} ${route.to.symbol}`,
          slippage: '1%',
          route:
            route.type === 'single'
              ? `${route.from.symbol} -> ${route.to.symbol}`
              : `${route.from.symbol} -> USDC -> ${route.to.symbol}`,
          balanceBefore: {
            [route.from.symbol]: `${Number(balInFmt).toFixed(6)}`,
            [route.to.symbol]: `${Number(balOutFmt).toFixed(6)}`,
          },
          balanceAfter: {
            [route.from.symbol]:
              `${Number(Number(balInFmt) - Number(sellAmount)).toFixed(6)}`,
            [route.to.symbol]:
              `${Number(Number(balOutFmt) + Number(quotedOutFmt)).toFixed(6)}`,
          },
          needsApproval: approvalNeeded,
          approvalToken: approvalNeeded ? route.from.symbol : null,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Preview failed';
        return {error: msg};
      }
    },
    [
      publicClient,
      userAddress,
      resolveGeneralSwapRoute,
      getQuoteBalance,
      needsErc20Approval,
    ],
  );

  const previewGeneralSwapExactOutput = useCallback(
    async (fromSymbol: string, toSymbol: string, receiveAmount: string) => {
      if (!publicClient || !userAddress) {
        return {
          error: 'Wallet not connected. Please connect your wallet first.',
        };
      }
      try {
        const route = resolveGeneralSwapRoute(fromSymbol, toSymbol);
        const amountOut = parseUnits(receiveAmount, route.to.decimals);

        const [balanceIn, balanceOut] = await Promise.all([
          getQuoteBalance(route.from.address),
          getQuoteBalance(route.to.address),
        ]);

        let quotedAmountIn: bigint;

        if (route.type === 'single') {
          quotedAmountIn = await getQuoteExactOutput(publicClient, {
            poolKey: route.poolKey,
            zeroForOne: route.zeroForOne,
            exactAmount: amountOut,
            hookData: '0x' as Hex,
          });
        } else {
          const multiHop = buildGeneralMultiHopPath(
            route.from,
            route.to,
            false,
          );
          quotedAmountIn = await getQuoteExactOutputMultiHop(publicClient, {
            exactCurrency: multiHop.currencyIn,
            path: multiHop.path,
            exactAmount: amountOut,
          });
        }

        const approvalNeeded = isNativeToken(route.from.address)
          ? false
          : await needsErc20Approval(route.from.address, quotedAmountIn);

        const maxAmountIn =
          quotedAmountIn + (quotedAmountIn * DEFAULT_SLIPPAGE_BPS) / 10000n;

        const balInFmt = formatUnits(balanceIn, route.from.decimals);
        const balOutFmt = formatUnits(balanceOut, route.to.decimals);
        const quotedInFmt = formatUnits(quotedAmountIn, route.from.decimals);
        const maxInFmt = formatUnits(maxAmountIn, route.from.decimals);

        return {
          success: true,
          exactOutput: true,
          selling: `~${Number(quotedInFmt).toFixed(6)} ${route.from.symbol}`,
          receiving: `${receiveAmount} ${route.to.symbol}`,
          maximumSold: `${Number(maxInFmt).toFixed(6)} ${route.from.symbol}`,
          slippage: '1%',
          route:
            route.type === 'single'
              ? `${route.from.symbol} -> ${route.to.symbol}`
              : `${route.from.symbol} -> USDC -> ${route.to.symbol}`,
          balanceBefore: {
            [route.from.symbol]: `${Number(balInFmt).toFixed(6)}`,
            [route.to.symbol]: `${Number(balOutFmt).toFixed(6)}`,
          },
          balanceAfter: {
            [route.from.symbol]:
              `${Number(Number(balInFmt) - Number(quotedInFmt)).toFixed(6)}`,
            [route.to.symbol]:
              `${Number(Number(balOutFmt) + Number(receiveAmount)).toFixed(6)}`,
          },
          needsApproval: approvalNeeded,
          approvalToken: approvalNeeded ? route.from.symbol : null,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Preview failed';
        return {error: msg};
      }
    },
    [
      publicClient,
      userAddress,
      resolveGeneralSwapRoute,
      getQuoteBalance,
      needsErc20Approval,
    ],
  );

  const approveGeneralSwap = useCallback(
    async (fromSymbol: string, sellAmount: string) => {
      if (!publicClient || !walletClient || !userAddress) {
        return {
          error: 'Wallet not connected. Please connect your wallet first.',
        };
      }
      try {
        const from = getQuoteTokenBySymbol(fromSymbol);
        if (isNativeToken(from.address)) {
          return {
            success: true,
            message: 'ETH does not need approval',
            alreadyApproved: true,
          };
        }

        const amountIn = parseUnits(sellAmount, from.decimals);
        const needs = await needsErc20Approval(from.address, amountIn);
        if (!needs) {
          return {
            success: true,
            message: `${from.symbol} already approved`,
            alreadyApproved: true,
          };
        }

        const approvalHash = await writeContractAsync({
          address: from.address,
          abi: erc20Abi,
          functionName: 'approve',
          args: [PERMIT2_ADDRESS, 2n ** 256n - 1n],
        });
        await publicClient.waitForTransactionReceipt({hash: approvalHash});

        return {
          success: true,
          message: `${from.symbol} approved for trading`,
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
      needsErc20Approval,
    ],
  );

  const executeGeneralSwap = useCallback(
    async (fromSymbol: string, toSymbol: string, sellAmount: string) => {
      if (!publicClient || !walletClient || !userAddress) {
        return {
          error: 'Wallet not connected. Please connect your wallet first.',
        };
      }
      try {
        const route = resolveGeneralSwapRoute(fromSymbol, toSymbol);
        const amountIn = parseUnits(sellAmount, route.from.decimals);

        const [balanceInBefore, balanceOutBefore] = await Promise.all([
          getQuoteBalance(route.from.address),
          getQuoteBalance(route.to.address),
        ]);

        // Fresh quote
        let quotedAmountOut: bigint;

        if (route.type === 'single') {
          quotedAmountOut = await getQuoteExactInput(publicClient, {
            poolKey: route.poolKey,
            zeroForOne: route.zeroForOne,
            exactAmount: amountIn,
            hookData: '0x' as Hex,
          });
        } else {
          const multiHop = buildGeneralMultiHopPath(route.from, route.to, true);
          quotedAmountOut = await getQuoteExactInputMultiHop(publicClient, {
            exactCurrency: multiHop.currencyIn,
            path: multiHop.path,
            exactAmount: amountIn,
          });
        }

        const amountOutMin =
          quotedAmountOut - (quotedAmountOut * DEFAULT_SLIPPAGE_BPS) / 10000n;
        const deadline = BigInt(
          Math.floor(Date.now() / 1000) + DEFAULT_DEADLINE_MINUTES * 60,
        );

        let receipt;

        if (route.type === 'single') {
          receipt = await swapExactInSingle(
            route.poolKey,
            amountIn,
            amountOutMin,
            route.zeroForOne,
            deadline,
          );
        } else {
          const multiHop = buildGeneralMultiHopPath(route.from, route.to, true);
          receipt = await swapExactInGeneric(
            multiHop.currencyIn,
            multiHop.path,
            amountIn,
            amountOutMin,
            deadline,
          );
        }

        if (receipt.status !== 'success') {
          return {error: 'Swap transaction reverted'};
        }

        const [balanceInAfter, balanceOutAfter] = await Promise.all([
          getQuoteBalance(route.from.address),
          getQuoteBalance(route.to.address),
        ]);

        await queryClient.invalidateQueries();

        return {
          success: true,
          txHash: receipt.transactionHash,
          sold: `${formatUnits(balanceInBefore - balanceInAfter, route.from.decimals)} ${route.from.symbol}`,
          received: `${formatUnits(balanceOutAfter - balanceOutBefore, route.to.decimals)} ${route.to.symbol}`,
          balanceBefore: {
            [route.from.symbol]: formatUnits(
              balanceInBefore,
              route.from.decimals,
            ),
            [route.to.symbol]: formatUnits(balanceOutBefore, route.to.decimals),
          },
          balanceAfter: {
            [route.from.symbol]: formatUnits(
              balanceInAfter,
              route.from.decimals,
            ),
            [route.to.symbol]: formatUnits(balanceOutAfter, route.to.decimals),
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
      swapExactInGeneric,
      queryClient,
      resolveGeneralSwapRoute,
      getQuoteBalance,
    ],
  );

  const executeGeneralSwapExactOutput = useCallback(
    async (fromSymbol: string, toSymbol: string, receiveAmount: string) => {
      if (!publicClient || !walletClient || !userAddress) {
        return {
          error: 'Wallet not connected. Please connect your wallet first.',
        };
      }
      try {
        const route = resolveGeneralSwapRoute(fromSymbol, toSymbol);
        const amountOut = parseUnits(receiveAmount, route.to.decimals);

        const [balanceInBefore, balanceOutBefore] = await Promise.all([
          getQuoteBalance(route.from.address),
          getQuoteBalance(route.to.address),
        ]);

        // Fresh quote
        let quotedAmountIn: bigint;

        if (route.type === 'single') {
          quotedAmountIn = await getQuoteExactOutput(publicClient, {
            poolKey: route.poolKey,
            zeroForOne: route.zeroForOne,
            exactAmount: amountOut,
            hookData: '0x' as Hex,
          });
        } else {
          const multiHop = buildGeneralMultiHopPath(
            route.from,
            route.to,
            false,
          );
          quotedAmountIn = await getQuoteExactOutputMultiHop(publicClient, {
            exactCurrency: multiHop.currencyIn,
            path: multiHop.path,
            exactAmount: amountOut,
          });
        }

        const maxAmountIn =
          quotedAmountIn + (quotedAmountIn * DEFAULT_SLIPPAGE_BPS) / 10000n;
        const deadline = BigInt(
          Math.floor(Date.now() / 1000) + DEFAULT_DEADLINE_MINUTES * 60,
        );

        let receipt;

        if (route.type === 'single') {
          receipt = await swapExactOutSingle(
            route.poolKey,
            amountOut,
            maxAmountIn,
            route.zeroForOne,
            deadline,
          );
        } else {
          const multiHop = buildGeneralMultiHopPath(
            route.from,
            route.to,
            false,
          );
          receipt = await swapExactOutGeneric(
            multiHop.currencyIn,
            multiHop.currencyOut,
            multiHop.path,
            amountOut,
            maxAmountIn,
            deadline,
          );
        }

        if (receipt.status !== 'success') {
          return {error: 'Swap transaction reverted'};
        }

        const [balanceInAfter, balanceOutAfter] = await Promise.all([
          getQuoteBalance(route.from.address),
          getQuoteBalance(route.to.address),
        ]);

        await queryClient.invalidateQueries();

        return {
          success: true,
          txHash: receipt.transactionHash,
          sold: `${formatUnits(balanceInBefore - balanceInAfter, route.from.decimals)} ${route.from.symbol}`,
          received: `${formatUnits(balanceOutAfter - balanceOutBefore, route.to.decimals)} ${route.to.symbol}`,
          balanceBefore: {
            [route.from.symbol]: formatUnits(
              balanceInBefore,
              route.from.decimals,
            ),
            [route.to.symbol]: formatUnits(balanceOutBefore, route.to.decimals),
          },
          balanceAfter: {
            [route.from.symbol]: formatUnits(
              balanceInAfter,
              route.from.decimals,
            ),
            [route.to.symbol]: formatUnits(balanceOutAfter, route.to.decimals),
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
      swapExactOutSingle,
      swapExactOutGeneric,
      queryClient,
      resolveGeneralSwapRoute,
      getQuoteBalance,
    ],
  );

  return {
    placeBid,
    claimTokens,
    getBalances,
    previewSwap,
    approveIfNeeded,
    executeSwapExactInput,
    previewSwapExactOutput,
    executeSwapExactOutput,
    previewGeneralSwap,
    approveGeneralSwap,
    executeGeneralSwap,
    previewGeneralSwapExactOutput,
    executeGeneralSwapExactOutput,
  };
}
