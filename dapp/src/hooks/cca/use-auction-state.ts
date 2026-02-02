import type {Address} from 'viem';
import {usePublicClient} from 'wagmi';
import {useQuery} from '@tanstack/react-query';
import {getAuctionState} from '~/lib/cca/auction';

export const useAuctionState = (auctionAddr?: Address) => {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ['cca-auction', 'state', auctionAddr],
    queryFn: async () => {
      if (!publicClient || !auctionAddr) return;
      return getAuctionState(auctionAddr, publicClient);
    },
    enabled: !!publicClient && !!auctionAddr,
    refetchInterval: 12000,
    staleTime: 6000,
  });
};
