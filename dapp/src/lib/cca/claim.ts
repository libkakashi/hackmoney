import {
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
  encodeFunctionData,
  getContract,
  multicall3Abi,
} from 'viem';
import {type Bid, getBid, getBids} from './bid';
import {ccaAbi} from '~/abi/cca';
import {getAuctionState} from './auction';
import {Q96} from './utils';

const MULTICALL3_ADDRESS =
  '0xcA11bde05977b3631167028862bE2a173976CA11' as const;

// =============================================================================
// TYPES
// =============================================================================

export interface ExitBidResult {
  /** Transaction hash */
  txHash: Hex;
  /** Tokens received */
  tokensFilled: bigint;
  /** Currency refunded (if outbid) */
  currencyRefunded: bigint;
}

export interface BidAllocation {
  bidId: bigint;
  tokensFilled: bigint;
  currencyRefunded: bigint;
}

export interface ClaimResult {
  /** Transaction hash */
  txHash: Hex;
  /** Tokens claimed */
  tokensClaimed: bigint;
}

export interface PostAuctionStatus {
  /** Whether the auction has ended */
  auctionEnded: boolean;
  /** Whether claims are enabled */
  claimsEnabled: boolean;
  /** Whether migration to V4 pool has occurred */
  migrated: boolean;
  /** Whether currency has been swept to strategy */
  currencySwept: boolean;
  /** Strategy/LBP contract address */
  strategyAddress: Address | null;
}

// =============================================================================
// CLAIM TOKENS
// =============================================================================

/**
 * Exit and claim multiple bids in a single transaction using Multicall3
 *
 * This batches all exitBid calls and claimTokensBatch into one transaction.
 * Much more gas efficient and better UX than multiple transactions.
 */
export async function exitAndClaimBatch(
  walletClient: WalletClient,
  publicClient: PublicClient,
  auctionAddress: Address,
  bidIds: bigint[],
  owner: Address,
): Promise<Hex> {
  if (bidIds.length === 0) {
    throw new Error('No bids to exit and claim');
  }

  // Verify auction state
  const state = await getAuctionState(auctionAddress, publicClient);
  if (state.status !== 'claimable') {
    throw new Error(
      `Cannot claim: auction status is '${state.status}'. Must be 'claimable'.`,
    );
  }
  // Check which bids need to be exited
  const bids = await getBids(auctionAddress, bidIds, publicClient);
  const bidsToExit = bids.filter(bid => bid.exitedBlock === 0n);

  // Build multicall: exit all unexited bids, then batch claim all
  const calls: Array<{target: Address; allowFailure: boolean; callData: Hex}> =
    [];

  // Add exitBid calls for bids that haven't been exited
  for (const bid of bidsToExit) {
    calls.push({
      target: auctionAddress,
      allowFailure: false,
      callData: encodeFunctionData({
        abi: ccaAbi,
        functionName: 'exitBid',
        args: [bid.id],
      }),
    });
  }

  // Add claimTokensBatch call for all bids
  calls.push({
    target: auctionAddress,
    allowFailure: false,
    callData: encodeFunctionData({
      abi: ccaAbi,
      functionName: 'claimTokensBatch',
      args: [owner, bidIds],
    }),
  });

  // Execute via Multicall3
  const data = encodeFunctionData({
    abi: multicall3Abi,
    functionName: 'aggregate3',
    args: [calls],
  });

  const hash = await walletClient.sendTransaction({
    to: MULTICALL3_ADDRESS,
    data,
    chain: walletClient.chain,
    account: walletClient.account!,
  });

  return hash;
}

// =============================================================================
// TOKEN ALLOCATION
// =============================================================================

const MPS_MAX = 10_000_000n; // 1e7 = 100% (milli-bips)

/**
 * Get token allocation for a single bid
 *
 * This replicates the contract's fill calculation logic to determine
 * how many tokens a bid will receive. For exited bids, returns the
 * stored tokensFilled value.
 */
export async function getBidAllocation(
  publicClient: PublicClient,
  auctionAddress: Address,
  bidId: bigint,
): Promise<BidAllocation> {
  const bid = await getBid(auctionAddress, bidId, publicClient);

  // If bid is already exited, return the stored value
  if (bid.exitedBlock > 0n) {
    return {
      bidId,
      tokensFilled: bid.tokensFilled,
      currencyRefunded: 0n, // Already refunded during exit
    };
  }

  // Calculate allocation from current auction state
  return calculateBidAllocationFromState(publicClient, auctionAddress, bid);
}

/**
 * Calculate token allocation from current auction state
 *
 * This replicates the contract's CheckpointAccountingLib.calculateFill logic
 * for bids that are above the clearing price.
 *
 * The formula from the contract is:
 *   tokensFilled = bid.amountQ96 * cumulativeMpsPerPriceDelta / ((Q96 << 96) * mpsRemaining)
 *   currencySpentQ96 = bid.amountQ96 * cumulativeMpsDelta / mpsRemaining (rounded up)
 */
async function calculateBidAllocationFromState(
  publicClient: PublicClient,
  auctionAddress: Address,
  bid: Bid,
): Promise<BidAllocation> {
  const auction = getContract({
    address: auctionAddress,
    abi: ccaAbi,
    client: publicClient,
  });

  const startBlockNum = BigInt(bid.startBlock);
  const [
    endBlock,
    lastCheckpointedBlock,
    latestCheckpointData,
    startCheckpoint,
    isGraduated,
    clearingPrice,
  ] = await Promise.all([
    auction.read.endBlock(),
    auction.read.lastCheckpointedBlock(),
    auction.read.latestCheckpoint(),
    auction.read.checkpoints([startBlockNum]),
    auction.read.isGraduated(),
    auction.read.clearingPrice(),
  ]);

  // If auction hasn't graduated, all bids get refunded
  if (!isGraduated) {
    return {
      bidId: bid.id,
      tokensFilled: 0n,
      currencyRefunded: bid.amountQ96 >> 96n,
    };
  }

  // If bid price is at or below clearing price, the bid was outbid
  if (bid.maxPrice <= clearingPrice) {
    return {
      bidId: bid.id,
      tokensFilled: 0n,
      currencyRefunded: bid.amountQ96 >> 96n,
    };
  }

  // Bid is above clearing price - calculate fill using accountFullyFilledCheckpoints formula
  // mpsRemainingInAuctionAfterSubmission = MPS_MAX - bid.startCumulativeMps
  const mpsRemaining = MPS_MAX - BigInt(bid.startCumulativeMps);

  if (mpsRemaining === 0n) {
    return {
      bidId: bid.id,
      tokensFilled: 0n,
      currencyRefunded: 0n,
    };
  }

  // Get final checkpoint values
  // If end block hasn't been checkpointed yet, we need to PROJECT what the final values will be
  let finalCumulativeMps: bigint;
  let finalCumulativeMpsPerPrice: bigint;

  if (lastCheckpointedBlock >= endBlock) {
    // End block has been checkpointed, get the actual final checkpoint
    const finalCheckpoint = await auction.read.checkpoints([endBlock]);
    finalCumulativeMps = BigInt(finalCheckpoint.cumulativeMps);
    finalCumulativeMpsPerPrice = finalCheckpoint.cumulativeMpsPerPrice;
  } else {
    // End block NOT checkpointed yet - project the final values
    // The auction will sell 100% of tokens (MPS_MAX) by end block
    // We need to estimate cumulativeMpsPerPrice at the end

    const latestCumulativeMps = BigInt(latestCheckpointData.cumulativeMps);
    const latestCumulativeMpsPerPrice =
      latestCheckpointData.cumulativeMpsPerPrice;

    // Remaining MPS to be sold from latest checkpoint to end
    const remainingMpsToSell = MPS_MAX - latestCumulativeMps;

    // The remaining tokens will be sold at the current clearing price
    // getMpsPerPrice formula: (mps << 192) / price
    const additionalMpsPerPrice = (remainingMpsToSell << 192n) / clearingPrice;

    finalCumulativeMps = MPS_MAX; // 100% will be sold by end
    finalCumulativeMpsPerPrice =
      latestCumulativeMpsPerPrice + additionalMpsPerPrice;
  }

  // Calculate deltas between final checkpoint and start checkpoint
  const cumulativeMpsPerPriceDelta =
    finalCumulativeMpsPerPrice - startCheckpoint.cumulativeMpsPerPrice;
  const cumulativeMpsDelta =
    finalCumulativeMps - BigInt(startCheckpoint.cumulativeMps);

  // tokensFilled = bid.amountQ96 * cumulativeMpsPerPriceDelta / ((Q96 << 96) * mpsRemaining)
  // Note: Q96 << 96 = 2^192
  const Q192 = Q96 << 96n;
  const tokensFilled =
    (bid.amountQ96 * cumulativeMpsPerPriceDelta) / (Q192 * mpsRemaining);

  // currencySpentQ96 = fullMulDivUp(bid.amountQ96, cumulativeMpsDelta, mpsRemaining)
  // Rounded up: (a * b + d - 1) / d
  const currencySpentQ96 =
    cumulativeMpsDelta > 0n
      ? (bid.amountQ96 * cumulativeMpsDelta + mpsRemaining - 1n) / mpsRemaining
      : 0n;

  // Currency refunded = (original amount - spent amount) >> 96 to convert from Q96 to regular
  const currencyRefunded =
    bid.amountQ96 > currencySpentQ96
      ? (bid.amountQ96 - currencySpentQ96) >> 96n
      : 0n;

  return {
    bidId: bid.id,
    tokensFilled,
    currencyRefunded,
  };
}

/**
 * Get token allocations for multiple bids
 */
export async function getBidAllocations(
  publicClient: PublicClient,
  auctionAddress: Address,
  bidIds: bigint[],
): Promise<BidAllocation[]> {
  const results = await Promise.all(
    bidIds.map(bidId => getBidAllocation(publicClient, auctionAddress, bidId)),
  );
  return results;
}

/**
 * Get total claimable tokens for a user's bids
 */
export async function getClaimableTokens(
  publicClient: PublicClient,
  auctionAddress: Address,
  bids: Bid[],
): Promise<bigint> {
  const allocations = await getBidAllocations(
    publicClient,
    auctionAddress,
    bids.map(b => b.id),
  );
  return allocations.reduce((sum, alloc) => sum + alloc.tokensFilled, 0n);
}
