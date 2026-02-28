'use client';

import {useState} from 'react';
import {parseUnits, formatUnits, type Address} from 'viem';
import {useConnectModal} from '@rainbow-me/rainbowkit';
import {useConnection} from 'wagmi';
import {toast} from 'sonner';
import {Input} from '~/components/ui/input';
import {Button} from '~/components/ui/button';
import {cn} from '~/lib/utils';
import {trpc} from '~/lib/trpc';
import {useSiweAuth} from '~/hooks/use-siwe-auth';
import {useTokenByAddress} from '~/hooks/use-tokens';

const timeAgo = (date: Date | string): string => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
};

interface BountySectionProps {
  tokenAddress: Address;
  repoOwner: string;
  repoName: string;
  issueNumber: number;
}

export const BountySection = ({
  tokenAddress,
  repoOwner,
  repoName,
  issueNumber,
}: BountySectionProps) => {
  const [amount, setAmount] = useState('');
  const {isAuthenticated, session, signIn, needsSignIn} = useSiweAuth();
  const {isConnected} = useConnection();
  const {openConnectModal} = useConnectModal();
  const {data: token} = useTokenByAddress(tokenAddress);

  const utils = trpc.useUtils();

  const {data: bounties, isLoading} = trpc.bounty.getByIssue.useQuery(
    {tokenAddress, issueNumber},
    {staleTime: 30 * 1000},
  );

  const create = trpc.bounty.create.useMutation({
    onSuccess: () => {
      toast.success('bounty pledged');
      setAmount('');
      void utils.bounty.getByIssue.invalidate({tokenAddress, issueNumber});
      void utils.bounty.getTotals.invalidate({tokenAddress});
    },
    onError: err => {
      toast.error(err.message);
    },
  });

  const handlePledge = () => {
    if (!amount || Number(amount) <= 0) return;
    try {
      const raw = parseUnits(amount, 18).toString();
      create.mutate({
        tokenAddress,
        repoOwner,
        repoName,
        issueNumber,
        amount: raw,
      });
    } catch {
      toast.error('invalid amount');
    }
  };

  const handleAuth = () => {
    if (!isConnected) {
      openConnectModal?.();
    } else if (needsSignIn || !isAuthenticated) {
      void signIn();
    }
  };

  const totalPledged = bounties?.reduce(
    (sum, b) => sum + Number(formatUnits(BigInt(b.amount), 18)),
    0,
  );

  return (
    <div className="border border-border bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-sm">
          <span className="text-green">$</span> bounties
        </span>
        {totalPledged !== undefined && totalPledged > 0 && (
          <span className="text-sm text-yellow tabular-nums">
            {totalPledged.toLocaleString(undefined, {maximumFractionDigits: 2})}{' '}
            <span className="text-muted-foreground">{token?.symbol ?? 'tokens'}</span>
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* existing pledges */}
        {isLoading ? (
          <div className="text-dim text-sm text-center py-2">loading...</div>
        ) : bounties && bounties.length > 0 ? (
          <div className="space-y-2">
            {bounties.map(b => (
              <div
                key={b.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-green">
                  {b.offererAddress.slice(0, 6)}...{b.offererAddress.slice(-4)}
                </span>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums">
                    {Number(formatUnits(BigInt(b.amount), 18)).toLocaleString(
                      undefined,
                      {maximumFractionDigits: 2},
                    )}{' '}
                    <span className="text-muted-foreground">{token?.symbol ?? 'tokens'}</span>
                  </span>
                  <span className="text-xs text-dim">{timeAgo(b.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-dim text-sm text-center py-2">
            // no bounties yet
          </div>
        )}

        {/* pledge form */}
        <div className="pt-3 border-t border-border">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="amount"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="flex-1 text-sm"
              />
              <span className="text-sm text-muted-foreground shrink-0">
                {token?.symbol ?? 'tokens'}
              </span>
              <Button
                size="sm"
                onClick={handlePledge}
                disabled={create.isPending || !amount || Number(amount) <= 0}
                className="shrink-0"
              >
                {create.isPending ? 'pledging...' : 'pledge'}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm text-dim">
                {!isConnected
                  ? '// connect wallet to pledge'
                  : '// sign in to pledge'}
              </span>
              <Button size="sm" variant="outline" onClick={handleAuth}>
                {!isConnected ? 'connect' : 'sign in'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
