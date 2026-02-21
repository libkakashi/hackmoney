import Link from 'next/link';
import {Droplets, Scale, TrendingUp} from 'lucide-react';
import {Container} from '~/components/layout/container';

export default function Home() {
  return (
    <div>
      {/* Hero - Terminal style */}
      <section className="py-24 md:py-32">
        <Container size="lg">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="max-w-2xl">
              {/* Command prompt style */}
              <div className="text-dim text-sm mb-6">
                ~/nyx <span className="text-green">$</span> cat readme.md
              </div>

              <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-8">
                incentivize open-source
                <br />
                <span className="text-green">with tokens</span>
              </h1>

              <div className="text-dim leading-relaxed mb-12 max-w-lg">
                <p className="mb-4">
                  crowdfund bounties for issues. reward contributors with liquid
                  tokens.
                </p>
                <p>
                  anyone can add rewards. contributors split the payout. back
                  projects you believe in early.
                </p>
              </div>

              {/* Actions as terminal commands */}
              <div className="space-y-3">
                <Link
                  href="/launch"
                  className="flex items-center gap-3 p-4 border border-border hover:border-green hover:bg-green/5 transition-colors group"
                >
                  <span className="text-green">$</span>
                  <span className="group-hover:text-green transition-colors">
                    nyx launch --project-token
                  </span>
                  <span className="text-dim ml-auto">launch project →</span>
                </Link>

                <Link
                  href="/discover"
                  className="flex items-center gap-3 p-4 border border-border hover:border-yellow hover:bg-yellow/5 transition-colors group"
                >
                  <span className="text-yellow">$</span>
                  <span className="group-hover:text-yellow transition-colors">
                    nyx list --projects
                  </span>
                  <span className="text-dim ml-auto">browse projects →</span>
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Stats bar */}
      <section className="border-y border-border bg-card">
        <Container size="xl">
          <div className="grid grid-cols-3 divide-x divide-border">
            <div className="py-8 text-center">
              <div className="text-3xl font-bold text-green tabular-nums">
                1,247
              </div>
              <div className="text-dim text-sm mt-1">projects launched</div>
            </div>
            <div className="py-8 text-center">
              <div className="text-3xl font-bold text-yellow tabular-nums">
                $42.5M
              </div>
              <div className="text-dim text-sm mt-1">
                in rewards distributed
              </div>
            </div>
            <div className="py-8 text-center">
              <div className="text-3xl font-bold tabular-nums">89,421</div>
              <div className="text-dim text-sm mt-1">contributors</div>
            </div>
          </div>
        </Container>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-border mt-16">
        <Container size="lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-5">
            <div className="flex items-start gap-3">
              <Scale className="h-4 w-4 text-green shrink-0 mt-0.5" />
              <div>
                <div className="text-green font-medium mb-1">
                  Crowdfunded Bounties
                </div>
                <p className="text-dim text-sm leading-relaxed">
                  Anyone can add rewards to issues. Contributors who help
                  resolve them split the bounty.
                  <br />
                  Faster fixes • Better incentives
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Droplets className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-cyan-500 font-medium mb-1">
                  Instant Liquidity
                </div>
                <p className="text-dim text-sm leading-relaxed">
                  Tokens are tradable immediately. Contributors can hold or sell
                  their rewards as they choose.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <TrendingUp className="h-4 w-4 text-yellow shrink-0 mt-0.5" />
              <div>
                <div className="text-yellow font-medium mb-1">
                  Bet On Open Source
                </div>
                <p className="text-dim text-sm leading-relaxed">
                  Back projects early and own a stake in their growth. If the
                  project takes off, so does your position.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Comparison table */}
      <section className="py-20 border-t border-border">
        <Container size="lg">
          <div className="text-dim text-sm mb-4">
            ~/nyx <span className="text-green">$</span> nyx compare
            --incentive-models
          </div>

          <h2 className="text-xl md:text-2xl font-bold mb-2">
            Why token bounties work better
          </h2>
          <p className="text-dim text-sm mb-8 max-w-xl">
            traditional bounty platforms are broken. token-based bounties align
            incentives and create sustainable value.
          </p>

          <div className="overflow-x-auto border border-border bg-card">
            <table className="w-full text-sm min-w-225">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-medium"> </th>
                  <th className="text-left p-4 font-medium text-dim whitespace-nowrap">
                    Traditional Bounties
                  </th>
                  <th className="text-left p-4 font-medium text-dim whitespace-nowrap">
                    GitHub Sponsors
                  </th>
                  <th className="text-left p-4 font-medium text-green bg-green/5 whitespace-nowrap">
                    Nyx (Token Bounties)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="p-4 font-medium">Who Can Fund</td>
                  <td className="p-4 text-dim">Project owners only</td>
                  <td className="p-4 text-dim">Individual sponsors only</td>
                  <td className="p-4 text-green font-medium bg-green/5">
                    Anyone - crowdfunded bounties
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="p-4 font-medium">Reward Splitting</td>
                  <td className="p-4 text-dim">Manual, complex payouts</td>
                  <td className="p-4 text-dim">Not designed for bounties</td>
                  <td className="p-4 text-green font-medium bg-green/5">
                    Automatic split across helpers
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="p-4 font-medium">Reward Liquidity</td>
                  <td className="p-4 text-dim">Fiat only - slow payouts</td>
                  <td className="p-4 text-dim">Fiat only - monthly payouts</td>
                  <td className="p-4 text-green font-medium bg-green/5">
                    Instant - tradable tokens
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="p-4 font-medium">Contributor Upside</td>
                  <td className="p-4 text-dim">None - fixed payment</td>
                  <td className="p-4 text-dim">None - fixed payment</td>
                  <td className="p-4 text-green font-medium bg-green/5">
                    Token value grows with project
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="p-4 font-medium">Supporter Upside</td>
                  <td className="p-4 text-dim">None - donation only</td>
                  <td className="p-4 text-dim">None - donation only</td>
                  <td className="p-4 text-green font-medium bg-green/5">
                    Back early, own a stake in growth
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      {/* How it works - as a log output */}
      <section className="py-20 border-t border-border">
        <Container size="lg">
          <div className="text-dim text-sm mb-4">
            ~/nyx <span className="text-green">$</span> nyx explain --verbose
          </div>

          <h2 className="text-xl md:text-2xl font-bold mb-2">How it works</h2>
          <p className="text-dim text-sm mb-8 max-w-xl">
            three steps from project launch to contributor rewards.
          </p>

          <div className="border border-border bg-card p-6">
            <div className="text-dim text-xs mb-6">[output]</div>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="text-green w-8 shrink-0">01.</div>
                <div>
                  <div className="font-bold mb-1">launch project token</div>
                  <div className="text-dim text-sm">
                    deploy a token in one transaction. set name, symbol, and
                    description. no coding required.
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-green w-8 shrink-0">02.</div>
                <div>
                  <div className="font-bold mb-1">initial distribution</div>
                  <div className="text-dim text-sm pr-16">
                    supporters and contributors participate in a 30-minute fair
                    launch. everyone gets equal access. no whales, no VCs, no
                    bots.
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-green w-8 shrink-0">03.</div>
                <div>
                  <div className="font-bold mb-1">crowdfund issue bounties</div>
                  <div className="text-dim text-sm">
                    tokens become instantly tradable with built-in liquidity.
                    projects, users, or anyone can add token bounties to issues.
                    contributors split rewards for resolving them. early
                    believers get to own a piece of what they helped build.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Ramen - Mock chat interface */}
      <section className="py-20 border-t border-border">
        <Container size="lg">
          <div className="text-dim text-sm mb-4">
            ~/nyx <span className="text-green">$</span> nyx ramen --on-chain
          </div>

          <h2 className="text-xl md:text-2xl font-bold mb-2">Meet Ramen</h2>
          <p className="text-dim text-sm mb-8 max-w-xl">
            he can help you discover tokens, place bids, trade for you, or just
            answer your questions.
          </p>

          <div className="border border-border bg-card overflow-hidden">
            {/* Chat header */}
            <div className="border-b border-border px-4 py-2 flex items-center gap-2">
              <img
                src="/mascot/mascot.gif"
                alt="System"
                className="w-8 h-8 object-contain"
              />
              <span className="text-sm font-medium">ramen v1.0</span>
              <span className="text-dim text-xs ml-auto">on-chain</span>
            </div>

            {/* Message exchanges */}
            <div className="p-3 md:p-4 space-y-4">
              {/* User 1 */}
              <div className="flex justify-end">
                <div className="max-w-[85%] text-right">
                  <div className="text-foreground/60 text-xs mb-1">
                    &gt; you
                  </div>
                  <div className="bg-foreground/5 border border-foreground/15 px-3 py-1.5 text-sm">
                    I have some DAI, can you get me into $PRISE?
                  </div>
                </div>
              </div>

              {/* Ramen 1 */}
              <div className="flex justify-start">
                <div className="max-w-[85%]">
                  <div className="text-green text-xs mb-1">&gt; ramen</div>
                  <div className="bg-green/5 border border-green/30 px-3 py-1.5 text-sm text-green">
                    <div className="mb-1">
                      you&apos;ve got 2,400 DAI. $PRISE auction takes USDC, so
                      I&apos;ll route it:
                    </div>
                    <div className="text-xs text-dim space-y-0.5">
                      <div>DAI → USDC → bid on $PRISE</div>
                      <div>~2,398 USDC after swap fees</div>
                    </div>
                    <div className="text-dim text-xs mt-1">
                      want me to go ahead?
                    </div>
                  </div>
                </div>
              </div>

              {/* User 2 */}
              <div className="flex justify-end">
                <div className="max-w-[85%] text-right">
                  <div className="text-foreground/60 text-xs mb-1">
                    &gt; you
                  </div>
                  <div className="bg-foreground/5 border border-foreground/15 px-3 py-1.5 text-sm">
                    do it
                  </div>
                </div>
              </div>

              {/* Ramen 2 */}
              <div className="flex justify-start">
                <div className="max-w-[85%]">
                  <div className="text-green text-xs mb-1">&gt; ramen</div>
                  <div className="bg-green/5 border border-green/30 px-3 py-1.5 text-sm text-green">
                    <div className="space-y-1 text-xs text-dim">
                      <div>
                        <span className="text-green">&#10003;</span> approved
                        DAI
                      </div>
                      <div>
                        <span className="text-green">&#10003;</span> swapped
                        2,400 DAI → 2,398 USDC
                      </div>
                      <div>
                        <span className="text-green">&#10003;</span> bid placed
                        on $PRISE
                      </div>
                    </div>
                    <div className="text-green text-xs mt-1">
                      you&apos;re in. 2,398 USDC committed to the auction.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Input area with blinking cursor */}
            <div className="border-t border-border px-4 py-2 flex items-center gap-2">
              <span className="text-dim text-sm">$</span>
              <span className="text-green text-sm">ask ramen...</span>
              <span className="w-2 h-4 bg-green blink ml-1" />
            </div>
          </div>

          <p className="text-dim text-sm mt-4">
            click the agent icon in the bottom-right to try it live
          </p>
        </Container>
      </section>

      {/* Live auctions */}
      <section className="py-20 border-t border-border">
        <Container size="lg">
          <div className="text-dim text-sm mb-4">
            ~/nyx <span className="text-green">$</span> nyx list --active
          </div>

          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl md:text-2xl font-bold mb-2">
                Live auctions
              </h2>
              <p className="text-dim text-sm max-w-xl">
                tokens currently accepting bids.
              </p>
            </div>
            <Link
              href="/discover?phase=live"
              className="text-dim hover:text-foreground text-sm"
            >
              view all →
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Auction card 1 */}
            <div className="border border-border bg-card p-5 hover:border-green/50 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 border border-border flex items-center justify-center text-yellow font-bold">
                    PR
                  </div>
                  <div>
                    <div className="font-bold">Pepe Rising</div>
                    <div className="text-dim text-sm">$PRISE</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-green text-xs">
                  <div className="w-1.5 h-1.5 bg-green pulse-soft" />
                  live
                </div>
              </div>

              <div className="h-1 bg-border mb-4">
                <div className="h-full bg-green" style={{width: '25%'}} />
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-dim">47 bidders</span>
                <span>
                  <span className="text-green">12.5</span> ETH raised
                </span>
              </div>
            </div>

            <div className="border border-border bg-card p-5 hover:border-green/50 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 border border-border flex items-center justify-center text-yellow font-bold">
                    PR
                  </div>
                  <div>
                    <div className="font-bold">Pepe Rising</div>
                    <div className="text-dim text-sm">$PRISE</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-green text-xs">
                  <div className="w-1.5 h-1.5 bg-green pulse-soft" />
                  live
                </div>
              </div>

              <div className="h-1 bg-border mb-4">
                <div className="h-full bg-green" style={{width: '25%'}} />
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-dim">47 bidders</span>
                <span>
                  <span className="text-green">12.5</span> ETH raised
                </span>
              </div>
            </div>

            <div className="border border-border bg-card p-5 hover:border-green/50 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 border border-border flex items-center justify-center text-yellow font-bold">
                    PR
                  </div>
                  <div>
                    <div className="font-bold">Pepe Rising</div>
                    <div className="text-dim text-sm">$PRISE</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-green text-xs">
                  <div className="w-1.5 h-1.5 bg-green pulse-soft" />
                  live
                </div>
              </div>

              <div className="h-1 bg-border mb-4">
                <div className="h-full bg-green" style={{width: '25%'}} />
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-dim">47 bidders</span>
                <span>
                  <span className="text-green">12.5</span> ETH raised
                </span>
              </div>
            </div>

            {/* Auction card 2 */}
            <div className="border border-border bg-card p-5 hover:border-green/50 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 border border-border flex items-center justify-center text-yellow font-bold">
                    MM
                  </div>
                  <div>
                    <div className="font-bold">Moon Mission</div>
                    <div className="text-dim text-sm">$MMIS</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-green text-xs">
                  <div className="w-1.5 h-1.5 bg-green pulse-soft" />
                  live
                </div>
              </div>

              <div className="h-1 bg-border mb-4">
                <div className="h-full bg-green" style={{width: '67%'}} />
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-dim">156 bidders</span>
                <span>
                  <span className="text-green">48.0</span> ETH raised
                </span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-border">
        <Container size="lg">
          <div className="border border-green/30 bg-green/5 p-8 md:p-12">
            <div className="text-dim text-sm mb-4">
              ~/nyx <span className="text-green">$</span> nyx init
            </div>

            <h2 className="text-3xl md:text-4xl font-bold mb-8">
              ready to launch?
            </h2>
            <p className="text-dim mb-10 max-w-lg">
              create a fair token launch in under 30 seconds. no coding
              required.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/launch"
                className="inline-flex items-center gap-2 px-6 py-3 border border-green text-green font-bold hover:bg-green/10 transition-colors"
              >
                <span>$</span>
                <span>nyx launch --new-token</span>
              </Link>

              <Link
                href="/discover"
                className="inline-flex items-center gap-2 px-6 py-3 border border-border hover:border-yellow hover:text-yellow transition-colors"
              >
                browse active auctions →
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
