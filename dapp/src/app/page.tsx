import Link from 'next/link';
import {ArrowRight, GitPullRequest, CircleDot, GitFork} from 'lucide-react';
import {Container} from '~/components/layout/container';

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="py-28 md:py-40">
        <Container size="lg">
          <div>
            <div className="text-dim text-xs tracking-wider mb-8">
              ~/nyx <span className="text-green">$</span> cat readme.md
            </div>

            <h1 className="text-4xl md:text-5xl font-bold leading-[1.2] mb-6 tracking-tight">
              incentivize open-source <br />
              <span className="text-green">with tokens</span>
            </h1>

            <p className="text-muted-foreground text-base leading-relaxed mb-12 max-w-md">
              connect your GitHub repo. crowdfund bounties for issues. reward
              contributors with liquid tokens.
            </p>

            {/* CTA row */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/launch"
                className="group inline-flex items-center gap-2.5 px-5 py-3 border border-green text-green text-sm font-medium hover:bg-green/10 transition-all"
              >
                <span className="opacity-60">$</span>
                <span>connect github</span>
                <ArrowRight className="h-3.5 w-3.5 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
              </Link>

              <Link
                href="/discover"
                className="inline-flex items-center gap-2.5 px-5 py-3 border border-border text-muted-foreground text-sm hover:border-purple hover:text-purple transition-all"
              >
                browse projects
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Stats ribbon */}
      <section className="border-y border-border bg-card/50">
        <Container size="lg">
          <div className="flex justify-between divide-x divide-border py-8">
            <div className="pr-8">
              <div className="text-2xl md:text-3xl font-bold text-green tabular-nums">
                1,247
              </div>
              <div className="text-dim text-xs mt-1.5 tracking-wide">
                repos connected
              </div>
            </div>
            <div className="px-8">
              <div className="text-2xl md:text-3xl font-bold text-yellow tabular-nums">
                $42.5M
              </div>
              <div className="text-dim text-xs mt-1.5 tracking-wide">
                bounties distributed
              </div>
            </div>
            <div className="px-8">
              <div className="text-2xl md:text-3xl font-bold text-purple tabular-nums">
                12,800
              </div>
              <div className="text-dim text-xs mt-1.5 tracking-wide">
                issues funded
              </div>
            </div>
            <div className="pl-8">
              <div className="text-2xl md:text-3xl font-bold tabular-nums">
                89,421
              </div>
              <div className="text-dim text-xs mt-1.5 tracking-wide">
                contributors
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* GitHub integration */}
      <section className="py-32 border-t border-border">
        <Container size="lg">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            {/* Left — copy */}
            <div>
              <div className="text-dim text-xs tracking-wider mb-8">
                ~/nyx <span className="text-green">$</span> nyx github --status
              </div>

              <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
                Built on GitHub
              </h2>
              <p className="text-muted-foreground text-base leading-relaxed mb-12 max-w-sm">
                connect any repo or org. bounties live on issues. PRs trigger
                rewards. no new tools to learn.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <CircleDot className="w-5 h-5 text-green mt-0.5 shrink-0" />
                  <div>
                    <div className="text-base font-medium mb-1">
                      Issues become bounties
                    </div>
                    <div className="text-sm text-muted-foreground">
                      anyone can fund any issue with tokens
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <GitPullRequest className="w-5 h-5 text-purple mt-0.5 shrink-0" />
                  <div>
                    <div className="text-base font-medium mb-1">
                      PRs trigger payouts
                    </div>
                    <div className="text-sm text-muted-foreground">
                      merge a fix, earn the bounty automatically
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <GitFork className="w-5 h-5 text-yellow mt-0.5 shrink-0" />
                  <div>
                    <div className="text-base font-medium mb-1">
                      No new tools
                    </div>
                    <div className="text-sm text-muted-foreground">
                      keep using GitHub exactly as you do today
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — mock cards */}
            <div className="space-y-4">
              {/* Mock issue */}
              <div className="border border-border overflow-hidden">
                <div className="border-b border-border px-5 py-3.5 bg-card/50 flex items-center gap-2.5">
                  <CircleDot className="w-4 h-4 text-green" />
                  <span className="text-sm font-medium">
                    Fix memory leak in worker pool
                  </span>
                  <span className="text-dim text-sm ml-auto">#247</span>
                </div>
                <div className="px-5 py-4 space-y-4">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-sm px-3 py-1 border border-green/20 text-green bg-green/5 font-medium">
                      bounty: 2,000 $ACME
                    </span>
                    <span className="text-sm px-3 py-1 border border-yellow/20 text-yellow bg-yellow/5">
                      3 funders
                    </span>
                    <span className="text-sm px-3 py-1 border border-purple/20 text-purple bg-purple/5">
                      bug
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    ...
                  </p>
                  <div className="border-t border-border pt-3 flex items-center gap-4 text-sm text-dim">
                    <span>opened 2 days ago</span>
                    <span>4 comments</span>
                    <span className="text-green ml-auto">2 working</span>
                  </div>
                </div>
              </div>

              {/* Arrow connector */}
              <div className="flex justify-center text-dim text-sm py-1">
                ↓ PR merged
              </div>

              {/* Mock payout */}
              <div className="border border-green/30 bg-green/[0.03] overflow-hidden">
                <div className="border-b border-green/20 px-5 py-3.5 flex items-center gap-2.5">
                  <GitPullRequest className="w-4 h-4 text-purple" />
                  <span className="text-sm font-medium">
                    Fix worker cleanup on task completion
                  </span>
                  <span className="text-dim text-sm ml-auto">#251</span>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <div className="flex items-center gap-2.5 text-sm">
                    <span className="text-green">&#10003;</span>
                    <span className="text-muted-foreground">merged by</span>
                    <span className="font-medium">@alice</span>
                  </div>
                  <div className="border-t border-green/15 pt-3 space-y-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">@alice</span>
                      <span className="text-green font-medium">
                        +1,400 $ACME
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        @bob (review)
                      </span>
                      <span className="text-green font-medium">+600 $ACME</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Comparison table */}
      <section className="py-24 border-t border-border">
        <Container size="lg">
          <div className="text-dim text-xs tracking-wider mb-6">
            ~/nyx <span className="text-green">$</span> nyx compare
            --incentive-models
          </div>

          <h2 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight">
            Why token bounties work better
          </h2>
          <p className="text-muted-foreground text-base mb-10 max-w-md">
            token-based bounties align incentives and create sustainable value.
          </p>

          <div className="overflow-x-auto border border-border">
            <table className="w-full text-sm min-w-225">
              <thead>
                <tr className="border-b border-border bg-card/50">
                  <th className="text-left p-4 font-medium text-dim"> </th>
                  <th className="text-left p-4 font-medium text-dim whitespace-nowrap">
                    Traditional Bounties
                  </th>
                  <th className="text-left p-4 font-medium text-dim whitespace-nowrap">
                    GitHub Sponsors
                  </th>
                  <th className="text-left p-4 font-medium text-green bg-green/5 whitespace-nowrap">
                    Nyx
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    label: 'Who Can Fund',
                    trad: 'Project owners only',
                    gh: 'Individual sponsors only',
                    nyx: 'Anyone — crowdfunded bounties',
                  },
                  {
                    label: 'Reward Splitting',
                    trad: 'Manual, complex payouts',
                    gh: 'Not designed for bounties',
                    nyx: 'Automatic split across helpers',
                  },
                  {
                    label: 'Reward Liquidity',
                    trad: 'Fiat only — slow payouts',
                    gh: 'Fiat only — monthly payouts',
                    nyx: 'Instant — tradable tokens',
                  },
                  {
                    label: 'Contributor Upside',
                    trad: 'None — fixed payment',
                    gh: 'None — fixed payment',
                    nyx: 'Token value grows with project',
                  },
                  {
                    label: 'Supporter Upside',
                    trad: 'None — donation only',
                    gh: 'None — donation only',
                    nyx: 'Back early, own a stake in growth',
                  },
                ].map(row => (
                  <tr
                    key={row.label}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="p-4 font-medium">{row.label}</td>
                    <td className="p-4 text-muted-foreground">{row.trad}</td>
                    <td className="p-4 text-muted-foreground">{row.gh}</td>
                    <td className="p-4 text-green bg-green/5">{row.nyx}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-border">
        <Container size="lg">
          <div className="">
            <div className="text-dim text-xs tracking-wider mb-6">
              ~/nyx <span className="text-green">$</span> nyx init --github
            </div>

            <h2 className="text-2xl md:text-3xl font-bold mb-4 tracking-tight">
              your repo is already ready
            </h2>
            <p className="text-muted-foreground text-base mb-10 max-w-md">
              connect your GitHub repo in under 30 seconds.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/launch"
                className="group inline-flex items-center gap-2.5 px-5 py-3 border border-green text-green text-sm font-medium hover:bg-green/10 transition-all"
              >
                <span className="opacity-60">$</span>
                <span>connect github</span>
                <ArrowRight className="h-3.5 w-3.5 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
              </Link>

              <Link
                href="/discover"
                className="inline-flex items-center gap-2.5 px-5 py-3 border border-border text-muted-foreground text-sm hover:border-purple hover:text-purple transition-all"
              >
                browse projects →
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
