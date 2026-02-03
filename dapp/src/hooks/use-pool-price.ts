'use client';

import type {Address} from 'viem';
import {useReadContract} from 'wagmi';
import {env} from '~/lib/env';
import {launchpadLensAbi} from '~/abi/launchpad-lens';
import {usePoolKey} from './swap/use-pool-key';

export interface PoolPrice {
  tick: number;
  sqrtPriceX96: bigint;
  priceE18: bigint;
}

export const usePoolPrice = (tokenAddr: Address | undefined) => {
  const {data: {poolKey, poolManager, isMigrated} = {}} = usePoolKey(tokenAddr);

  return useReadContract({
    address: env.launchpadLensAddr,
    abi: launchpadLensAbi,
    functionName: 'getPoolPrice',
    args: poolManager && poolKey ? [poolManager, poolKey] : undefined,
    query: {
      enabled: !!poolManager && !!poolKey && !!isMigrated,
      staleTime: 10000,
      refetchInterval: 15000,
    },
  });
};
