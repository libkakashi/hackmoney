import Link from 'next/link';
import { Droplets, Scale, TrendingUp } from 'lucide-react';
import { Container } from '~/components/layout/container';


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
                fair launches
                <br />
                <span className="text-green">done right</span>
              </h1>

              <div className="text-dim leading-relaxed mb-12 max-w-lg">
                <p className="mb-4">
                  continuous clearing auctions eliminate front-running and
                  sniping. everyone pays the same price. simple.
                </p>
                <p>powered by uniswap v4.</p>
              </div>

              {/* Actions as terminal commands */}
              <div className="space-y-3">
                <Link
                  href="/launch"
                  className="flex items-center gap-3 p-4 border border-border hover:border-green hover:bg-green/5 transition-colors group"
                >
                  <span className="text-green">$</span>
                  <span className="group-hover:text-green transition-colors">
                    nyx launch --new-token
                  </span>
                  <span className="text-dim ml-auto">create auction →</span>
                </Link>

                <Link
                  href="/discover"
                  className="flex items-center gap-3 p-4 border border-border hover:border-purple hover:bg-purple/5 transition-colors group"
                >
                  <span className="text-purple">$</span>
                  <span className="group-hover:text-purple transition-colors">
                    nyx list --active
                  </span>
                  <span className="text-dim ml-auto">browse tokens →</span>
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
              <div className="text-dim text-sm mt-1">tokens launched</div>
            </div>
            <div className="py-8 text-center">
              <div className="text-3xl font-bold text-purple tabular-nums">
                $42.5M
              </div>
              <div className="text-dim text-sm mt-1">total raised</div>
            </div>
            <div className="py-8 text-center">
              <div className="text-3xl font-bold tabular-nums">89,421</div>
              <div className="text-dim text-sm mt-1">participants</div>
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
                  Real Fair Launches
                </div>
                <p className="text-dim text-sm leading-relaxed">
                  Continuous Clearing Auctions
                  <br />
                  No snipers • No front-running • No MEV
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Droplets className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-cyan-500 font-medium mb-1">
                  Instant Liquidity Bootstrapping
                </div>
                <p className="text-dim text-sm leading-relaxed">
                  Uniswap V4 pool created automatically at the final clearing
                  price.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <TrendingUp className="h-4 w-4 text-purple shrink-0 mt-0.5" />
              <div>
                <div className="text-purple font-medium mb-1">
                  Market driven price discovery
                </div>
                <p className="text-dim text-sm leading-relaxed">
                  No fixed launch price, no VC allocation, pure market demand.
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
            ~/nyx <span className="text-green">$</span> nyx compare --launchpads
          </div>

          <h2 className="text-xl md:text-2xl font-bold mb-2">
            How Nyx compares
          </h2>
          <p className="text-dim text-sm mb-8 max-w-xl">
            traditional launch methods are broken. here&apos;s why.
          </p>

          <div className="overflow-x-auto border border-border bg-card">
            <table className="w-full text-sm min-w-225">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-medium"> </th>
                  <th className="text-left p-4 font-medium text-dim whitespace-nowrap">
                    Fixed-Price Sales (ICO)
                  </th>
                  <th className="text-left p-4 font-medium text-dim whitespace-nowrap">
                    Bonding Curves (pump.fun)
                  </th>
                  <th className="text-left p-4 font-medium text-green bg-green/5 whitespace-nowrap">
                    Nyx (CCA)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="p-4 font-medium">Sniper & Bot Protection</td>
                  <td className="p-4 text-dim">Weak - FCFS races, gas wars</td>
                  <td className="p-4 text-dim">Weak — filled with snipers</td>
                  <td className="p-4 text-green font-medium bg-green/5">
                    Strong - bids spread over entire duration
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="p-4 font-medium">Price Discovery</td>
                  <td className="p-4 text-dim">None (price fixed by VCs)</td>
                  <td className="p-4 text-dim">Path-dependent curve</td>
                  <td className="p-4 text-green font-medium bg-green/5">
                    Continuous & market-driven
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="p-4 font-medium">Manipulation Risk</td>
                  <td className="p-4 text-dim">
                    Moderate — whale oversubscription
                  </td>
                  <td className="p-4 text-dim">
                    High - MEV, frontrunning bots
                  </td>
                  <td className="p-4 text-green font-medium bg-green/5">
                    Negligible
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="p-4 font-medium">Liquidity After Launch</td>
                  <td className="p-4 text-dim">Delayed / manual LP</td>
                  <td className="p-4 text-dim">
                    only graduated tokens move to AMM
                  </td>
                  <td className="p-4 text-green font-medium bg-green/5">
                    Instant liquidity bootstrapping to UniV4
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
            three steps from token creation to live trading.
          </p>

          <div className="border border-border bg-card p-6">
            <div className="text-dim text-xs mb-6">[output]</div>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="text-green w-8 shrink-0">01.</div>
                <div>
                  <div className="font-bold mb-1">create token</div>
                  <div className="text-dim text-sm">
                    creators set name, symbol, and auction parameters.
                    everything deploys in one transaction.
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-green w-8 shrink-0">02.</div>
                <div>
                  <div className="font-bold mb-1">run auction</div>
                  <div className="text-dim text-sm pr-16">
                    bidders commit funds for the first 24 hours. clearing price
                    updates every block. no one gets front-run or sniped.
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-green w-8 shrink-0">03.</div>
                <div>
                  <div className="font-bold mb-1">create pool</div>
                  <div className="text-dim text-sm">
                    the auction ends. a uniswap v4 pool initializes at the final
                    clearing price. trading begins.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Glitch - Mock chat interface */}
      <section className="py-20 border-t border-border">
        <Container size="lg">
          <div className="text-dim text-sm mb-4">
            ~/nyx <span className="text-green">$</span> nyx glitch --on-chain
          </div>

          <h2 className="text-xl md:text-2xl font-bold mb-2">Meet Glitch</h2>
          <p className="text-dim text-sm mb-8 max-w-xl">
            he can help you discover tokens, place bids, trade for you, or just
            answer your questions.
          </p>

          <div className="border border-border bg-card overflow-hidden">
            {/* Chat header */}
            <div className="border-b border-border px-4 py-2 flex items-center gap-2">
              <img src="/mascot/mascot.gif" alt="System" className="w-8 h-8 object-contain" />
              <span className="text-sm font-medium">glitch v1.0</span>
              <span className="text-dim text-xs ml-auto">on-chain</span>
            </div>

            {/* Message exchanges */}
            <div className="p-3 md:p-4 space-y-4">
              {/* User 1 */}
              <div className="flex justify-end">
                <div className="max-w-[85%] text-right">
                  <div className="text-purple text-xs mb-1">&gt; you</div>
                  <div className="bg-purple/10 border border-purple/30 px-3 py-1.5 text-sm">
                    I have some DAI, can you get me into $PRISE?
                  </div>
                </div>
              </div>

              {/* Glitch 1 */}
              <div className="flex justify-start">
                <div className="max-w-[85%]">
                  <div className="text-green text-xs mb-1">&gt; glitch</div>
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
                  <div className="text-purple text-xs mb-1">&gt; you</div>
                  <div className="bg-purple/10 border border-purple/30 px-3 py-1.5 text-sm">
                    do it
                  </div>
                </div>
              </div>

              {/* Glitch 2 */}
              <div className="flex justify-start">
                <div className="max-w-[85%]">
                  <div className="text-green text-xs mb-1">&gt; glitch</div>
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
              <span className="text-green text-sm">ask glitch...</span>
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
                  <div className="w-10 h-10 border border-border flex items-center justify-center text-purple font-bold">
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
                <div className="h-full bg-green" style={{ width: '25%' }} />
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
                  <div className="w-10 h-10 border border-border flex items-center justify-center text-purple font-bold">
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
                <div className="h-full bg-green" style={{ width: '25%' }} />
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
                  <div className="w-10 h-10 border border-border flex items-center justify-center text-purple font-bold">
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
                <div className="h-full bg-green" style={{ width: '25%' }} />
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
                  <div className="w-10 h-10 border border-border flex items-center justify-center text-purple font-bold">
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
                <div className="h-full bg-green" style={{ width: '67%' }} />
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

            <h2 className="text-3xl md:text-4xl font-bold mb-3">
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
                className="inline-flex items-center gap-2 px-6 py-3 border border-border hover:border-purple hover:text-purple transition-colors"
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
