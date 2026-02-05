'use client';

import {useCallback, useEffect, useState} from 'react';
import {useMutation} from '@tanstack/react-query';
import {
  usePublicClient,
  useChainId,
  useConnection,
  useWriteContract,
} from 'wagmi';
import {
  ensRegistrarControllerAbi,
  ENS_MIN_COMMITMENT_AGE,
  ENS_DEFAULT_DURATION,
} from '~/abi/ens-registrar';
import {
  type CommitmentData,
  getRegistrarAddress,
  getResolverAddress,
  generateSecret,
  getStoredCommitment,
  storeCommitment,
  clearStoredCommitment,
} from './utils';

export type RegistrationState =
  | 'idle'
  | 'committing'
  | 'waiting'
  | 'ready'
  | 'registering'
  | 'complete'
  | 'error';

export const useRegisterEns = (
  name: string,
  rentPrice: bigint | null,
  duration = ENS_DEFAULT_DURATION,
) => {
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const {address: ownerAddress} = useConnection();
  const {mutateAsync: writeContractAsync} = useWriteContract();

  const registrarAddress = getRegistrarAddress(chainId);
  const resolverAddress = getResolverAddress(chainId);

  const [registrationState, setRegistrationState] =
    useState<RegistrationState>('idle');
  const [commitmentData, setCommitmentData] = useState<CommitmentData | null>(
    null,
  );
  const [timeUntilReveal, setTimeUntilReveal] = useState(0);

  // Load stored commitment on mount / name change
  useEffect(() => {
    const stored = getStoredCommitment(name);
    if (stored) {
      setCommitmentData(stored);
      const elapsed = Math.floor(Date.now() / 1000) - stored.timestamp;
      if (elapsed >= ENS_MIN_COMMITMENT_AGE) {
        setRegistrationState('ready');
        setTimeUntilReveal(0);
      } else {
        setRegistrationState('waiting');
        setTimeUntilReveal(ENS_MIN_COMMITMENT_AGE - elapsed);
      }
    }
  }, [name]);

  // Countdown timer
  useEffect(() => {
    if (registrationState !== 'waiting' || timeUntilReveal <= 0) return;

    const interval = setInterval(() => {
      setTimeUntilReveal(prev => {
        if (prev <= 1) {
          setRegistrationState('ready');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [registrationState, timeUntilReveal]);

  // Commit mutation
  const commitMutation = useMutation({
    mutationFn: async () => {
      if (!publicClient || !ownerAddress) {
        throw new Error('Cannot commit: wallet not connected');
      }

      setRegistrationState('committing');

      const secret = generateSecret();

      const registration = {
        label: name,
        owner: ownerAddress,
        duration: BigInt(duration),
        secret,
        resolver: resolverAddress,
        data: [] as `0x${string}`[],
        reverseRecord: 1,
        referrer:
          '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
      };

      const commitmentHash = await publicClient.readContract({
        address: registrarAddress,
        abi: ensRegistrarControllerAbi,
        functionName: 'makeCommitment',
        args: [registration],
      });

      const hash = await writeContractAsync({
        address: registrarAddress,
        abi: ensRegistrarControllerAbi,
        functionName: 'commit',
        args: [commitmentHash],
      });

      await publicClient.waitForTransactionReceipt({hash});

      const timestamp = Math.floor(Date.now() / 1000);
      const data: CommitmentData = {
        name,
        secret,
        commitmentHash,
        timestamp,
        txHash: hash,
      };
      storeCommitment(data);
      setCommitmentData(data);
      setRegistrationState('waiting');
      setTimeUntilReveal(ENS_MIN_COMMITMENT_AGE);

      return data;
    },
    onError: () => {
      setRegistrationState('error');
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!publicClient || !ownerAddress || !commitmentData || !rentPrice) {
        throw new Error('Cannot register: missing requirements');
      }

      setRegistrationState('registering');

      // Add 10% buffer for price fluctuations
      const value = (rentPrice * 110n) / 100n;

      const hash = await writeContractAsync({
        address: registrarAddress,
        abi: ensRegistrarControllerAbi,
        functionName: 'register',
        args: [
          {
            label: name,
            owner: ownerAddress,
            duration: BigInt(duration),
            secret: commitmentData.secret,
            resolver: resolverAddress,
            data: [] as `0x${string}`[],
            reverseRecord: 1,
            referrer:
              '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
          },
        ],
        value,
      });

      await publicClient.waitForTransactionReceipt({hash});

      clearStoredCommitment(name);
      setRegistrationState('complete');

      return hash;
    },
    onError: () => {
      setRegistrationState('error');
    },
  });

  const reset = useCallback(() => {
    setRegistrationState('idle');
    setCommitmentData(null);
    setTimeUntilReveal(0);
    clearStoredCommitment(name);
    commitMutation.reset();
    registerMutation.reset();
  }, [name, commitMutation, registerMutation]);

  return {
    // Actions
    commit: () => commitMutation.mutateAsync(),
    register: () => registerMutation.mutateAsync(),
    reset,

    // State
    registrationState,
    commitmentData,
    timeUntilReveal,
    canReveal: registrationState === 'ready',

    // Transaction states
    isPending: commitMutation.isPending || registerMutation.isPending,
    isCommitting: commitMutation.isPending,
    isRegistering: registerMutation.isPending,

    // Error
    error: commitMutation.error ?? registerMutation.error,
  };
};
