'use client';

import type {Address} from 'viem';
import {useQuery} from '@tanstack/react-query';
import {usePublicClient} from 'wagmi';
import type {PoolKey} from '~/lib/utils';
import {USDC_ADDRESS} from '~/lib/pools';
import {launchpadLensAbi} from '~/abi/launchpad-lens';
import {env} from '~/lib/env';
import {launchpadAbi} from '~/abi/launchpad';

const POOL_FEE = 10000;
const POOL_TICK_SPACING = 60;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;

export const usePoolKey = (tokenAddr: Address | undefined) => {
  const publicClient = usePublicClient();

  const result = useQuery({
    queryKey: ['poolKey', tokenAddr],
    enabled: !!tokenAddr && !!publicClient,
    queryFn: async () => {
      if (!tokenAddr || !publicClient) return undefined;

      // Read POOL_MANAGER from Launchpad contract
      const poolManager = await publicClient.readContract({
        address: env.launchpadAddr,
        abi: launchpadAbi,
        functionName: 'POOL_MANAGER',
      });

      // Get pool info from lens
      const poolInfo = await publicClient.readContract({
        address: env.launchpadLensAddr,
        abi: launchpadLensAbi,
        functionName: 'getPoolInfo',
        args: [
          poolManager,
          tokenAddr,
          USDC_ADDRESS,
          POOL_FEE,
          POOL_TICK_SPACING,
        ],
      });

      return {
        poolKey: {
          currency0: poolInfo.currency0,
          currency1: poolInfo.currency1,
          fee: poolInfo.fee,
          tickSpacing: poolInfo.tickSpacing,
          hooks: ZERO_ADDRESS,
        } as PoolKey,
        isMigrated: poolInfo.isInitialized,
        poolManager: poolManager as Address,
      };
    },
  });
  return result;
};
