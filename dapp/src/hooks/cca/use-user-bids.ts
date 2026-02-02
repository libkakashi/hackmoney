'use client';

import type {Address} from 'viem';
import {usePublicClient, useConnection} from 'wagmi';
import {useQuery} from '@tanstack/react-query';
import {getClaimableTokens} from '~/lib/cca/claim';
import {getUserBids} from '~/lib/cca/bid';
import {useAuctionState} from './use-auction-state';

export const useUserBids = (auctionAddr: Address) => {
  const publicClient = usePublicClient();
  const {address: userAddr} = useConnection();
  const {data: {startBlock} = {}} = useAuctionState(auctionAddr);

  return useQuery({
    queryKey: ['cca-auction', 'user-bids', auctionAddr || '-', userAddr || '-'],
    queryFn: async () => {
      if (!publicClient || !userAddr || startBlock === undefined) {
        throw new Error('Missing dependencies');
      }
      const bids = await getUserBids(
        auctionAddr,
        userAddr,
        publicClient,
        startBlock,
      );

      // Calculate total claimable tokens across all bids
      const totalClaimable = await getClaimableTokens(
        publicClient,
        auctionAddr,
        bids,
      );

      return {totalClaimable, bids};
    },
    enabled: !!publicClient && !!userAddr && startBlock !== undefined,
    staleTime: 30000,
  });
};
