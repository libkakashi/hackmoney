'use client';

import Link from 'next/link';
import type {GetTokensQuery} from '~/graphql/generated';

type Token = GetTokensQuery['Launchpad_TokenLaunched'][number];

// Placeholder types for graduation - to be implemented
type AuctionPhase = 'upcoming' | 'live' | 'ended' | 'claimable' | 'trading';

interface AuctionState {
  phase: AuctionPhase;
  progress: number;
  bidderCount: number;
  totalRaised: string;
}

function getAuctionState(token: Token, currentBlock: bigint): AuctionState {
  const startBlock = BigInt(token.auctionStartBlock);
  const endBlock = BigInt(token.auctionEndBlock);
  const claimBlock = BigInt(token.auctionClaimBlock);
  const migrationBlock = BigInt(token.poolMigrationBlock);

  // Determine phase
  let phase: AuctionPhase;
  if (currentBlock < startBlock) {
    phase = 'upcoming';
  } else if (currentBlock >= startBlock && currentBlock < endBlock) {
    phase = 'live';
  } else if (currentBlock >= endBlock && currentBlock < claimBlock) {
    phase = 'ended';
  } else if (currentBlock >= claimBlock && currentBlock < migrationBlock) {
    phase = 'claimable';
  } else {
    phase = 'trading';
  }

  // Calculate progress (placeholder - would need actual auction data)
  let progress = 0;
  if (phase === 'live') {
    const totalBlocks = endBlock - startBlock;
    const elapsedBlocks = currentBlock - startBlock;
    progress = Number((elapsedBlocks * 100n) / totalBlocks);
  } else if (
    phase === 'ended' ||
    phase === 'claimable' ||
    phase === 'trading'
  ) {
    progress = 100;
  }

  return {
    phase,
    progress,
    bidderCount: 0, // Placeholder - needs indexer data
    totalRaised: '0', // Placeholder - needs indexer data
  };
}

function formatTimeAgo(timestamp: number) {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(timestamp * 1000).toLocaleDateString();
}

interface DiscoverTokenCardProps {
  token: Token;
  currentBlock?: bigint;
}

export const DiscoverTokenCard = ({
  token,
  currentBlock = 0n,
}: DiscoverTokenCardProps) => {
  const auctionState = getAuctionState(token, currentBlock);
  const isLive = auctionState.phase === 'live';
  const isUpcoming = auctionState.phase === 'upcoming';
  const isGraduating = isLive || isUpcoming;
  const isTrading = auctionState.phase === 'trading';

  return (
    <Link href={`/token/${token.token}`}>
      <div className="border border-border bg-card cursor-pointer group terminal-card-hover">
        {/* Terminal header bar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-background/50 terminal-header-hover">
          <div className="flex items-center gap-2">
            <span className="text-green">&gt;</span>
            <span className="text-sm terminal-cursor-hover">
              ${token.symbol}
            </span>
          </div>
          {isLive && (
            <div className="terminal-badge terminal-badge-live">
              <span className="inline-block w-1.5 h-1.5 bg-green mr-1.5 pulse-soft" />
              live
            </div>
          )}
          {isUpcoming && (
            <div className="terminal-badge terminal-badge-upcoming">
              upcoming
            </div>
          )}
          {auctionState.phase === 'ended' && (
            <div className="terminal-badge terminal-badge-upcoming">ended</div>
          )}
          {auctionState.phase === 'claimable' && (
            <div className="terminal-badge terminal-badge-upcoming">
              claimable
            </div>
          )}
          {isTrading && (
            <div className="terminal-badge terminal-badge-completed">
              trading
            </div>
          )}
        </div>

        {/* Main content with large image */}
        <div className="flex">
          {/* Large square image */}
          <div className="w-32 h-32 flex-shrink-0 border-r border-border flex items-center justify-center bg-background terminal-image-hover">
            {token.image ? (
              <img
                src={token.image}
                alt={token.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl font-bold text-purple/50">
                {token.symbol.slice(0, 2)}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-3 min-w-0 flex flex-col">
            {/* Name */}
            <div className="mb-1">
              <div className="font-bold truncate group-hover:text-green transition-colors">
                {token.name}
              </div>
            </div>

            {/* Description */}
            {token.description && (
              <div className="text-xs text-dim truncate mb-2">
                {token.description}
              </div>
            )}

            {/* Creator & Time */}
            <div className="flex items-center gap-2 text-xs text-dim mt-auto">
              <span className="truncate">
                by {token.creator.slice(0, 6)}...{token.creator.slice(-4)}
              </span>
              <span>-</span>
              <span>{formatTimeAgo(token.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Bottom stats section */}
        <div className="px-3 pb-3">
          {/* Auction progress for graduating tokens */}
          {isGraduating && (
            <>
              <div className="terminal-progress mb-1">
                <div
                  className={`terminal-progress-bar ${isUpcoming ? '!bg-purple' : ''}`}
                  style={{width: `${auctionState.progress}%`}}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-dim">
                  {auctionState.bidderCount} bidders
                </span>
                <span>
                  <span className="text-green tabular-nums">
                    {auctionState.totalRaised}
                  </span>
                  <span className="text-dim"> ETH</span>
                </span>
              </div>
            </>
          )}

          {/* Placeholder stats for trading tokens */}
          {isTrading && (
            <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
              <div>
                <span className="text-dim">mcap </span>
                <span className="tabular-nums">--</span>
              </div>
              <div>
                <span className="text-dim">vol </span>
                <span className="tabular-nums">--</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export const DiscoverTokenCardSkeleton = () => {
  return (
    <div className="border border-border bg-card">
      {/* Terminal header bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-background/50">
        <div className="flex items-center gap-2">
          <span className="text-dim">&gt;</span>
          <div className="h-4 w-12 bg-border animate-pulse" />
        </div>
        <div className="h-4 w-14 bg-border animate-pulse" />
      </div>

      {/* Main content with large image */}
      <div className="flex">
        <div className="w-32 h-32 flex-shrink-0 border-r border-border bg-border animate-pulse" />
        <div className="flex-1 p-3 flex flex-col">
          <div className="h-5 w-28 bg-border animate-pulse mb-2" />
          <div className="h-3 w-full bg-border animate-pulse mb-2" />
          <div className="h-4 w-24 bg-border animate-pulse mt-auto" />
        </div>
      </div>

      {/* Bottom stats */}
      <div className="px-3 pb-3">
        <div className="flex justify-between pt-2 border-t border-border">
          <div className="h-3 w-16 bg-border animate-pulse" />
          <div className="h-3 w-16 bg-border animate-pulse" />
        </div>
      </div>
    </div>
  );
};
