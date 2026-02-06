'use client';

import {useMutation} from '@tanstack/react-query';
import {
  usePublicClient,
  useChainId,
  useConnection,
  useWriteContract,
} from 'wagmi';
import {
  ensRegistrarControllerAbi,
  ENS_DEFAULT_DURATION,
} from '~/abi/ens-registrar';
import {
  getRegistrarAddress,
  getResolverAddress,
  generateSecret,
  storeCommitment,
} from './utils';

/**
 * Imperative commit mutation for ENS registration (step 1 of 2).
 * Submits an on-chain commitment for a name. After ~60 seconds the
 * commitment matures and useRegisterEnsImperative can finalize registration.
 *
 * Stores the secret in localStorage so registerEnsName can retrieve it later.
 */
export const useCommitEns = () => {
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const {address: ownerAddress} = useConnection();
  const {writeContractAsync} = useWriteContract();

  const registrarAddress = getRegistrarAddress(chainId);
  const resolverAddress = getResolverAddress(chainId);

  return useMutation({
    mutationFn: async (name: string) => {
      if (!publicClient || !ownerAddress) {
        throw new Error('Wallet not connected');
      }

      const secret = generateSecret();

      const registration = {
        label: name,
        owner: ownerAddress,
        duration: BigInt(ENS_DEFAULT_DURATION),
        secret,
        resolver: resolverAddress,
        data: [] as `0x${string}`[],
        reverseRecord: 1 as const,
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
      storeCommitment({name, secret, commitmentHash, timestamp, txHash: hash});

      return {txHash: hash, name, timestamp};
    },
  });
};
