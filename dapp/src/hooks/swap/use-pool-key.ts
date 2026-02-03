'use client';

import type {Address} from 'viem';
import type {PoolKey} from '~/lib/utils';
import {useTokenByAddress} from '../use-tokens';
import {useStrategyState} from '../cca/use-strategy-state';

export const usePoolKey = (tokenAddr: Address | undefined) => {
  const {data: token} = useTokenByAddress(tokenAddr);
  const result = useStrategyState(token?.strategy);

  const data = result.data
    ? {
        poolKey: {
          currency0: result.data.currency0,
          currency1: result.data.currency1,
          fee: result.data.fee,
          tickSpacing: result.data.tickSpacing,
          hooks: result.data.hooks,
        } as PoolKey,
        isMigrated: result.data.isMigrated,
        poolManager: result.data.poolManager,
      }
    : undefined;

  return {...result, data};
};
