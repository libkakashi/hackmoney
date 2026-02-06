'use client';

import {useMutation} from '@tanstack/react-query';
import {usePublicClient, useChainId, useWriteContract} from 'wagmi';
import {
  ensReverseRegistrarAbi,
  ENS_REVERSE_REGISTRAR,
} from '~/abi/ens-registrar';

/**
 * Calls ReverseRegistrar.setName(name) to change the caller's primary ENS name.
 * The caller must already own the name — this just updates which name the
 * address resolves to.
 */
export const useSetPrimaryEns = () => {
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const {writeContractAsync} = useWriteContract();

  const reverseRegistrar =
    ENS_REVERSE_REGISTRAR[chainId] ?? ENS_REVERSE_REGISTRAR[1];

  return useMutation({
    mutationFn: async (name: string) => {
      if (!publicClient) throw new Error('No public client');

      // setName expects the full name including .eth
      const fullName = name.endsWith('.eth') ? name : `${name}.eth`;

      const hash = await writeContractAsync({
        address: reverseRegistrar,
        abi: ensReverseRegistrarAbi,
        functionName: 'setName',
        args: [fullName],
      });

      await publicClient.waitForTransactionReceipt({hash});
      return hash;
    },
  });
};
