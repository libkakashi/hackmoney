'use client';

import {type Address} from 'viem';
import {useParams} from 'next/navigation';
import Link from 'next/link';
import {ArrowLeft, ExternalLink} from 'lucide-react';

import {Container} from '~/components/layout/container';
import {Button} from '~/components/ui/button';
import {BountySection} from '~/components/issues/bounty-section';

import {useTokenByAddress} from '~/hooks/use-tokens';
import {useTokenRepo} from '~/hooks/use-token-repo';
import {trpc} from '~/lib/trpc';
import {cn} from '~/lib/utils';

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

export default function IssuePage() {
  const params = useParams();
  const address = params.address as Address;
  const issueNumber = Number(params.number);

  const {data: token} = useTokenByAddress(address);
  const {owner, name: repoName, isResolved} = useTokenRepo(address);

  const {data: issue, isLoading, error} = trpc.github.getIssue.useQuery(
    {owner: owner!, repo: repoName!, issueNumber},
    {enabled: isResolved, staleTime: 2 * 60 * 1000, retry: false},
  );

  if (isLoading || !isResolved) {
    return (
      <div className="py-6">
        <Container size="xl">
          <div className="text-dim text-sm mb-6">
            ~/token/{token?.symbol?.toLowerCase() ?? '...'}/issue/{issueNumber}{' '}
            <span className="text-green">$</span> loading...
          </div>
          <div className="border border-border p-8 animate-pulse bg-card h-64" />
        </Container>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="py-6">
        <Container size="xl">
          <div className="text-dim text-sm mb-6">
            ~/token/{token?.symbol?.toLowerCase() ?? '...'}/issue/{issueNumber}{' '}
            <span className="text-red">$</span> error
          </div>
          <div className="border border-border p-8 text-center">
            <div className="text-red mb-2">// issue not found</div>
            <p className="text-dim text-sm mb-4">
              {error?.message ?? "this issue doesn't exist or couldn't be loaded"}
            </p>
            <Button asChild showPrefix>
              <Link href={`/token/${address}`}>$ cd back</Link>
            </Button>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="py-6">
      <Container size="xl">
        {/* breadcrumb */}
        <div className="text-dim text-sm mb-6">
          ~/token/{token?.symbol?.toLowerCase() ?? '...'}/issue/{issueNumber}{' '}
          <span className="text-green">$</span> cat issue.md
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* main content */}
          <div className="lg:col-span-2 space-y-4">
            {/* back link */}
            <Link
              href={`/token/${address}`}
              className="flex items-center gap-1.5 text-sm text-dim hover:text-foreground transition-colors w-fit"
            >
              <ArrowLeft className="w-3 h-3" />
              back to {token?.symbol ?? 'token'}
            </Link>

            {/* issue header */}
            <div className="border border-border bg-card">
              <div className="p-5">
                {/* title */}
                <h1 className="text-xl font-semibold mb-3">
                  {issue.title}
                  <span className="text-dim font-normal ml-2">#{issue.number}</span>
                </h1>

                {/* meta row */}
                <div className="flex items-center gap-3 text-sm">
                  <span
                    className={cn(
                      'px-2 py-0.5 text-xs border',
                      issue.state === 'open'
                        ? 'text-green border-green/30'
                        : 'text-red border-red/30',
                    )}
                  >
                    {issue.state}
                  </span>
                  <img
                    src={issue.author.avatarUrl}
                    alt={issue.author.login}
                    className="w-5 h-5 border border-border"
                  />
                  <a
                    href={issue.author.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green hover:text-foreground transition-colors"
                  >
                    {issue.author.login}
                  </a>
                  <span className="text-dim">opened {timeAgo(issue.createdAt)}</span>
                  {issue.commentsCount > 0 && (
                    <span className="text-dim">
                      {issue.commentsCount} comment{issue.commentsCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* labels */}
                {issue.labels.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {issue.labels.map(l => (
                      <span
                        key={l.name}
                        className="text-xs px-2 py-0.5 border"
                        style={{
                          borderColor: `#${l.color}40`,
                          color: `#${l.color}`,
                        }}
                      >
                        {l.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* body */}
              {issue.body && (
                <div className="px-5 pb-5 border-t border-border pt-4">
                  <pre className="whitespace-pre-wrap text-sm text-dim leading-relaxed font-[inherit]">
                    {issue.body}
                  </pre>
                </div>
              )}

              {/* actions */}
              <div className="px-5 py-3 border-t border-border flex items-center gap-3">
                <Button asChild size="sm" variant="outline">
                  <a
                    href={issue.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3 h-3" />
                    comment on github
                  </a>
                </Button>
              </div>
            </div>
          </div>

          {/* sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <BountySection
              tokenAddress={address}
              repoOwner={owner!}
              repoName={repoName!}
              issueNumber={issueNumber}
            />

            {/* assignees */}
            {issue.assignees.length > 0 && (
              <div className="border border-border bg-card p-4">
                <div className="text-sm text-dim mb-2">assignees</div>
                <div className="space-y-2">
                  {issue.assignees.map(a => (
                    <div key={a.login} className="flex items-center gap-2 text-sm">
                      <img
                        src={a.avatarUrl}
                        alt={a.login}
                        className="w-5 h-5 border border-border"
                      />
                      <span className="text-green">{a.login}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* terminal footer */}
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
