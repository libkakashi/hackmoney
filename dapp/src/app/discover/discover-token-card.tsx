'use client';

import Link from 'next/link';
import {Address, formatEther} from 'viem';
import {useAuctionState} from '~/hooks/cca/use-auction-state';
import {useTokenByAddress} from '~/hooks/use-tokens';

const MEDAL_EMOJIS = [
  '🏆',
  '⭐',
  '🔥',
  '💎',
  '🚀',
  '👑',
  '🌟',
  '💫',
  '🎯',
  '⚡',
];

function getRandomMedals(seed: string, count: number = 3): string[] {
  // Use address as seed for consistent medals per token
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const medals: string[] = [];
  for (let i = 0; i < count; i++) {
    const index = Math.abs((hash + i * 7) % MEDAL_EMOJIS.length);
    medals.push(MEDAL_EMOJIS[index]);
  }
  return medals;
}

function getRandomPriceData(seed: string): {price: number; change: number} {
  // Use address as seed for consistent price per token
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  // Generate price between 0.0001 and 0.1
  const price = (Math.abs(hash % 10000) + 1) / 100000;
  // Generate change between -50% and +100%
  const change = ((Math.abs((hash * 13) % 150) - 50) * 100) / 100;
  return {price, change};
}

export const DiscoverTokenCard = ({tokenAddr}: {tokenAddr?: Address}) => {
  const {data: token} = useTokenByAddress(tokenAddr);
  const {data: auctionData} = useAuctionState(token?.auction);

  const status = auctionData?.status;
  const isLive = status === 'active';
  const isUpcoming = status === 'not_started';

  const isGraduating = isLive || isUpcoming;
  const isTrading = !isLive && !isUpcoming;

  const progress = auctionData?.progress ?? 0;

  const totalRaised = auctionData?.totalBidAmount
    ? formatEther(auctionData.totalBidAmount)
    : '0';

  if (!token) return <DiscoverTokenCardSkeleton />;

  return (
    <Link href={`/token/${token.address}`}>
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
          {status === 'ended' && !isTrading && (
            <div className="terminal-badge terminal-badge-upcoming">ended</div>
          )}
          {status === 'claimable' && !isTrading && (
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
          <div className="w-32 h-32 shrink-0 border-r border-border flex items-center justify-center bg-background terminal-image-hover">
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
            {/* Name & Medals */}
            <div className="mb-1">
              <div className="flex items-center gap-1.5 font-bold group-hover:text-green transition-colors justify-between">
                <span className="truncate">{token.name}</span>
              </div>
            </div>

            {/* Medals */}
            <div className="flex items-center gap-1 mb-2">
              {getRandomMedals(token.address).map((medal, i) => (
                <span key={i} className="text-sm" title="Medal">
                  {medal}
                </span>
              ))}
            </div>

            {/* Description */}
            {token.description && (
              <div className="text-xs text-dim truncate mb-2">
                {token.description}
              </div>
            )}

            {/* Price - bottom aligned */}
            <div className="flex items-center gap-2 text-sm mt-auto">
              {(() => {
                const {price, change} = getRandomPriceData(token.address);
                const isPositive = change >= 0;
                return (
                  <>
                    <span className="tabular-nums">${price}</span>
                    <span
                      className={`tabular-nums ${isPositive ? 'text-green' : 'text-red'}`}
                    >
                      {isPositive ? '+' : ''}
                      {change.toFixed(1)}%
                    </span>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Bottom stats section */}
        <div className="px-3 pb-3 border-t border-border">
          {/* Auction progress for graduating tokens */}
          {isGraduating && (
            <>
              <div className="terminal-progress mb-2 -mx-1">
                <div
                  className={`terminal-progress-bar ${isUpcoming ? 'bg-purple!' : ''}`}
                  style={{width: `${progress}%`}}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-dim">
                  {isUpcoming ? 'upcoming' : '123 bidders'}
                </span>
                <span>
                  <span className="text-green tabular-nums">
                    {parseFloat(totalRaised).toFixed(4)}
                  </span>
                  <span className="text-dim"> ETH</span>
                </span>
              </div>
            </>
          )}

          {/* Placeholder stats for trading tokens */}
          {isTrading && (
            <div className="flex items-center justify-between text-xs pt-2">
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
        <div className="w-36 h-36 shrink-0 border-r border-border bg-border animate-pulse" />
        <div className="flex-1 p-4 flex flex-col">
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
