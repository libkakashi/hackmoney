import {useMemo} from 'react';
import type {Address, Hex, PublicClient} from 'viem';
import {usePublicClient} from 'wagmi';
import {useQuery} from '@tanstack/react-query';
import {quoterAbi} from '~/abi/quoter';
import {PoolKey} from '~/lib/utils';
import {type QuoteToken, USDC_ADDRESS, isDirectSwap} from '~/lib/pools';

export const quoterAddr = '0x52f0e24d1c21c8a0cb1e5a5dd6198556bd9e1203' as const;

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

// ── Imperative quote functions (for use outside React render) ────────────────

export async function getQuoteExactInput(
  publicClient: PublicClient,
  params: QuoteExactSingleParams,
): Promise<bigint> {
  const result = await publicClient.simulateContract({
    address: quoterAddr,
    abi: quoterAbi,
    functionName: 'quoteExactInputSingle',
    args: [params],
  });
  return result.result[0];
}

export async function getQuoteExactOutput(
  publicClient: PublicClient,
  params: QuoteExactSingleParams,
): Promise<bigint> {
  const result = await publicClient.simulateContract({
    address: quoterAddr,
    abi: quoterAbi,
    functionName: 'quoteExactOutputSingle',
    args: [params],
  });
  return result.result[0];
}

export async function getQuoteExactInputMultiHop(
  publicClient: PublicClient,
  params: QuoteExactParams,
): Promise<bigint> {
  const result = await publicClient.simulateContract({
    address: quoterAddr,
    abi: quoterAbi,
    functionName: 'quoteExactInput',
    args: [params],
  });
  return result.result[0];
}

export async function getQuoteExactOutputMultiHop(
  publicClient: PublicClient,
  params: QuoteExactParams,
): Promise<bigint> {
  const result = await publicClient.simulateContract({
    address: quoterAddr,
    abi: quoterAbi,
    functionName: 'quoteExactOutput',
    args: [params],
  });
  return result.result[0];
}

// ── Direct quote via simulateContract (bypasses wagmi useSimulateContract hook) ──

async function callQuoter(
  publicClient: PublicClient,
  functionName: 'quoteExactInputSingle' | 'quoteExactOutputSingle' | 'quoteExactInput' | 'quoteExactOutput',
  args: [QuoteExactSingleParams] | [QuoteExactParams],
): Promise<QuoteResult> {
  const result = await publicClient.simulateContract({
    address: quoterAddr,
    abi: quoterAbi,
    functionName,
    args,
  });

  const [quotedAmount, gasEstimate] = result.result as readonly [bigint, bigint];
  return {quotedAmount, gasEstimate};
}

// ── Multi-hop path building ─────────────────────────────────────────────────

/**
 * Build multi-hop path for quoting/swapping through USDC.
 *
 * For exactInput:  exactCurrency = sell token, path leads toward buy token.
 * For exactOutput: exactCurrency = buy token, path leads toward sell token (reversed).
 */
export function buildMultiHopPath({
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
}): {exactCurrency: Address; path: PathKey[]} | undefined {
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
        exactCurrency: tokenAddr,
        path: [
          {...launchpadPool, intermediateCurrency: USDC_ADDRESS},
          {...usdcQuotePool, intermediateCurrency: quoteToken.address},
        ],
      };
    } else {
      // quoteToken -> USDC -> token
      return {
        exactCurrency: quoteToken.address,
        path: [
          {...usdcQuotePool, intermediateCurrency: USDC_ADDRESS},
          {...launchpadPool, intermediateCurrency: tokenAddr},
        ],
      };
    }
  } else {
    // exactOutput: exactCurrency = buy token.
    // The V4 quoter iterates the path in REVERSE for exact output.
    if (sellingToken) {
      // Forward: token -[launchpad]-> USDC -[intermediate]-> quoteToken
      return {
        exactCurrency: quoteToken.address,
        path: [
          {...launchpadPool, intermediateCurrency: tokenAddr},
          {...usdcQuotePool, intermediateCurrency: USDC_ADDRESS},
        ],
      };
    } else {
      // Forward: quoteToken -[intermediate]-> USDC -[launchpad]-> token
      return {
        exactCurrency: tokenAddr,
        path: [
          {...usdcQuotePool, intermediateCurrency: quoteToken.address},
          {...launchpadPool, intermediateCurrency: USDC_ADDRESS},
        ],
      };
    }
  }
}

/**
 * Builds multi-hop quoter params (with exactAmount) for the useMultiHopQuote hook.
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
  const result = buildMultiHopPath({
    poolKey,
    quoteToken,
    tokenAddr,
    sellingToken,
    exactInput,
  });
  if (!result) return undefined;
  return {...result, exactAmount};
}

/**
 * Multi-hop quote hook using direct eth_call (bypasses wagmi useSimulateContract).
 * For direct USDC swaps, uses single-hop. For other quote tokens, builds a 2-hop path.
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
  const publicClient = usePublicClient();
  const isDirect = isDirectSwap(quoteToken);

  const zeroForOne = useMemo(() => {
    if (!poolKey || !tokenAddr) return false;
    const tokenIsCurrency0 =
      poolKey.currency0.toLowerCase() === tokenAddr.toLowerCase();
    return sellingToken ? tokenIsCurrency0 : !tokenIsCurrency0;
  }, [poolKey, tokenAddr, sellingToken]);

  const singleParams = useMemo((): QuoteExactSingleParams | undefined => {
    if (!isDirect || !poolKey || exactAmount === undefined) return undefined;
    return {poolKey, zeroForOne, exactAmount, hookData: '0x' as Hex};
  }, [isDirect, poolKey, zeroForOne, exactAmount]);

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

  const isEnabled =
    enabled &&
    !!publicClient &&
    exactAmount !== undefined &&
    exactAmount > 0n &&
    ((isDirect && !!singleParams) || (!isDirect && !!multiParams));

  const functionName = isDirect
    ? exactInput
      ? 'quoteExactInputSingle'
      : 'quoteExactOutputSingle'
    : exactInput
      ? 'quoteExactInput'
      : 'quoteExactOutput';

  const args = isDirect ? singleParams : multiParams;

  return useQuery<QuoteResult>({
    queryKey: [
      'quoter',
      functionName,
      isDirect
        ? singleParams
          ? JSON.stringify(singleParams, (_, v) =>
              typeof v === 'bigint' ? v.toString() : v,
            )
          : null
        : multiParams
          ? JSON.stringify(multiParams, (_, v) =>
              typeof v === 'bigint' ? v.toString() : v,
            )
          : null,
    ],
    queryFn: () =>
      callQuoter(
        publicClient!,
        functionName as Parameters<typeof callQuoter>[1],
        [args!] as Parameters<typeof callQuoter>[2],
      ),
    enabled: isEnabled,
    retry: false,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
};
