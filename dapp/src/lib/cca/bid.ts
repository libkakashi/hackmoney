import {type Address, type PublicClient, getContract} from 'viem';
import {ccaAbi} from '~/abi/cca';

export interface Bid {
  id: bigint;
  maxPrice: bigint;
  amountQ96: bigint;
  owner: Address;
  startBlock: bigint;
  exitedBlock: bigint;
  tokensFilled: bigint;
  claimable: bigint;
  exited: boolean;
}

export const getAllAuctionBids = async (
  auctionAddr: Address,
  publicClient: PublicClient,
  startBlock: bigint,
): Promise<Bid[]> => {
  // Get all BidSubmitted events (no owner filter)
  const logs = await publicClient.getLogs({
    address: auctionAddr,
    event: {
      type: 'event',
      name: 'BidSubmitted',
      inputs: [
        {name: 'id', type: 'uint256', indexed: true},
        {name: 'owner', type: 'address', indexed: true},
        {name: 'price', type: 'uint256', indexed: false},
        {name: 'amount', type: 'uint128', indexed: false},
      ],
    },
    fromBlock: startBlock,
    toBlock: 'latest',
  });

  if (logs.length === 0) return [];

  // Fetch current state of each bid
  const bidIds = logs.map(log => log.args.id!);
  const bids = await getBids(auctionAddr, bidIds, publicClient);

  // Sort by amount descending (largest bids first)
  return bids.sort((a, b) => (b.amountQ96 > a.amountQ96 ? 1 : -1));
};

export const getBid = async (
  auctionAddr: Address,
  bidId: bigint,
  publicClient: PublicClient,
): Promise<Bid> => {
  const auction = getContract({
    address: auctionAddr,
    abi: ccaAbi,
    client: publicClient,
  });

  const bid = await auction.read.bids([bidId]);

  return {
    id: bidId,
    maxPrice: bid.maxPrice,
    amountQ96: bid.amountQ96,
    owner: bid.owner,
    startBlock: bid.startBlock,
    exitedBlock: bid.exitedBlock,
    tokensFilled: bid.tokensFilled,
    claimable: bid.exitedBlock > 0n ? bid.tokensFilled : 0n,
    exited: bid.exitedBlock > 0n,
  };
};

export const getBids = async (
  auctionAddr: Address,
  bidIds: bigint[],
  publicClient: PublicClient,
): Promise<Bid[]> => {
  if (bidIds.length === 0) return [];

  const bids = await Promise.all(
    bidIds.map(bidId => getBid(auctionAddr, bidId, publicClient)),
  );
  return bids;
};
