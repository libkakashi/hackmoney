'use client';

import {useCallback} from 'react';
import {
  type Address,
  type Hex,
  parseUnits,
  formatUnits,
  erc20Abi,
  namehash,
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
import {launchpadLensAbi} from '~/abi/launchpad-lens';
import {quoterAbi} from '~/abi/quoter';
import {env} from '~/lib/env';
import {
  QUOTE_TOKENS,
  USDC_ADDRESS,
  isDirectSwap,
  type QuoteToken,
} from '~/lib/pools';
import type {PathKey} from '~/hooks/swap/use-quote';
// CCA hooks (imperative versions for agent)
import {useSubmitBidImperative} from '~/hooks/cca/use-submit-bid-imperative';
import {useClaimTokensImperative} from '~/hooks/cca/use-claim-tokens-imperative';
// ENS hooks
import {useCommitEns} from '~/hooks/ens/use-commit-ens';
import {useRegisterEnsImperative} from '~/hooks/ens/use-register-ens-imperative';
import {useSetPrimaryEns} from '~/hooks/ens/use-set-primary-ens';
import {
  ensRegistrarControllerAbi,
  ENS_DEFAULT_DURATION,
  ENS_MIN_NAME_LENGTH,
} from '~/abi/ens-registrar';
import {getRegistrarAddress} from '~/hooks/ens/utils';

const QUOTER_ADDRESS = '0x52f0e24d1c21c8a0cb1e5a5dd6198556bd9e1203' as const;
const DEFAULT_SLIPPAGE_BPS = 100n; // 1%
const DEFAULT_DEADLINE_MINUTES = 20;

/** Look up a QuoteToken by symbol */
const getQuoteTokenBySymbol = (symbol: string): QuoteToken => {
  const qt = QUOTE_TOKENS.find(
    t => t.symbol.toLowerCase() === symbol.toLowerCase(),
  );
  if (!qt) throw new Error(`Unknown quote token: ${symbol}`);
  return qt;
};

/**
 * Build multi-hop path for quoting/swapping through USDC.
 *
 * For exactInput:  exactCurrency = sell token, path leads toward buy token.
 * For exactOutput: exactCurrency = buy token, path leads toward sell token (reversed).
 */
function buildMultiHopPath({
  poolKey,
  quoteToken,
  tokenAddr,
  sellingToken,
  exactInput = true,
}: {
  poolKey: {fee: number; tickSpacing: number; hooks: Address};
  quoteToken: QuoteToken;
  tokenAddr: Address;
  sellingToken: boolean;
  exactInput?: boolean;
}): {currencyIn: Address; path: PathKey[]} | undefined {
  if (!quoteToken.intermediatePool) return undefined;
  const ip = quoteToken.intermediatePool;

  const launchpadPool = {
    fee: poolKey.fee,
    tickSpacing: poolKey.tickSpacing,
    hooks: poolKey.hooks,
    hookData: '0x' as Hex,
  };
  const usdcQuotePool = {
    fee: ip.fee,
    tickSpacing: ip.tickSpacing,
    hooks: ip.hooks,
    hookData: '0x' as Hex,
  };

  if (exactInput) {
    if (sellingToken) {
      // token -> USDC -> quoteToken
      return {
        currencyIn: tokenAddr,
        path: [
          {...launchpadPool, intermediateCurrency: USDC_ADDRESS},
          {...usdcQuotePool, intermediateCurrency: quoteToken.address},
        ],
      };
    } else {
      // quoteToken -> USDC -> token
      return {
        currencyIn: quoteToken.address,
        path: [
          {...usdcQuotePool, intermediateCurrency: USDC_ADDRESS},
          {...launchpadPool, intermediateCurrency: tokenAddr},
        ],
      };
    }
  } else {
    // exactOutput: exactCurrency = buy token.
    // The V4 quoter iterates the path array in REVERSE for exact output.
    // At each reverse step it pairs the current outputCurrency with
    // pathKey.intermediateCurrency to form the pool, then sets
    // outputCurrency = pathKey.intermediateCurrency for the next hop.
    //
    // So the path keeps the same pool order as exact input, but each
    // hop's intermediateCurrency points backward (to the previous
    // currency in the forward direction) instead of forward.
    if (sellingToken) {
      // Forward: token -[launchpad]-> USDC -[intermediate]-> quoteToken
      // exactCurrency = quoteToken (buy token)
      // Reverse iteration:
      //   path[1] + quoteToken → pool(quoteToken, USDC) via usdcQuotePool ✓
      //   path[0] + USDC       → pool(USDC, token)      via launchpadPool ✓
      return {
        currencyIn: quoteToken.address,
        path: [
          {...launchpadPool, intermediateCurrency: tokenAddr},
          {...usdcQuotePool, intermediateCurrency: USDC_ADDRESS},
        ],
      };
    } else {
      // Forward: quoteToken -[intermediate]-> USDC -[launchpad]-> token
      // exactCurrency = tokenAddr (buy token)
      // Reverse iteration:
      //   path[1] + token → pool(token, USDC)      via launchpadPool ✓
      //   path[0] + USDC  → pool(USDC, quoteToken) via usdcQuotePool ✓
      return {
        currencyIn: tokenAddr,
        path: [
          {...usdcQuotePool, intermediateCurrency: quoteToken.address},
          {...launchpadPool, intermediateCurrency: USDC_ADDRESS},
        ],
      };
    }
  }
}

export function useAgentTools() {
  const publicClient = usePublicClient();
  const {data: walletClient} = useWalletClient();
  const {address: userAddress} = useConnection();
  const {mutateAsync: writeContractAsync} = useWriteContract();
  const queryClient = useQueryClient();
  const {needsErc20Approval} = usePermit2();
  const {swapExactInSingle, swapExactIn, swapExactOutSingle, swapExactOut} =
    useSwap();

  // CCA hooks (imperative)
  const submitBidMutation = useSubmitBidImperative();
  const claimTokensMutation = useClaimTokensImperative();

  // ENS hooks
  const commitEnsMutation = useCommitEns();
  const registerEnsMutation = useRegisterEnsImperative();
  const setPrimaryEnsMutation = useSetPrimaryEns();

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
          quotedAmountOut = quoteResult.result[0];
        } else {
          if (!ctx.multiHopPath)
            throw new Error('Failed to build multi-hop path');
          const quoteResult = await publicClient.simulateContract({
            address: QUOTER_ADDRESS,
            abi: quoterAbi,
            functionName: 'quoteExactInput',
            args: [
              {
                exactCurrency: ctx.multiHopPath.currencyIn,
                path: ctx.multiHopPath.path,
                exactAmount: ctx.amountIn,
              },
            ],
          });
          quotedAmountOut = quoteResult.result[0];
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
          const quoteResult = await publicClient.simulateContract({
            address: QUOTER_ADDRESS,
            abi: quoterAbi,
            functionName: 'quoteExactOutputSingle',
            args: [
              {
                poolKey: ctx.poolKey,
                zeroForOne: ctx.zeroForOne,
                exactAmount: amountOut,
                hookData: '0x' as Hex,
              },
            ],
          });
          quotedAmountIn = quoteResult.result[0];
        } else {
          const multiHopPath = buildMultiHopPath({
            poolKey: ctx.poolKey,
            quoteToken: ctx.quoteToken,
            tokenAddr: ctx.tokenAddr,
            sellingToken: ctx.sellingToken,
            exactInput: false,
          });
          if (!multiHopPath) throw new Error('Failed to build multi-hop path');
          const quoteResult = await publicClient.simulateContract({
            address: QUOTER_ADDRESS,
            abi: quoterAbi,
            functionName: 'quoteExactOutput',
            args: [
              {
                exactCurrency: multiHopPath.currencyIn,
                path: multiHopPath.path,
                exactAmount: amountOut,
              },
            ],
          });
          quotedAmountIn = quoteResult.result[0];
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
          quotedAmountOut = quoteResult.result[0];
        } else {
          if (!ctx.multiHopPath)
            throw new Error('Failed to build multi-hop path');
          const quoteResult = await publicClient.simulateContract({
            address: QUOTER_ADDRESS,
            abi: quoterAbi,
            functionName: 'quoteExactInput',
            args: [
              {
                exactCurrency: ctx.multiHopPath.currencyIn,
                path: ctx.multiHopPath.path,
                exactAmount: ctx.amountIn,
              },
            ],
          });
          quotedAmountOut = quoteResult.result[0];
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
          const quoteResult = await publicClient.simulateContract({
            address: QUOTER_ADDRESS,
            abi: quoterAbi,
            functionName: 'quoteExactOutputSingle',
            args: [
              {
                poolKey: ctx.poolKey,
                zeroForOne: ctx.zeroForOne,
                exactAmount: amountOut,
                hookData: '0x' as Hex,
              },
            ],
          });
          quotedAmountIn = quoteResult.result[0];
        } else {
          const multiHopPath = buildMultiHopPath({
            poolKey: ctx.poolKey,
            quoteToken: ctx.quoteToken,
            tokenAddr: ctx.tokenAddr,
            sellingToken: ctx.sellingToken,
            exactInput: false,
          });
          if (!multiHopPath) throw new Error('Failed to build multi-hop path');
          const quoteResult = await publicClient.simulateContract({
            address: QUOTER_ADDRESS,
            abi: quoterAbi,
            functionName: 'quoteExactOutput',
            args: [
              {
                exactCurrency: multiHopPath.currencyIn,
                path: multiHopPath.path,
                exactAmount: amountOut,
              },
            ],
          });
          quotedAmountIn = quoteResult.result[0];
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

  // ── ENS tools ──────────────────────────────────────────────────────────────

  const ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' as const;
  const ensRegistryResolverAbi = [
    {
      name: 'resolver',
      type: 'function',
      stateMutability: 'view',
      inputs: [{name: 'node', type: 'bytes32'}],
      outputs: [{name: '', type: 'address'}],
    },
  ] as const;
  const reverseResolverNameAbi = [
    {
      name: 'name',
      type: 'function',
      stateMutability: 'view',
      inputs: [{name: 'node', type: 'bytes32'}],
      outputs: [{name: '', type: 'string'}],
    },
  ] as const;

  const getMyEnsName = useCallback(async () => {
    if (!publicClient || !userAddress) {
      return {error: 'Wallet not connected.'};
    }
    try {
      const addr = userAddress.toLowerCase().slice(2);
      const reverseNode = namehash(`${addr}.addr.reverse`);
      const resolver = await publicClient.readContract({
        address: ENS_REGISTRY,
        abi: ensRegistryResolverAbi,
        functionName: 'resolver',
        args: [reverseNode],
      });
      if (
        !resolver ||
        resolver === '0x0000000000000000000000000000000000000000'
      ) {
        return {
          success: true,
          address: userAddress,
          ensName: null,
          message: 'No primary ENS name set for this address.',
        };
      }
      const name = await publicClient.readContract({
        address: resolver,
        abi: reverseResolverNameAbi,
        functionName: 'name',
        args: [reverseNode],
      });
      return {
        success: true,
        address: userAddress,
        ensName: name || null,
        message: name
          ? `Your primary ENS name is ${name}`
          : 'No primary ENS name set for this address.',
      };
    } catch (err: unknown) {
      return {
        error:
          err instanceof Error ? err.message : 'Failed to look up ENS name',
      };
    }
  }, [publicClient, userAddress]);

  const checkEnsName = useCallback(
    async (name: string) => {
      if (!publicClient || !userAddress)
        return {error: 'Wallet not connected.'};
      try {
        if (name.length < ENS_MIN_NAME_LENGTH)
          return {
            error: `Name must be at least ${ENS_MIN_NAME_LENGTH} characters.`,
          };

        const registrar = getRegistrarAddress(publicClient.chain?.id ?? 1);
        const available = await publicClient.readContract({
          address: registrar,
          abi: ensRegistrarControllerAbi,
          functionName: 'available',
          args: [name],
        });

        let rentPrice: string | null = null;
        if (available) {
          const price = await publicClient.readContract({
            address: registrar,
            abi: ensRegistrarControllerAbi,
            functionName: 'rentPrice',
            args: [name, BigInt(ENS_DEFAULT_DURATION)],
          });
          rentPrice = formatUnits(price.base + price.premium, 18);
        }

        let isOwnedByUser = false;
        if (!available) {
          try {
            const ownerAbi = [
              {
                name: 'owner',
                type: 'function',
                stateMutability: 'view',
                inputs: [{name: 'node', type: 'bytes32'}],
                outputs: [{name: '', type: 'address'}],
              },
            ] as const;
            const ownerAddr = await publicClient.readContract({
              address: ENS_REGISTRY,
              abi: ownerAbi,
              functionName: 'owner',
              args: [namehash(`${name}.eth`)],
            });
            isOwnedByUser =
              ownerAddr.toLowerCase() === userAddress.toLowerCase();
          } catch {
            /* ignore */
          }
        }

        return {
          success: true,
          name: `${name}.eth`,
          isAvailable: available,
          isOwnedByUser,
          rentPriceEth: rentPrice,
          message: available
            ? `${name}.eth is available! (~${Number(rentPrice).toFixed(4)} ETH/year)`
            : isOwnedByUser
              ? `${name}.eth is already registered by you.`
              : `${name}.eth is taken by someone else.`,
        };
      } catch (err: unknown) {
        return {error: err instanceof Error ? err.message : 'Check failed'};
      }
    },
    [publicClient, userAddress],
  );

  const commitEnsName = useCallback(
    async (name: string) => {
      try {
        const result = await commitEnsMutation.mutateAsync(name);
        return {
          success: true,
          txHash: result.txHash,
          name: `${name}.eth`,
          message: `Commitment submitted for ${name}.eth! You must wait ~60 seconds before registering. Tell me when you're ready, or just wait a minute and ask me to register it.`,
        };
      } catch (err: unknown) {
        return {error: err instanceof Error ? err.message : 'Commit failed'};
      }
    },
    [commitEnsMutation],
  );

  const registerEnsName = useCallback(
    async (name: string) => {
      try {
        const result = await registerEnsMutation.mutateAsync(name);
        return {
          success: true,
          txHash: result.txHash,
          name: `${name}.eth`,
          message: `${name}.eth is now registered and set as your primary name!`,
        };
      } catch (err: unknown) {
        return {
          error: err instanceof Error ? err.message : 'Registration failed',
        };
      }
    },
    [registerEnsMutation],
  );

  const setPrimaryEnsName = useCallback(
    async (name: string) => {
      try {
        const hash = await setPrimaryEnsMutation.mutateAsync(name);
        const fullName = name.endsWith('.eth') ? name : `${name}.eth`;
        return {
          success: true,
          txHash: hash,
          name: fullName,
          message: `Primary name updated to ${fullName}!`,
        };
      } catch (err: unknown) {
        return {
          error:
            err instanceof Error ? err.message : 'Failed to set primary name',
        };
      }
    },
    [setPrimaryEnsMutation],
  );

  return {
    placeBid,
    claimTokens,
    getBalances,
    previewSwap,
    approveIfNeeded,
    executeSwapExactInput,
    getMyEnsName,
    checkEnsName,
    commitEnsName,
    registerEnsName,
    setPrimaryEnsName,
    previewSwapExactOutput,
    executeSwapExactOutput,
  };
}
