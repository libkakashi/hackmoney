'use client';

import {useState} from 'react';
import Link from 'next/link';
import type {Address} from 'viem';
import {formatUnits} from 'viem';
import {MessageSquare, ChevronLeft, ChevronRight} from 'lucide-react';
import {Input} from '~/components/ui/input';
import {Button} from '~/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import {cn} from '~/lib/utils';
import {trpc} from '~/lib/trpc';
import {useTokenRepo} from '~/hooks/use-token-repo';

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
};

const formatBounty = (raw: string): string => {
  const n = Number(formatUnits(BigInt(raw), 18));
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n >= 1) return n.toFixed(0);
  return n.toFixed(2);
};

export const IssuesList = ({tokenAddress}: {tokenAddress: Address}) => {
  const [state, setState] = useState<'open' | 'closed' | 'all'>('open');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const {owner, name: repoName, isResolved} = useTokenRepo(tokenAddress);

  const {data: issues, isLoading} = trpc.github.getIssues.useQuery(
    {owner: owner!, repo: repoName!, state, page},
    {enabled: isResolved, staleTime: 2 * 60 * 1000, retry: false},
  );

  const {data: bountyTotals} = trpc.bounty.getTotals.useQuery(
    {tokenAddress},
    {staleTime: 60 * 1000},
  );

  const filtered = issues?.filter(
    i => !search || i.title.toLowerCase().includes(search.toLowerCase()),
  );

  if (!isResolved) {
    return (
      <div className="text-dim text-center py-8 text-sm">
        // no linked repository
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* filters */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="// search issues..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 text-sm"
        />
        <Select
          value={state}
          onValueChange={v => {
            setState(v as 'open' | 'closed' | 'all');
            setPage(1);
          }}
        >
          <SelectTrigger className="w-32 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">open</SelectItem>
            <SelectItem value="closed">closed</SelectItem>
            <SelectItem value="all">all</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* list */}
      {isLoading ? (
        <div className="text-dim text-center py-8 text-sm">loading...</div>
      ) : filtered && filtered.length > 0 ? (
        <div className="border border-border divide-y divide-border">
          {filtered.map(issue => {
            const bountyRaw = bountyTotals?.[issue.number];
            return (
              <Link
                key={issue.number}
                href={`/token/${tokenAddress}/issue/${issue.number}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-background/50 transition-colors"
              >
                {/* state dot */}
                <span
                  className={cn(
                    'w-2 h-2 shrink-0',
                    issue.state === 'open' ? 'bg-green' : 'bg-red',
                  )}
                />

                {/* main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm truncate">{issue.title}</span>
                    {issue.labels.map(l => (
                      <span
                        key={l.name}
                        className="text-[10px] px-1.5 py-px border shrink-0"
                        style={{
                          borderColor: `#${l.color}40`,
                          color: `#${l.color}`,
                        }}
                      >
                        {l.name}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-dim mt-0.5">
                    <span>#{issue.number}</span>
                    <span>{issue.author.login}</span>
                    <span>{timeAgo(issue.createdAt)}</span>
                    {issue.commentsCount > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {issue.commentsCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* bounty badge */}
                {bountyRaw && bountyRaw !== '0' && (
                  <span className="text-xs text-yellow border border-yellow/30 px-2 py-0.5 shrink-0 tabular-nums">
                    {formatBounty(bountyRaw)} bounty
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-dim text-center py-8 text-sm">
          // no issues found
        </div>
      )}

      {/* pagination */}
      {issues && issues.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="text-dim hover:text-foreground"
          >
            <ChevronLeft className="w-3 h-3" />
            prev
          </Button>
          <span className="text-dim text-xs">page {page}</span>
          <Button
            variant="ghost"
            size="sm"
            disabled={issues.length < 30}
            onClick={() => setPage(p => p + 1)}
            className="text-dim hover:text-foreground"
          >
            next
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
};
