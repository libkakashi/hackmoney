'use client';

import {useState} from 'react';
import {formatUnits, type Address} from 'viem';
import {useParams} from 'next/navigation';
import Link from 'next/link';
import {CircleDot, MessageSquare} from 'lucide-react';
import {useConnection} from 'wagmi';

import {Container} from '~/components/layout/container';
import {Button} from '~/components/ui/button';
import {SwapPanel} from '~/components/swap/swap-panel';
import {TokenMetadataCard} from './token-metadata-card';
import {TokenDiscussion} from '~/components/discussion/token-discussion';
import {TokenLeaderboard} from '~/components/discussion/token-leaderboard';
import {IssuesList} from '~/components/issues/issues-list';
import {cn} from '~/lib/utils';

import {useTokenByAddress} from '~/hooks/use-tokens';
import {useTokenBalance} from '~/hooks/tokens/use-token-balance';

type Tab = 'issues' | 'discussion';

export default function TokenPage() {
  const params = useParams();
  const address = params.address as Address;
  const [tab, setTab] = useState<Tab>('issues');

  const {data: token, isLoading, error} = useTokenByAddress(address);
  const {address: userAddress} = useConnection();
  const {data: userBalance} = useTokenBalance(address, userAddress);

  if (isLoading) {
    return (
      <div className="py-6 md:py-6">
        <Container size="xl">
          <div className="text-dim text-sm mb-6">
            ~/token <span className="text-green">$</span> loading...
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
            <div className="lg:col-span-4 space-y-4">
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
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-4">
            {/* User Balance */}
            {userAddress && (
              <div className="border border-border bg-card py-3 px-4 flex justify-between items-center">
                <div className="text-sm text-muted-foreground">your_balance</div>
                <div className="tabular-nums text-sm font-medium">
                  <span className="text-green">
                    {userBalance && token
                      ? Number(formatUnits(userBalance, 18)).toFixed(2)
                      : '0.00'}
                  </span>{' '}
                  <span className="text-muted-foreground">{token?.symbol}</span>
                </div>
              </div>
            )}

            <SwapPanel tokenAddr={token.address} />
          </div>
        </div>

        {/* Issues/Discussion + Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 mt-8">
          <div className="lg:col-span-4 border border-border bg-card">
            <div className="flex items-center gap-1 px-4 pt-3 pb-2 border-b border-border">
              <Button
                variant="ghost"
                onClick={() => setTab('issues')}
                className={cn(
                  tab === 'issues' ? 'text-green' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <CircleDot className="size-3" />
                issues
              </Button>
              <Button
                variant="ghost"
                onClick={() => setTab('discussion')}
                className={cn(
                  tab === 'discussion' ? 'text-green' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <MessageSquare className="size-3" />
                discussion
              </Button>
            </div>

            <div className="p-4">
              {tab === 'issues' && <IssuesList tokenAddress={address} />}
              {tab === 'discussion' && <TokenDiscussion tokenAddress={address} />}
            </div>
          </div>

          <div className="lg:col-span-2 border border-border bg-card p-4 h-fit">
            <TokenLeaderboard tokenAddress={address} />
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
