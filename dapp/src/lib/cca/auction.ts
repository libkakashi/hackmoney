import {
  type Address,
  type PublicClient,
  getContract,
  erc20Abi,
  zeroAddress,
} from 'viem';
import {priceQ96ToUsd} from './utils';
import {ccaAbi} from '~/abi/cca';

const getTotalBidAmount = async (
  publicClient: PublicClient,
  auctionAddr: Address,
  currency: Address,
): Promise<bigint> => {
  if (currency === zeroAddress) {
    return publicClient.getBalance({address: auctionAddr});
  }
  const currencyContract = getContract({
    address: currency,
    abi: erc20Abi,
    client: publicClient,
  });
  return currencyContract.read.balanceOf([auctionAddr]);
};

const getTokenDecimals = async (
  publicClient: PublicClient,
  tokenAddress: Address,
): Promise<number> => {
  if (tokenAddress === zeroAddress) {
    return 18;
  }
  const token = getContract({
    address: tokenAddress,
    abi: erc20Abi,
    client: publicClient,
  });
  return token.read.decimals();
};

export type AuctionState = Awaited<ReturnType<typeof getAuctionState>>;

export const getAuctionState = async (
  auctionAddr: Address,
  publicClient: PublicClient,
) => {
  const auction = getContract({
    address: auctionAddr,
    abi: ccaAbi,
    client: publicClient,
  });

  const [
    clearingPriceQ96,
    currencyRaised,
    totalCleared,
    startBlock,
    endBlock,
    claimBlock,
    floorPriceQ96,
    tickSpacingQ96,
    token,
    currency,
    totalSupply,
  ] = await Promise.all([
    auction.read.clearingPrice(),
    auction.read.currencyRaised(),
    auction.read.totalCleared(),
    auction.read.startBlock(),
    auction.read.endBlock(),
    auction.read.claimBlock(),
    auction.read.floorPrice(),
    auction.read.tickSpacing(),
    auction.read.token(),
    auction.read.currency(),
    auction.read.totalSupply(),
  ]);

  const [currentBlock, totalBidAmount, tokenDecimals, currencyDecimals] =
    await Promise.all([
      publicClient.getBlockNumber(),
      getTotalBidAmount(publicClient, auctionAddr, currency),
      getTokenDecimals(publicClient, token),
      getTokenDecimals(publicClient, currency),
    ]);

  let status;

  if (currentBlock < startBlock) status = 'not_started' as const;
  else if (currentBlock < endBlock) status = 'active' as const;
  else if (currentBlock < claimBlock) status = 'ended' as const;
  else status = 'claimable' as const;

  let progress = 0;

  if (status === 'active') {
    const totalBlocks = endBlock - startBlock;
    const elapsedBlocks = currentBlock - startBlock;
    progress = Number((elapsedBlocks * 100n) / totalBlocks);
  } else if (status === 'ended' || status === 'claimable') {
    progress = 100;
  }

  return {
    clearingPriceQ96,
    clearingPriceUsd: priceQ96ToUsd(
      clearingPriceQ96,
      currencyDecimals,
      tokenDecimals,
    ),
    currencyRaised,
    totalBidAmount,
    totalCleared,
    startBlock,
    endBlock,
    claimBlock,
    floorPriceQ96,
    tickSpacingQ96,
    token,
    currency,
    totalSupply,
    status,
    progress,
  };
};
