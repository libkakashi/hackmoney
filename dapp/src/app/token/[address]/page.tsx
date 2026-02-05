'use client';

import {formatUnits, type Address} from 'viem';
import {useParams} from 'next/navigation';
import Link from 'next/link';
import {useConnection} from 'wagmi';

import {AuctionPanel} from '~/components/auction/auction-panel';
import {Container} from '~/components/layout/container';
import {Button} from '~/components/ui/button';
import {SwapPanel} from '~/components/swap/swap-panel';
import {BidsSection} from '~/components/auction/bids-section';
import {TokenMetadataCard} from './token-metadata-card';
import {TokenDiscussion} from '~/components/discussion/token-discussion';
import {TokenLeaderboard} from '~/components/discussion/token-leaderboard';

import {useTokenByAddress} from '~/hooks/use-tokens';
import {useTokenBalance} from '~/hooks/tokens/use-token-balance';
import {useAuctionState} from '~/hooks/cca/use-auction-state';

export default function TokenPage() {
  const params = useParams();
  const address = params.address as Address;

  const {data: token, isLoading, error} = useTokenByAddress(address);
  const {data: auctionState} = useAuctionState(token?.auction);
  const {address: userAddress} = useConnection();
  const {data: userBalance} = useTokenBalance(address, userAddress);

  if (isLoading) {
    return (
      <div className="py-6 md:py-8">
        <Container>
          <div className="text-dim text-sm mb-6">
            ~/token <span className="text-green">$</span> loading...
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-4">
              <div className="border border-border p-4 h-32 animate-pulse bg-card" />
              <div className="border border-border p-4 h-75 animate-pulse bg-card" />
            </div>
            <div className="lg:col-span-2">
              <div className="border border-border p-4 h-100 animate-pulse bg-card" />
            </div>
          </div>
        </Container>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="py-6 md:py-8">
        <Container>
          <div className="text-dim text-sm mb-6">
            ~/token <span className="text-red">$</span> error
          </div>
          <div className="border border-border p-8 text-center">
            <div className="text-red mb-2">// token not found</div>
            <p className="text-dim text-sm mb-4">
              {error?.message ||
                "this token doesn't exist or couldn't be loaded"}
            </p>
            <Button asChild showPrefix>
              <Link href="/discover">$ cd /discover</Link>
            </Button>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="py-6 md:py-6">
      <Container size="xl">
        {/* Command header */}
        <div className="text-dim text-sm mb-6">
          ~/token/{token.symbol.toLowerCase()}{' '}
          <span className="text-green">$</span> cat info.md
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-4 space-y-4">
            {/* Token Header */}
            <TokenMetadataCard address={address} />

            {/* Bids Section */}
            {token && (
              <div className="border border-border bg-card p-4">
                <BidsSection auctionAddr={token?.auction} />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-4">
            {/* User Balance */}
            {userAddress &&
              auctionState &&
              auctionState.status === 'claimable' && (
                <div className="border py-2 px-4 flex justify-between">
                  <div className="text-sm text-dim">your_balance</div>
                  <div className="tabular-nums text-sm">
                    {userBalance && token
                      ? Number(formatUnits(userBalance, 18)).toFixed(2)
                      : '0.00'}{' '}
                    <span className="text-dim">{token?.symbol}</span>
                  </div>
                </div>
              )}

            {token ? (
              <AuctionPanel auctionAddr={token.auction} />
            ) : (
              <div className="border border-border bg-card p-4">
                <div className="h-25 flex flex-col items-center justify-center text-center">
                  <p className="text-sm text-dim">
                    // no auction data available
                  </p>
                </div>
              </div>
            )}

            <SwapPanel tokenAddr={token.address} />
          </div>
        </div>

        {/* Discussion + Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-2 border border-border bg-card p-4">
            <TokenDiscussion />
          </div>
          <div className="lg:col-span-1 border border-border bg-card p-4 h-fit">
            <TokenLeaderboard />
          </div>
        </div>

        {/* Terminal footer */}
        <div className="mt-8 text-xs text-dim">
          <div className="flex items-center gap-2">
            <span className="text-green">●</span>
            <span>process complete</span>
            <span className="text-dim">|</span>
            <span>exit code: 0</span>
          </div>
        </div>
      </Container>
    </div>
  );
}
