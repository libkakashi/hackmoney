'use client';

import {useState} from 'react';
import {
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt,
  useConnection,
} from 'wagmi';
import type {Address, Hex} from 'viem';
import {env} from '~/lib/env';
import {launchpadAbi} from '~/abi/launchpad';

export interface LaunchParams {
  name: string;
  symbol: string;
  salt: Hex;
  startBlock: bigint;
  description?: string;
  image?: string;
  websiteUrl?: string;
  twitterUrl?: string;
  discordUrl?: string;
  telegramUrl?: string;
}

export interface LaunchResult {
  token: Address;
  strategy: Address;
  auction: Address;
  txHash: Hex;
}

interface TokenMetadataInput {
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
    JSON.stringify([
      input.twitterUrl,
      input.discordUrl,
      input.telegramUrl,
    ]);

  return {
    description: description,
    website: input.websiteUrl || '',
    image: input.image || '',
  };
};

export const useLaunch = () => {
  const publicClient = usePublicClient();
  const {address: creator} = useConnection();

  const [launchResult, setLaunchResult] = useState<LaunchResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

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

  const launch = async (params: LaunchParams) => {
    if (!creator || !publicClient) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsSimulating(true);

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

      // Simulate to get return values
      const simulateResult = await publicClient.simulateContract({
        address: env.launchpadAddr,
        abi: launchpadAbi,
        functionName: 'launch',
        args: [tokenParams, params.startBlock, params.salt],
        account: creator,
      });

      const [token, strategy, auction] = simulateResult.result as [
        Address,
        Address,
        Address,
      ];

      setIsSimulating(false);

      // Submit the launch transaction
      const txHashResult = await writeContract({
        address: env.launchpadAddr,
        abi: launchpadAbi,
        functionName: 'launch',
        args: [tokenParams, params.startBlock, params.salt],
      });

      setLaunchResult({
        token,
        strategy,
        auction,
        txHash: txHashResult,
      });
    } catch (error) {
      setIsSimulating(false);
      throw error;
    }
  };

  return {
    launch,
    txHash,
    receipt,
    launchResult,
    isPending: isWritePending || isSimulating,
    isConfirming,
    isConfirmed,
    error: writeError || receiptError,
    reset: () => {
      reset();
      setLaunchResult(null);
    },
  };
};
