'use client';

import {useMutation, useQueryClient} from '@tanstack/react-query';
import {
  usePublicClient,
  useChainId,
  useConnection,
  useWriteContract,
} from 'wagmi';
import {
  ensRegistrarControllerAbi,
  ensReverseRegistrarAbi,
  ENS_DEFAULT_DURATION,
  ENS_MIN_COMMITMENT_AGE,
  ENS_REVERSE_REGISTRAR,
} from '~/abi/ens-registrar';
import {
  getRegistrarAddress,
  getResolverAddress,
  getStoredCommitment,
  clearStoredCommitment,
} from './utils';

/**
 * Imperative register mutation for ENS registration (step 2 of 2).
 * Requires a prior commitment from useCommitEns that has matured (~60s).
 * Reads the stored secret from localStorage, pays the rent price, and
 * registers the name with reverseRecord set.
 */
export const useRegisterEnsImperative = () => {
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const {address: ownerAddress} = useConnection();
  const {writeContractAsync} = useWriteContract();
  const queryClient = useQueryClient();

  const registrarAddress = getRegistrarAddress(chainId);
  const resolverAddress = getResolverAddress(chainId);
  const reverseRegistrar =
    ENS_REVERSE_REGISTRAR[chainId] ?? ENS_REVERSE_REGISTRAR[1];

  return useMutation({
    mutationFn: async (name: string) => {
      if (!publicClient || !ownerAddress) {
        throw new Error('Wallet not connected');
      }

      const stored = getStoredCommitment(name);
      if (!stored) {
        throw new Error(
          `No commitment found for ${name}.eth. You need to commit first.`,
        );
      }

      const elapsed = Math.floor(Date.now() / 1000) - stored.timestamp;
      if (elapsed < ENS_MIN_COMMITMENT_AGE) {
        throw new Error(
          `Commitment not ready yet. ${ENS_MIN_COMMITMENT_AGE - elapsed} seconds remaining.`,
        );
      }

      const price = await publicClient.readContract({
        address: registrarAddress,
        abi: ensRegistrarControllerAbi,
        functionName: 'rentPrice',
        args: [name, BigInt(ENS_DEFAULT_DURATION)],
      });
      // 10% buffer for price fluctuations
      const value = ((price.base + price.premium) * 110n) / 100n;

      const hash = await writeContractAsync({
        address: registrarAddress,
        abi: ensRegistrarControllerAbi,
        functionName: 'register',
        args: [
          {
            label: name,
            owner: ownerAddress,
            duration: BigInt(ENS_DEFAULT_DURATION),
            secret: stored.secret,
            resolver: resolverAddress,
            data: [] as `0x${string}`[],
            reverseRecord: 1 as const,
            referrer:
              '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
          },
        ],
        value,
      });

      await publicClient.waitForTransactionReceipt({hash});
      clearStoredCommitment(name);

      // Explicitly set as primary name via ReverseRegistrar.setName()
      // The register call's reverseRecord flag doesn't always work reliably
      const setPrimaryHash = await writeContractAsync({
        address: reverseRegistrar,
        abi: ensReverseRegistrarAbi,
        functionName: 'setName',
        args: [`${name}.eth`],
      });
      await publicClient.waitForTransactionReceipt({hash: setPrimaryHash});

      // Invalidate ENS reverse lookup cache
      await queryClient.invalidateQueries({queryKey: ['ens', 'reverse']});

      return {txHash: hash, name};
    },
  });
};
