'use client';

import {useQuery} from '@tanstack/react-query';
import {usePublicClient, useChainId} from 'wagmi';
import {namehash} from 'viem/ens';

// ENS Registry — same on mainnet and most forks
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

/**
 * Parses the ensName from the token description metadata.
 * The description format is: "user description\n\n[twitter, discord, telegram, ensName]"
 */
export const parseEnsNameFromDescription = (
  description: string | undefined | null,
): string | null => {
  if (!description) return null;
  try {
    const lastNewlines = description.lastIndexOf('\n\n');
    if (lastNewlines === -1) return null;
    const jsonStr = description.slice(lastNewlines + 2);
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed) && parsed.length >= 4 && parsed[3]) {
      return parsed[3] as string;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Given a token's description (containing ensName in metadata) and creator address,
 * verifies that the creator owns the ENS name on-chain.
 *
 * Returns { ensName, isVerified } — ensName is parsed from metadata,
 * isVerified is true if the ENS name's owner matches the creator.
 */
export const useVerifiedEns = (
  description: string | undefined | null,
  creator: string | undefined | null,
) => {
  const publicClient = usePublicClient();
  const chainId = useChainId();

  const ensName = parseEnsNameFromDescription(description);

  const query = useQuery({
    queryKey: ['ens', 'verify', ensName, creator, chainId],
    queryFn: async () => {
      const node = namehash(`${ensName}.eth`);

      const owner = await publicClient!.readContract({
        address: ENS_REGISTRY,
        abi: ensRegistryAbi,
        functionName: 'owner',
        args: [node],
      });

      return {
        owner,
        isVerified: owner.toLowerCase() === (creator as string).toLowerCase(),
      };
    },
    enabled: !!publicClient && !!ensName && !!creator,
  });

  return {
    ensName,
    isVerified: query.data?.isVerified ?? false,
    isLoading: query.isLoading,
    error: query.error,
  };
};
