'use client';

import {useState} from 'react';
import {formatUnits, type Address} from 'viem';
import {useConnection} from 'wagmi';
import {Button} from '~/components/ui/button';
import {useAllAuctionBids} from '~/hooks/cca/use-all-auction-bids';
import {useAuctionState} from '~/hooks/cca/use-auction-state';
import {useTokenData} from '~/hooks/tokens/use-token-data';
import {useBlockTime} from '~/hooks/use-block-time';
import type {AuctionState} from '~/lib/cca/auction';
import {Q96, type Bid} from '~/lib/cca';

const formatTimestamp = (blocksAgo: bigint, blockTimeMs: number): string => {
  const secondsAgo = Number(blocksAgo) * (blockTimeMs / 1000);
  const timestamp = new Date(Date.now() - secondsAgo * 1000);

  return timestamp.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatAmount = (amount: bigint, decimals = 6): string => {
  const num = Number(formatUnits(amount, decimals));
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
  return num.toFixed(2);
};

const BidRow = ({
  bid,
  auctionState,
  currentBlock,
  blockTimeMs,
  isUserBid,
}: {
  bid: Bid;
  auctionState: AuctionState;
  currentBlock?: bigint;
  blockTimeMs: number;
  isUserBid?: boolean;
}) => {
  const bidAmt = bid.amountQ96 / Q96;
  const isExited = bid.exitedBlock > 0n;
  const blocksAgo = currentBlock ? currentBlock - bid.startBlock : 0n;

  const {data: {symbol: currencySymbol} = {}} = useTokenData(
    auctionState.currency,
  );

  return (
    <div
      className={`p-3 border ${isUserBid ? 'border-green/30 bg-green/5' : 'border-border'} text-xs flex items-center justify-between gap-3`}
    >
      <span className="text-dim">bid #{bid.id.toString()}</span>
      <span className="font-medium">
        {formatAmount(bidAmt)} {currencySymbol}
      </span>
      <span className="text-green flex-1">
        [
        {isUserBid
          ? 'you'
          : `${bid.owner.slice(0, 6)}...${bid.owner.slice(-4)}`}
        ]
      </span>

      <span className="text-dim">
        {currentBlock
          ? formatTimestamp(blocksAgo, blockTimeMs)
          : `block ${bid.startBlock.toString()}`}
      </span>

      <span className={`${isExited ? 'text-dim' : 'text-green'}`}>
        {isExited ? 'exited' : 'active'}
      </span>
    </div>
  );
};

export const BidsSection = ({auctionAddr}: {auctionAddr: Address}) => {
  const {isConnected, address: userAddress} = useConnection();

  const {data: auctionState} = useAuctionState(auctionAddr);
  const {data: blockTimeData} = useBlockTime(auctionState?.startBlock);
  const {
    data: {allBids, userBids} = {},
    isLoading,
    refetch,
  } = useAllAuctionBids(auctionAddr, auctionState?.startBlock);

  const [activeSubTab, setActiveSubTab] = useState<'your' | 'all'>('your');

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <Button
          variant="ghost"
          size="xs"
          onClick={() => setActiveSubTab('your')}
          className={`${
            activeSubTab === 'your'
              ? 'text-green'
              : 'text-dim hover:text-foreground'
          }`}
        >
          your_bids
          {userBids && userBids.length > 0 && (
            <span className="ml-1 text-[10px] px-1.5 py-0.5 border border-green text-green">
              {userBids.length}
            </span>
          )}
        </Button>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => setActiveSubTab('all')}
          className={`${
            activeSubTab === 'all'
              ? 'text-purple'
              : 'text-dim hover:text-foreground'
          }`}
        >
          all_bids
          {allBids && allBids.length > 0 && (
            <span className="ml-1 text-[10px] px-1.5 py-0.5 border border-purple text-purple">
              {allBids.length}
            </span>
          )}
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="xs"
          onClick={() => refetch()}
          className="text-dim hover:text-foreground"
        >
          [refresh]
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="h-50 flex items-center justify-center text-dim text-sm">
          loading bids...
        </div>
      ) : activeSubTab === 'your' ? (
        // Your bids tab
        !isConnected ? (
          <div className="min-h-50 flex flex-col items-center justify-center text-center">
            <p className="text-sm text-dim">
              // connect wallet to view your bids
            </p>
          </div>
        ) : !userBids || userBids.length === 0 ? (
          <div className="min-h-50 flex flex-col items-center justify-center text-center">
            <p className="text-sm text-dim">// no bids yet</p>
            <p className="text-xs text-dim mt-1">
              place a bid in the auction panel
            </p>
          </div>
        ) : (
          <div className="space-y-2 min-h-50 max-h-75 overflow-y-auto">
            {auctionState &&
              userBids.map(bid => (
                <BidRow
                  key={bid.id.toString()}
                  bid={bid}
                  auctionState={auctionState}
                  currentBlock={blockTimeData?.currentBlock}
                  blockTimeMs={blockTimeData?.blockTimeMs ?? 2000}
                  isUserBid
                />
              ))}
          </div>
        )
      ) : // All bids tab
      !allBids || allBids.length === 0 ? (
        <div className="min-h-50 flex flex-col items-center justify-center text-center">
          <p className="text-sm text-dim">// no bids in this auction yet</p>
        </div>
      ) : (
        <div className="space-y-2 min-h-50 max-h-75 overflow-y-auto">
          {auctionState &&
            allBids.map(bid => (
              <BidRow
                key={bid.id.toString()}
                bid={bid}
                auctionState={auctionState}
                currentBlock={blockTimeData?.currentBlock}
                blockTimeMs={blockTimeData?.blockTimeMs ?? 2000}
                isUserBid={
                  userAddress &&
                  bid.owner.toLowerCase() === userAddress.toLowerCase()
                }
              />
            ))}
        </div>
      )}
    </div>
  );
};
