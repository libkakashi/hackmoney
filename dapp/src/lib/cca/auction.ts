import {type Address, type PublicClient, getContract} from 'viem';
import {priceQ96ToUsd} from './utils';
import {launchpadLensAbi} from '~/abi/launchpad-lens';
import {env} from '~/lib/env';

const STATUS_MAP = {
  0: 'not_started',
  1: 'active',
  2: 'ended',
  3: 'claimable',
} as const;

export type AuctionStatus = (typeof STATUS_MAP)[keyof typeof STATUS_MAP];

export interface AuctionState {
  clearingPriceQ96: bigint;
  clearingPriceUsd: number;
  currencyRaised: bigint;
  totalBidAmount: bigint;
  totalCleared: bigint;
  startBlock: bigint;
  endBlock: bigint;
  claimBlock: bigint;
  floorPriceQ96: bigint;
  tickSpacingQ96: bigint;
  token: Address;
  currency: Address;
  totalSupply: bigint;
  tokenDecimals: number;
  currencyDecimals: number;
  status: AuctionStatus;
  progress: number;
}

export const getAuctionState = async (
  auctionAddr: Address,
  publicClient: PublicClient,
): Promise<AuctionState> => {
  const lens = getContract({
    address: env.launchpadLensAddr,
    abi: launchpadLensAbi,
    client: publicClient,
  });

  const state = await lens.read.getAuctionState([auctionAddr]);

  const tokenDecimals = state.tokenDecimals;
  const currencyDecimals = state.currencyDecimals;

  return {
    clearingPriceQ96: state.clearingPriceQ96,
    clearingPriceUsd: priceQ96ToUsd(
      state.clearingPriceQ96,
      currencyDecimals,
      tokenDecimals,
    ),
    currencyRaised: state.currencyRaised,
    totalBidAmount: state.totalBidAmount,
    totalCleared: state.totalCleared,
    startBlock: BigInt(state.startBlock),
    endBlock: BigInt(state.endBlock),
    claimBlock: BigInt(state.claimBlock),
    floorPriceQ96: state.floorPriceQ96,
    tickSpacingQ96: state.tickSpacingQ96,
    token: state.token,
    currency: state.currency,
    totalSupply: BigInt(state.totalSupply),
    tokenDecimals,
    currencyDecimals,
    status:
      STATUS_MAP[state.status as keyof typeof STATUS_MAP] ?? 'not_started',
    progress: state.progress,
  };
};
