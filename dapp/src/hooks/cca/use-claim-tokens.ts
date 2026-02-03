'use client';

import type {Address, Hex} from 'viem';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {usePublicClient, useWalletClient, useConnection} from 'wagmi';
import {exitAndClaimBatch} from '~/lib/cca/claim';
import {useUserBids} from './use-user-bids';

export const useClaimTokens = (auctionAddress: Address) => {
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();

  const {data: walletClient} = useWalletClient();
  const {address: userAddress} = useConnection();
  const {data: {bids} = {}} = useUserBids(auctionAddress);

  return useMutation({
    mutationFn: async (): Promise<Hex> => {
      if (!publicClient || !walletClient || !userAddress) {
        throw new Error('Wallet not connected');
      }
      if (!bids || bids.length === 0) {
        throw new Error('No bids to claim');
      }
      const bidIds = bids.map(b => b.id);

      return exitAndClaimBatch(
        walletClient,
        publicClient,
        auctionAddress,
        bidIds,
        userAddress,
      );
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });
};
