'use client';

import {useState, useEffect} from 'react';
import {formatUnits, parseUnits, type Address} from 'viem';
import {useConnection} from 'wagmi';

import {CountdownCompact} from '~/components/countdown';
import {Button} from '~/components/ui/button';
import {Card, CardHeader, CardTitle, CardContent} from '~/components/ui/card';
import {Loader} from '~/components/ui/loader';

import {useTokenBalance} from '~/hooks/tokens/use-token-balance';
import {useTokenData} from '~/hooks/tokens/use-token-data';
import {useSubmitBid} from '~/hooks/cca/use-submit-bid';

import type {AuctionState} from '~/lib/cca/auction';
import {formatCompactNumber} from './utils';
import {cn} from '~/lib/utils';

interface ActiveAuctionPanelProps {
  auctionAddr: Address;
  auctionState: AuctionState;
  startTimestamp: number;
  endTimestamp: number;
}

const Q96 = 2n ** 96n;

export const ActiveAuctionPanel = ({
  auctionAddr,
  auctionState,
  startTimestamp,
  endTimestamp,
}: ActiveAuctionPanelProps) => {
  const {isConnected} = useConnection();
  const {data: userBalance} = useTokenBalance(auctionState.currency);
  const {data: {decimals, symbol} = {}} = useTokenData(auctionState.currency);

  const {
    mutateAsync: submitBid,
    isPending: isBidding,
    error: bidError,
  } = useSubmitBid(auctionAddr);

  const [bidAmount, setBidAmount] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  let parsedBidAmount = 0n;
  try {
    if (bidAmount && !isNaN(Number(bidAmount)) && Number(bidAmount) > 0) {
      parsedBidAmount = parseUnits(bidAmount, 6);
    }
  } catch {
    // nothing
  }

  const canBid = parsedBidAmount > 0n && isConnected && !isBidding;

  const handleBid = async () => {
    if (!canBid) return;
    await submitBid(parsedBidAmount);
    setBidAmount('');
  };

  const handleMaxClick = () => {
    if (userBalance) {
      setBidAmount(formatUnits(userBalance, 6));
    }
  };

  const totalDuration = endTimestamp - startTimestamp;
  const elapsed = Math.max(0, now - startTimestamp);
  const durationProgress = Math.min(100, (elapsed / totalDuration) * 100);

  const tokensAtFloorPrice =
    auctionState.floorPriceQ96 > 0n
      ? (auctionState.totalBidAmount * Q96) / auctionState.floorPriceQ96
      : 0n;

  const tokensAtFloorPriceNum = Number(formatUnits(tokensAtFloorPrice, 18));
  const totalSupply = Number(formatUnits(auctionState.totalSupply, 18));
  const allTokensSoldAtFloor = tokensAtFloorPriceNum >= totalSupply;

  return (
    <div className="space-y-4">
      {/* Card 1: Live Auction Status */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="status-dot bg-green status-dot-pulse" />
              <CardTitle className="text-green">
                live auction ({Math.round(totalDuration / (1000 * 60 * 60))}h)
              </CardTitle>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-dim">ends in</div>
              <CountdownCompact timestamp={endTimestamp} className="text-sm" />
            </div>
          </div>
          <div className="terminal-progress my-2">
            <div
              className="terminal-progress-bar"
              style={{width: `${durationProgress}%`}}
            />
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Place Bid */}
      <Card>
        <CardHeader>
          <CardTitle>$ place_bid</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Amount input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs text-dim">amount (USDC)</label>
              {userBalance !== undefined && decimals !== undefined && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleMaxClick}
                  className="text-green hover:underline"
                >
                  balance: {formatUnits(userBalance, decimals)} {symbol}
                </Button>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                placeholder="0.00"
                value={bidAmount}
                onChange={e => setBidAmount(e.target.value)}
                className="w-full h-12 px-4 pr-16 bg-background border border-border text-lg tabular-nums placeholder:text-dim focus:outline-none focus:border-green"
                min="0"
                step="0.01"
              />
              <div className="absolute right-3 inset-y-0 flex items-center">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleMaxClick}
                  className="text-green"
                >
                  MAX
                </Button>
              </div>
            </div>
          </div>

          {/* // tokens allocated at time-weighted average price. bid early to guarantee best price */}
          <p className="text-xs text-cyan-400 -mr-2">
            // tokens are allocated by time-weighted average of bids
            <br />
            // being early gurantees better price
          </p>

          {/* Error */}
          {bidError && (
            <div className="p-3 border border-red">
              <p className="text-xs text-red">error: {bidError.message}</p>
            </div>
          )}

          {/* Bid button */}
          {isConnected ? (
            <Button
              className="w-full h-12"
              onClick={handleBid}
              disabled={!canBid}
            >
              {isBidding ? (
                <>
                  <Loader />
                  confirming...
                </>
              ) : (
                'place bid'
              )}
            </Button>
          ) : (
            <div className="p-4 border border-dashed border-border text-center">
              <p className="text-xs text-dim">connect wallet to place a bid</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 3: Stats */}
      <Card>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-dim mb-1">clearing_price</div>
              <div className="text-green tabular-nums text-lg">
                ${auctionState.clearingPriceUsd.toFixed(4)}
              </div>
            </div>
            <div>
              <div className="text-xs text-dim mb-1">total_bids</div>
              <div className="text-purple tabular-nums text-lg">
                {formatCompactNumber(
                  Number(formatUnits(auctionState.totalBidAmount, 6)),
                )}{' '}
                USDC
              </div>
            </div>
            <div>
              <div
                className={cn(
                  'text-xs mb-1',
                  allTokensSoldAtFloor ? 'text-yellow' : 'text-dim',
                )}
              >
                tokens_sold
              </div>
              <div
                className={cn(
                  'tabular-nums text-lg',
                  allTokensSoldAtFloor ? 'text-yellow' : '',
                )}
              >
                {formatCompactNumber(
                  allTokensSoldAtFloor ? totalSupply : tokensAtFloorPriceNum,
                )}{' '}
                / {formatCompactNumber(totalSupply)}
              </div>
            </div>
          </div>
          {allTokensSoldAtFloor && (
            <p className="text-xs text-yellow border-t border-yellow pt-2">
              // sold out at floor - price rising with demand
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
