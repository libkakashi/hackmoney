'use client';

import {useMutation, useQueryClient} from '@tanstack/react-query';
import {usePublicClient, useWalletClient, useConnection} from 'wagmi';
import type {Address, Hex} from 'viem';
import {getAuctionState} from '~/lib/cca/auction';
import {getUserBids} from '~/lib/cca/bid';
import {exitAndClaimBatch} from '~/lib/cca/claim';

/**
 * Imperative claim hook — accepts auction address at call time.
 * Designed for agent use where the target auction isn't known at hook init.
 */
export const useClaimTokensImperative = () => {
  const publicClient = usePublicClient();
  const {data: walletClient} = useWalletClient();
  const {address: userAddress} = useConnection();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      auctionAddress: string,
    ): Promise<{txHash: Hex; bidsProcessed: number}> => {
      if (!publicClient || !walletClient || !userAddress) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }

      const auctionAddr = auctionAddress as Address;
      const auctionState = await getAuctionState(auctionAddr, publicClient);

      if (auctionState.status !== 'claimable') {
        throw new Error(
          `Cannot claim: auction is '${auctionState.status}', not 'claimable'.`,
        );
      }

      const bids = await getUserBids(
        auctionAddr,
        userAddress,
        publicClient,
        auctionState.startBlock,
      );

      if (bids.length === 0) {
        throw new Error('No bids found for this auction.');
      }

      const bidIds = bids.map(b => b.id);
      const hash = await exitAndClaimBatch(
        walletClient,
        publicClient,
        auctionAddr,
        bidIds,
        userAddress,
      );
      await publicClient.waitForTransactionReceipt({hash});

      return {txHash: hash, bidsProcessed: bids.length};
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });
};
