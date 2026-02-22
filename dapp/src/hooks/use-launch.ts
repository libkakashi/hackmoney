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
}

export interface LaunchResult {
  token: Address;
  txHash: Hex;
}

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

      const simulateResult = await publicClient.simulateContract({
        address: env.launchpadAddr,
        abi: launchpadAbi,
        functionName: 'launch',
        args: [params.name, params.symbol],
        account: creator,
      });

      const token = simulateResult.result as Address;

      setIsSimulating(false);

      const txHashResult = await writeContract({
        address: env.launchpadAddr,
        abi: launchpadAbi,
        functionName: 'launch',
        args: [params.name, params.symbol],
      });

      setLaunchResult({
        token,
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
