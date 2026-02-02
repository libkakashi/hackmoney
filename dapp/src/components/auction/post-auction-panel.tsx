'use client';

import {type Address, formatUnits} from 'viem';
import {useConnection} from 'wagmi';

import {Button} from '~/components/ui/button';
import {useUserBids} from '~/hooks/cca/use-user-bids';
import {useTokenData} from '~/hooks/tokens/use-token-data';
import {useClaimTokens} from '~/hooks/cca/use-claim-tokens';

import {formatCompactNumber} from './utils';
import type {AuctionState} from '~/lib/cca/auction';

interface PostAuctionPanelProps {
  auctionAddr: Address;
  auctionState: AuctionState;
  tokenSymbol?: string;
}

export const PostAuctionPanel = ({
  auctionAddr,
  auctionState,
}: PostAuctionPanelProps) => {
  const {isConnected} = useConnection();
  const {
    data: {bids: userBids, totalClaimable} = {},
    isLoading: isLoadingBids,
  } = useUserBids(auctionAddr);

  const {data: {symbol: tokenSymbol} = {}} = useTokenData(auctionState.token);

  const {
    mutateAsync: claimTokens,
    isPending: isClaiming,
    error: claimError,
  } = useClaimTokens(auctionAddr);
  const isClaimable = auctionState.status === 'claimable';

  const claimableBids = userBids?.filter(bid => bid.exitedBlock === 0n) ?? [];
  const hasClaimableBids = claimableBids.length > 0;

  const handleClaimAll = async () => {
    if (!hasClaimableBids || isClaiming) return;
    await claimTokens();
  };

  // Don't render if user has no claimable bids
  if (!isConnected || isLoadingBids) return null;
  if (!hasClaimableBids) return null;

  return (
    <div className="border border-border bg-card">
      {/* Status header */}
      <div className="pt-2 pb-3 px-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="status-dot bg-primary" />
          <span className="text-sm text-primary">auction complete</span>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3 pt-2 space-y-4">
        <div className="flex justify-between">
          {/* Left: allocation info */}
          <div className="flex flex-col gap-2 justify-end">
            <div className="text-sm text-purple">// your allocation</div>
            <div className="text-base tabular-nums">
              {formatCompactNumber(
                Number(formatUnits(totalClaimable || 0n, 18)),
              )}{' '}
              <span className="text-sm text-dim">{tokenSymbol}</span>
            </div>
          </div>

          {/* Right: bids count + button */}
          <div className="flex flex-col items-end gap-2">
            <p className="text-xs text-dim">
              from {userBids?.length} bid
              {userBids?.length !== 1 ? 's' : ''}
            </p>

            {/* Claim button */}
            {isClaimable && (
              <Button size="sm" onClick={handleClaimAll} disabled={isClaiming}>
                {isClaiming ? 'claiming...' : '$ claim'}
              </Button>
            )}

            {/* Waiting for claim */}
            {!isClaimable && (
              <div className="px-4 py-2 border border-border">
                <p className="text-xs text-dim">awaiting claim</p>
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {claimError && (
          <div className="p-3 border border-red">
            <p className="text-xs text-red">error: {claimError.message}</p>
          </div>
        )}
      </div>
    </div>
  );
};
