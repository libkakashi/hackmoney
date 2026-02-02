'use client';

import {formatUnits} from 'viem';
import {CountdownDisplay} from '../countdown';
import {AuctionState} from '~/lib/cca/auction';

export const PreAuctionPanel = ({
  auctionState,
  startTimestamp,
}: {
  auctionState: AuctionState;
  startTimestamp: number;
}) => {
  return (
    <div className="border border-border bg-card">
      {/* Status */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="status-dot bg-yellow status-dot-pulse" />
          <span className="text-sm text-yellow">launching soon</span>
        </div>
      </div>

      {/* Countdown */}
      <div className="p-6 border-b border-border">
        <CountdownDisplay timestamp={startTimestamp} />
        <p className="text-xs text-dim text-center mt-4">
          starts at block #{auctionState.startBlock.toString()}
        </p>
      </div>

      {/* Stats */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 border border-border">
            <div className="text-xs text-dim mb-1">floor_price</div>
            <div className="text-green tabular-nums">
              $
              {(
                (Number(auctionState.floorPriceQ96) / Number(2n ** 96n)) *
                1e12
              ).toFixed(6)}
            </div>
          </div>
          <div className="p-3 border border-border">
            <div className="text-xs text-dim mb-1">total_supply</div>
            <div className="text-purple tabular-nums">
              {Number(formatUnits(auctionState.totalSupply, 18)).toLocaleString(
                undefined,
                {maximumFractionDigits: 0},
              )}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-3 border border-border">
          <div className="text-xs text-purple mb-1">// preparation mode</div>
          <p className="text-xs text-dim">
            early bidders always get better prices. ensure your wallet is
            connected and funded.
          </p>
        </div>

        {/* Action */}
        <button
          className="w-full p-3 border border-border text-dim text-sm"
          disabled
        >
          waiting for auction...
        </button>
      </div>
    </div>
  );
};
