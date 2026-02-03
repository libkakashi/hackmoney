'use client';

import type {Address} from 'viem';
import {useReadContract} from 'wagmi';
import type {PoolKey} from '~/lib/utils';
import {env} from '~/lib/env';
import {launchpadLensAbi} from '~/abi/launchpad-lens';

export interface StrategyState {
  poolKey: PoolKey;
  isMigrated: boolean;
  token: Address;
  currency: Address;
  migrationBlock: bigint;
  initializer: Address;
  poolManager: Address;
}

export const useStrategyState = (strategyAddr: Address | undefined) => {
  return useReadContract({
    address: env.launchpadLensAddr,
    abi: launchpadLensAbi,
    functionName: 'getStrategyState',
    args: strategyAddr ? [strategyAddr] : undefined,
    query: {
      enabled: !!strategyAddr,
      staleTime: 60000,
      refetchInterval: 30000,
    },
  });
};
