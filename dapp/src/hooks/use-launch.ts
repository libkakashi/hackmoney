'use client';

import {useCallback, useState} from 'react';
import {
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt,
  useConnection,
} from 'wagmi';
import type {Address, Hex} from 'viem';
import {env} from '~/lib/env';
import {
  fetchLaunchpadConfig,
  mineSaltAsync,
  type SaltMiningResult,
} from '~/lib/cca/salt';
import {launchpadAbi} from '~/abi/launchpad';

export interface LaunchParams {
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  websiteUrl?: string;
  twitterUrl?: string;
  discordUrl?: string;
  telegramUrl?: string;
  /** Optional scheduled start time. If provided, calculates the target block from avg block time */
  scheduledTime?: Date;
}

export interface LaunchResult {
  token: Address;
  strategy: Address;
  auction: Address;
  txHash: Hex;
}

export interface TokenMetadataInput {
  description?: string;
  image?: string;
  websiteUrl?: string | null;
  twitterUrl?: string | null;
  discordUrl?: string | null;
  telegramUrl?: string | null;
}

const encodeMetadata = (
  input: TokenMetadataInput,
): {
  description: string;
  website: string;
  image: string;
} => {
  const description =
    (input.description || '') +
    '\n\n' +
    JSON.stringify([input.twitterUrl, input.discordUrl, input.telegramUrl]);

  return {
    description: description,
    website: input.websiteUrl || '',
    image: input.image || '',
  };
};

const LAUNCH_WAIT_BLOCKS = 5n; // Small buffer for tx to land
const DEFAULT_BLOCK_RANGE = 100n; // Range to sample for avg block time calculation
const BLOCK_TIME_MS_FALLBACK = 12000; // 12 seconds fallback

export const useLaunch = () => {
  const publicClient = usePublicClient();
  const {address: creator} = useConnection();

  const [isMining, setIsMining] = useState(false);
  const [miningProgress, setMiningProgress] = useState<string | null>(null);
  const [saltResult, setSaltResult] = useState<SaltMiningResult | null>(null);
  const [launchResult, setLaunchResult] = useState<LaunchResult | null>(null);

  const {
    mutateAsync: writeContract,
    data: txHash,
    isPending: isWritePending,
    error: writeError,
    reset,
  } = useWriteContract();

  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const launch = useCallback(
    async (params: LaunchParams) => {
      if (!creator || !publicClient) {
        throw new Error('Wallet not connected');
      }

      try {
        setIsMining(true);
        setMiningProgress('Fetching launchpad configuration...');

        // Get current block
        const currentBlock = await publicClient.getBlockNumber();

        let startBlock: bigint;

        if (params.scheduledTime) {
          // Calculate target block from scheduled time using avg block time
          setMiningProgress('Calculating target block from scheduled time...');

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

          // Calculate how many blocks until the scheduled time
          const currentTimeMs = Number(currentBlockData.timestamp) * 1000;
          const scheduledTimeMs = params.scheduledTime.getTime();
          const timeDiffMs = scheduledTimeMs - currentTimeMs;
          const blocksUntilScheduled = Math.ceil(timeDiffMs / blockTimeMs);

          startBlock =
            currentBlock +
            BigInt(Math.max(blocksUntilScheduled, Number(LAUNCH_WAIT_BLOCKS)));
        } else {
          // Launch immediately with small buffer for tx confirmation
          startBlock = currentBlock + LAUNCH_WAIT_BLOCKS;
        }

        // Fetch launchpad config in a single RPC call (includes all addresses and strategy config)
        const config = await fetchLaunchpadConfig(
          publicClient,
          env.launchpadAddr,
          startBlock,
        );

        setMiningProgress('Mining valid salt for hook address...');

        // Mine salt (off-chain, very fast)
        const result = await mineSaltAsync(
          {
            caller: creator,
            name: params.name,
            symbol: params.symbol,
            launchpadAddress: env.launchpadAddr,
            startBlock,
          },
          config,
          1_000_000, // max iterations
          iteration => {
            setMiningProgress(
              `Mining... ${iteration.toLocaleString()} iterations`,
            );
          },
        );
        console.log(result);
        setSaltResult(result);

        setMiningProgress(
          `Found valid salt in ${result.iterations.toLocaleString()} iterations`,
        );

        // Build token params
        const tokenParams = {
          name: params.name,
          symbol: params.symbol,
          metadata: encodeMetadata({
            description: params.description,
            image: params.image,
            websiteUrl: params.websiteUrl,
            twitterUrl: params.twitterUrl,
            discordUrl: params.discordUrl,
            telegramUrl: params.telegramUrl,
          }),
        };
        console.log(tokenParams);

        setMiningProgress('Simulating launch transaction...');

        // Simulate the transaction first to get the return values
        const simulateResult = await publicClient.simulateContract({
          address: env.launchpadAddr,
          abi: launchpadAbi,
          functionName: 'launch',
          args: [tokenParams, startBlock, result.salt],
          account: creator,
        });
        console.log('Simulation successful:', simulateResult.result);

        // Extract addresses from simulation result [token, strategy, auction]
        const [token, strategy, auction] = simulateResult.result as [
          Address,
          Address,
          Address,
        ];

        setMiningProgress('Submitting launch transaction...');
        setIsMining(false);

        // Submit the launch transaction
        const txHashResult = await writeContract({
          address: env.launchpadAddr,
          abi: launchpadAbi,
          functionName: 'launch',
          args: [tokenParams, startBlock, result.salt],
        });
        console.log('Write contract result:', txHashResult);

        // Set launch result from simulation
        setLaunchResult({
          token,
          strategy,
          auction,
          txHash: txHashResult,
        });
      } catch (error) {
        setIsMining(false);
        setMiningProgress(null);
        throw error;
      }
    },
    [creator, publicClient, writeContract],
  );

  return {
    launch,
    txHash,
    receipt,
    launchResult,
    saltResult,
    isPending: isWritePending,
    isMining,
    miningProgress,
    isConfirming,
    isConfirmed,
    error: writeError || receiptError,
    reset: () => {
      reset();
      setSaltResult(null);
      setMiningProgress(null);
      setLaunchResult(null);
    },
  };
};
