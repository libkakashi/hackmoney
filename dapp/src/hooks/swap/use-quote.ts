import {useMemo} from 'react';
import type {Address, Hex} from 'viem';
import {useSimulateContract} from 'wagmi';
import {quoterAbi} from '~/abi/quoter';
import {PoolKey} from '~/lib/utils';
import {type QuoteToken, USDC_ADDRESS, isDirectSwap} from '~/lib/pools';

const quoterAddr = '0x52f0e24d1c21c8a0cb1e5a5dd6198556bd9e1203' as const;

export type QuoteExactSingleParams = {
  poolKey: PoolKey;
  zeroForOne: boolean;
  exactAmount: bigint;
  hookData: Hex;
};

export type PathKey = {
  intermediateCurrency: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
  hookData: Hex;
};

export type QuoteExactParams = {
  exactCurrency: Address;
  path: PathKey[];
  exactAmount: bigint;
};

export type UseQuoteOptions = {
  enabled?: boolean;
};

type QuoteResult = {
  quotedAmount: bigint;
  gasEstimate: bigint;
};

const selectQuoteResult = (data: {
  result: readonly [bigint, bigint];
}): QuoteResult => ({
  quotedAmount: data.result[0],
  gasEstimate: data.result[1],
});

/**
 * Hook to get a quote for an exact input single-hop swap
 */
export const useQuoteExactInputSingle = (
  params: QuoteExactSingleParams | undefined,
  options: UseQuoteOptions = {},
) => {
  const {enabled = true} = options;

  return useSimulateContract({
    address: quoterAddr,
    abi: quoterAbi,
    functionName: 'quoteExactInputSingle',
    args: params ? [params] : undefined,
    query: {
      enabled: enabled && !!quoterAddr && !!params,
      select: selectQuoteResult,
    },
  });
};

/**
 * Hook to get a quote for an exact output single-hop swap
 */
export const useQuoteExactOutputSingle = (
  params: QuoteExactSingleParams | undefined,
  options: UseQuoteOptions = {},
) => {
  const {enabled = true} = options;

  return useSimulateContract({
    address: quoterAddr,
    abi: quoterAbi,
    functionName: 'quoteExactOutputSingle',
    args: params ? [params] : undefined,
    query: {
      enabled: enabled && !!quoterAddr && !!params,
      select: selectQuoteResult,
    },
  });
};

/**
 * Hook to get a quote for an exact input multi-hop swap
 */
export const useQuoteExactInput = (
  params: QuoteExactParams | undefined,
  options: UseQuoteOptions = {},
) => {
  const {enabled = true} = options;

  return useSimulateContract({
    address: quoterAddr,
    abi: quoterAbi,
    functionName: 'quoteExactInput',
    args: params ? [params] : undefined,
    query: {
      enabled: enabled && !!quoterAddr && !!params,
      select: selectQuoteResult,
    },
  });
};

/**
 * Hook to get a quote for an exact output multi-hop swap
 */
export const useQuoteExactOutput = (
  params: QuoteExactParams | undefined,
  options: UseQuoteOptions = {},
) => {
  const {enabled = true} = options;

  return useSimulateContract({
    address: quoterAddr,
    abi: quoterAbi,
    functionName: 'quoteExactOutput',
    args: params ? [params] : undefined,
    query: {
      enabled: enabled && !!quoterAddr && !!params,
      select: selectQuoteResult,
    },
  });
};

/**
 * Convenience hook for simple single-hop swaps
 * Automatically builds the params from common inputs
 */
export const useQuote = (
  poolKey: PoolKey | undefined,
  {
    exactAmount,
    zeroForOne,
    exactInput = true,
    hookData = '0x' as Hex,
    enabled = true,
  }: {
    exactAmount: bigint | undefined;
    zeroForOne: boolean;
    exactInput?: boolean;
    hookData?: Hex;
    enabled?: boolean;
  },
) => {
  const params =
    poolKey && exactAmount !== undefined
      ? {
          poolKey,
          zeroForOne,
          exactAmount,
          hookData,
        }
      : undefined;

  const isEnabled = enabled && !!quoterAddr && !!params;

  const inputResult = useSimulateContract({
    address: quoterAddr,
    abi: quoterAbi,
    functionName: 'quoteExactInputSingle',
    args: params ? [params] : undefined,
    query: {
      enabled: isEnabled && exactInput,
      select: selectQuoteResult,
    },
  });

  const outputResult = useSimulateContract({
    address: quoterAddr,
    abi: quoterAbi,
    functionName: 'quoteExactOutputSingle',
    args: params ? [params] : undefined,
    query: {
      enabled: isEnabled && !exactInput,
      select: selectQuoteResult,
    },
  });

  return exactInput ? inputResult : outputResult;
};

/**
 * Builds multi-hop quoter params for routing through USDC.
 *
 * The swap card has two sides: the launchpad token side and the quote token side.
 * The launchpad pool is always token/USDC. For non-USDC quote tokens, we add
 * a second hop through a USDC/quoteToken pool.
 *
 * quoteExactInput:  exactCurrency = token being sold.
 *   Path hops lead toward the token being bought.
 * quoteExactOutput: exactCurrency = token being bought.
 *   Path hops lead toward the token being sold.
 */
function buildMultiHopQuoteParams({
  poolKey,
  quoteToken,
  tokenAddr,
  exactAmount,
  sellingToken,
  exactInput,
}: {
  poolKey: PoolKey;
  quoteToken: QuoteToken;
  tokenAddr: Address;
  exactAmount: bigint;
  sellingToken: boolean;
  exactInput: boolean;
}): QuoteExactParams | undefined {
  if (!quoteToken.intermediatePool) return undefined;
  const ip = quoteToken.intermediatePool;

  // Hop descriptors (pool params only - intermediateCurrency set per-direction)
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
    // quoteExactInput: exactCurrency = sell token, path leads to buy token
    if (sellingToken) {
      // Selling launchpad token, buying quoteToken
      // token -[launchpad pool]-> USDC -[intermediate pool]-> quoteToken
      return {
        exactCurrency: tokenAddr,
        path: [
          {...launchpadPool, intermediateCurrency: USDC_ADDRESS},
          {...usdcQuotePool, intermediateCurrency: quoteToken.address},
        ],
        exactAmount,
      };
    } else {
      // Selling quoteToken, buying launchpad token
      // quoteToken -[intermediate pool]-> USDC -[launchpad pool]-> token
      return {
        exactCurrency: quoteToken.address,
        path: [
          {...usdcQuotePool, intermediateCurrency: USDC_ADDRESS},
          {...launchpadPool, intermediateCurrency: tokenAddr},
        ],
        exactAmount,
      };
    }
  } else {
    // quoteExactOutput: exactCurrency = buy token, path leads to sell token
    if (sellingToken) {
      // Selling launchpad token, buying exact quoteToken amount
      // quoteToken -[intermediate pool]-> USDC -[launchpad pool]-> token
      return {
        exactCurrency: quoteToken.address,
        path: [
          {...usdcQuotePool, intermediateCurrency: USDC_ADDRESS},
          {...launchpadPool, intermediateCurrency: tokenAddr},
        ],
        exactAmount,
      };
    } else {
      // Selling quoteToken, buying exact launchpad token amount
      // token -[launchpad pool]-> USDC -[intermediate pool]-> quoteToken
      return {
        exactCurrency: tokenAddr,
        path: [
          {...launchpadPool, intermediateCurrency: USDC_ADDRESS},
          {...usdcQuotePool, intermediateCurrency: quoteToken.address},
        ],
        exactAmount,
      };
    }
  }
}

/**
 * Multi-hop quote hook. For direct USDC swaps, falls back to single-hop.
 * For other quote tokens, builds a 2-hop path through USDC.
 *
 * @param sellingToken - true when the "sell" box contains the launchpad token
 * @param exactInput - true when user typed the sell amount, false for buy amount
 */
export const useMultiHopQuote = (
  poolKey: PoolKey | undefined,
  {
    quoteToken,
    tokenAddr,
    exactAmount,
    sellingToken,
    exactInput = true,
    enabled = true,
  }: {
    quoteToken: QuoteToken;
    tokenAddr: Address | undefined;
    exactAmount: bigint | undefined;
    sellingToken: boolean;
    exactInput?: boolean;
    enabled?: boolean;
  },
) => {
  const isDirect = isDirectSwap(quoteToken);

  // For direct USDC swaps, determine zeroForOne from the pool key
  const zeroForOne = useMemo(() => {
    if (!poolKey || !tokenAddr) return false;
    const tokenIsCurrency0 =
      poolKey.currency0.toLowerCase() === tokenAddr.toLowerCase();
    // selling token: swap from token side. zeroForOne = tokenIsCurrency0
    // buying token (selling USDC): swap from USDC side. zeroForOne = !tokenIsCurrency0
    return sellingToken ? tokenIsCurrency0 : !tokenIsCurrency0;
  }, [poolKey, tokenAddr, sellingToken]);

  // Single-hop params (for USDC direct)
  const singleParams = useMemo((): QuoteExactSingleParams | undefined => {
    if (!isDirect || !poolKey || exactAmount === undefined) return undefined;
    return {poolKey, zeroForOne, exactAmount, hookData: '0x' as Hex};
  }, [isDirect, poolKey, zeroForOne, exactAmount]);

  // Multi-hop params (for non-USDC tokens)
  const multiParams = useMemo((): QuoteExactParams | undefined => {
    if (isDirect || !poolKey || !tokenAddr || exactAmount === undefined)
      return undefined;
    return buildMultiHopQuoteParams({
      poolKey,
      quoteToken,
      tokenAddr,
      exactAmount,
      sellingToken,
      exactInput,
    });
  }, [
    isDirect,
    poolKey,
    tokenAddr,
    quoteToken,
    exactAmount,
    sellingToken,
    exactInput,
  ]);

  const isEnabled = enabled && exactAmount !== undefined && exactAmount > 0n;

  // Single-hop: exact input
  const singleInput = useSimulateContract({
    address: quoterAddr,
    abi: quoterAbi,
    functionName: 'quoteExactInputSingle',
    args: singleParams ? [singleParams] : undefined,
    query: {
      enabled: isEnabled && isDirect && exactInput && !!singleParams,
      select: selectQuoteResult,
    },
  });

  // Single-hop: exact output
  const singleOutput = useSimulateContract({
    address: quoterAddr,
    abi: quoterAbi,
    functionName: 'quoteExactOutputSingle',
    args: singleParams ? [singleParams] : undefined,
    query: {
      enabled: isEnabled && isDirect && !exactInput && !!singleParams,
      select: selectQuoteResult,
    },
  });

  // Multi-hop: exact input
  const multiInput = useSimulateContract({
    address: quoterAddr,
    abi: quoterAbi,
    functionName: 'quoteExactInput',
    args: multiParams ? [multiParams] : undefined,
    query: {
      enabled: isEnabled && !isDirect && exactInput && !!multiParams,
      select: selectQuoteResult,
    },
  });

  // Multi-hop: exact output
  const multiOutput = useSimulateContract({
    address: quoterAddr,
    abi: quoterAbi,
    functionName: 'quoteExactOutput',
    args: multiParams ? [multiParams] : undefined,
    query: {
      enabled: isEnabled && !isDirect && !exactInput && !!multiParams,
      select: selectQuoteResult,
    },
  });

  if (isDirect) {
    return exactInput ? singleInput : singleOutput;
  }
  return exactInput ? multiInput : multiOutput;
};
