'use client';

import {useState} from 'react';
import {useMutation} from '@tanstack/react-query';
import {usePublicClient, useConnection} from 'wagmi';
import {env} from '~/lib/env';
import {
  fetchLaunchpadConfig,
  mineSaltAsync,
  type SaltMiningResult,
} from '~/lib/cca/salt';

const LAUNCH_WAIT_BLOCKS = 5n;
const DEFAULT_BLOCK_RANGE = 100n;
const BLOCK_TIME_MS_FALLBACK = 12000;

export interface MineSaltParams {
  name: string;
  symbol: string;
  scheduledTime?: Date;
}

export const useMineSalt = () => {
  const publicClient = usePublicClient();
  const {address: creator} = useConnection();

  const [progress, setProgress] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (
      params: MineSaltParams,
    ): Promise<SaltMiningResult & {startBlock: bigint}> => {
      if (!creator || !publicClient) {
        throw new Error('Wallet not connected');
      }

      setProgress('Fetching launchpad configuration...');

      const currentBlock = await publicClient.getBlockNumber();

      let startBlock: bigint;

      if (params.scheduledTime) {
        setProgress('Calculating target block from scheduled time...');

        const referenceBlock = currentBlock - DEFAULT_BLOCK_RANGE;
        const [currentBlockData, referenceBlockData] = await Promise.all([
          publicClient.getBlock({blockNumber: currentBlock}),
          publicClient.getBlock({blockNumber: referenceBlock}),
        ]);

        const blocksDiff = Number(currentBlock - referenceBlock);
        const timeDiffSeconds = Number(
          currentBlockData.timestamp - referenceBlockData.timestamp,
        );
        const blockTimeMs =
          blocksDiff > 0
            ? (timeDiffSeconds / blocksDiff) * 1000
            : BLOCK_TIME_MS_FALLBACK;

        const currentTimeMs = Number(currentBlockData.timestamp) * 1000;
        const scheduledTimeMs = params.scheduledTime.getTime();
        const timeDiffMs = scheduledTimeMs - currentTimeMs;
        const blocksUntilScheduled = Math.ceil(timeDiffMs / blockTimeMs);

        startBlock =
          currentBlock +
          BigInt(Math.max(blocksUntilScheduled, Number(LAUNCH_WAIT_BLOCKS)));
      } else {
        startBlock = currentBlock + LAUNCH_WAIT_BLOCKS;
      }

      const config = await fetchLaunchpadConfig(
        publicClient,
        env.launchpadAddr,
        startBlock,
      );

      setProgress('Mining valid salt for hook address...');

      const result = await mineSaltAsync(
        {
          caller: creator,
          name: params.name,
          symbol: params.symbol,
          launchpadAddress: env.launchpadAddr,
          startBlock,
        },
        config,
        1_000_000,
        iteration => {
          setProgress(`Mining... ${iteration.toLocaleString()} iterations`);
        },
      );

      setProgress(
        `Found valid salt in ${result.iterations.toLocaleString()} iterations`,
      );

      return {...result, startBlock};
    },
    onSettled: () => {
      setProgress(null);
    },
  });

  return {
    mineSalt: mutation.mutateAsync,
    saltResult: mutation.data ?? null,
    isMining: mutation.isPending,
    miningProgress: progress,
    error: mutation.error,
    reset: mutation.reset,
  };
};
