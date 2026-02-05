'use client';

import {useQuery} from '@tanstack/react-query';
import {usePublicClient, useChainId, useConnection} from 'wagmi';
import {formatEther, namehash} from 'viem';
import {
  ensRegistrarControllerAbi,
  ENS_MIN_NAME_LENGTH,
  ENS_DEFAULT_DURATION,
} from '~/abi/ens-registrar';
import {getRegistrarAddress} from './utils';

const ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' as const;

const ensRegistryAbi = [
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [{name: 'node', type: 'bytes32'}],
    outputs: [{name: '', type: 'address'}],
  },
] as const;

export const useCheckEnsAvailability = (
  name: string,
  duration = ENS_DEFAULT_DURATION,
) => {
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const {address: userAddress} = useConnection();
  const registrarAddress = getRegistrarAddress(chainId);

  const enabled =
    !!publicClient &&
    !!registrarAddress &&
    !!name &&
    name.length >= ENS_MIN_NAME_LENGTH;

  const query = useQuery({
    queryKey: ['ens', 'availability', name, duration, chainId, userAddress],
    queryFn: async () => {
      const available = await publicClient!.readContract({
        address: registrarAddress,
        abi: ensRegistrarControllerAbi,
        functionName: 'available',
        args: [name],
      });

      let rentPrice: bigint | null = null;
      if (available) {
        const price = await publicClient!.readContract({
          address: registrarAddress,
          abi: ensRegistrarControllerAbi,
          functionName: 'rentPrice',
          args: [name, BigInt(duration)],
        });
        rentPrice = price.base + price.premium;
      }

      // If taken, check if the connected user owns it
      let isOwnedByUser = false;
      if (!available && userAddress) {
        try {
          const node = namehash(`${name}.eth`);
          const owner = await publicClient!.readContract({
            address: ENS_REGISTRY,
            abi: ensRegistryAbi,
            functionName: 'owner',
            args: [node],
          });
          isOwnedByUser = owner.toLowerCase() === userAddress.toLowerCase();
        } catch {
          // If ownership check fails, just treat as taken
        }
      }

      return {isAvailable: available, rentPrice, isOwnedByUser};
    },
    enabled,
  });

  const isAvailable = query.data?.isAvailable ?? null;
  const rentPrice = query.data?.rentPrice ?? null;
  const isOwnedByUser = query.data?.isOwnedByUser ?? false;

  return {
    isAvailable,
    isOwnedByUser,
    isCheckingAvailability: query.isLoading,
    rentPrice,
    rentPriceFormatted: rentPrice ? formatEther(rentPrice) : null,
    error: query.error,
    refetch: query.refetch,
  };
};
