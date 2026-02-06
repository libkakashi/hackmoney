'use client';

import {useQuery} from '@tanstack/react-query';
import {usePublicClient} from 'wagmi';
import {type Address, namehash} from 'viem';

const ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' as const;

const ensRegistryAbi = [
  {
    name: 'resolver',
    type: 'function',
    stateMutability: 'view',
    inputs: [{name: 'node', type: 'bytes32'}],
    outputs: [{name: '', type: 'address'}],
  },
] as const;

const reverseResolverAbi = [
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [{name: 'node', type: 'bytes32'}],
    outputs: [{name: '', type: 'string'}],
  },
] as const;

/**
 * Reverse-resolves an Ethereum address to its primary ENS name.
 *
 * Reads directly from the ENS reverse registrar on-chain rather than using
 * viem's getEnsName (which relies on the UniversalResolver that may not exist
 * on a mainnet fork).
 *
 * Steps:
 * 1. Compute the reverse node: namehash("<addr>.addr.reverse")
 * 2. Look up the resolver for that node in the ENS Registry
 * 3. Call name() on the resolver to get the primary name
 */
export const useEnsReverseName = (
  address: Address | string | undefined | null,
) => {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ['ens', 'reverse', address?.toLowerCase()],
    queryFn: async () => {
      const addr = (address as string).toLowerCase().slice(2); // strip 0x
      const reverseNode = namehash(`${addr}.addr.reverse`);

      // Get the resolver for the reverse node
      const resolver = await publicClient!.readContract({
        address: ENS_REGISTRY,
        abi: ensRegistryAbi,
        functionName: 'resolver',
        args: [reverseNode],
      });

      if (
        !resolver ||
        resolver === '0x0000000000000000000000000000000000000000'
      ) {
        return null;
      }

      // Call name() on the resolver
      const name = await publicClient!.readContract({
        address: resolver,
        abi: reverseResolverAbi,
        functionName: 'name',
        args: [reverseNode],
      });

      return name || null;
    },
    enabled: !!publicClient && !!address,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
