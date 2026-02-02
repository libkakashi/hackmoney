'use client';

import type {Address} from 'viem';
import {usePublicClient, useConnection} from 'wagmi';
import {useQuery} from '@tanstack/react-query';
import {getAllAuctionBids} from '~/lib/cca/bid';

export const useAllAuctionBids = (
  auctionAddr: Address | undefined,
  startBlock: bigint | undefined,
) => {
  const publicClient = usePublicClient();
  const {address: userAddress} = useConnection();

  return useQuery({
    queryKey: ['auction-bids', auctionAddr],
    queryFn: async () => {
      if (!publicClient || !auctionAddr || startBlock === undefined) {
        throw new Error('Missing dependencies');
      }
      return getAllAuctionBids(auctionAddr, publicClient, startBlock);
    },
    enabled: !!publicClient && !!auctionAddr && startBlock !== undefined,
    staleTime: 30000,
    select: allBids => ({
      allBids,
      userBids: allBids.filter(
        bid =>
          userAddress && bid.owner.toLowerCase() === userAddress.toLowerCase(),
      ),
    }),
  });
};
