import type {Address, Hex} from 'viem';
import {useSimulateContract} from 'wagmi';
import {quoterAbi} from '~/abi/quoter';
import {PoolKey} from '~/lib/utils';

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
