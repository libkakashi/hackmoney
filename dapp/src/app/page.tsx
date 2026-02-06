import Link from 'next/link';
import {
  BadgeCheck,
  Droplets,
  Scale,
  Shield,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {Container} from '~/components/layout/container';

export default function Home() {
  return (
    <div>
      {/* Hero - Terminal style */}
      <section className="py-24 md:py-32">
        <Container size="md">
          <div className="max-w-2xl">
            {/* Command prompt style */}
            <div className="text-dim text-sm mb-6">
              ~/nyx <span className="text-green">$</span> cat readme.md
            </div>

            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-8">
              the fairest token launchpad
              <br />
              <span className="text-green">on earth</span>
            </h1>

            <div className="text-dim leading-relaxed mb-12 max-w-lg">
              <p className="mb-4">
                transparent. mev resistance. market driven price discovery
              </p>
              <p>
                continuous clearing auctions. powered by uniswap v4.
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
        </Container>
      </section>

      {/* Stats bar */}
      <section className="border-y border-border bg-card">
        <Container>
          <div className="grid grid-cols-3 divide-x divide-border">
            <div className="py-8 px-4 text-center">
              <div className="text-3xl font-bold text-green tabular-nums">
                1,247
              </div>
              <div className="text-dim text-sm mt-1">tokens launched</div>
            </div>
            <div className="py-8 px-4 text-center">
              <div className="text-3xl font-bold text-purple tabular-nums">
                $42.5M
              </div>
              <div className="text-dim text-sm mt-1">total raised</div>
            </div>
            <div className="py-8 px-4 text-center">
              <div className="text-3xl font-bold tabular-nums">89,421</div>
              <div className="text-dim text-sm mt-1">participants</div>
            </div>
          </div>
        </Container>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-border">
        <Container size="lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-5">
            <div className="flex items-start gap-3">
              <Scale className="h-4 w-4 text-green shrink-0 mt-0.5" />
              <div>
                <div className="text-green font-medium mb-1">
                  Real Fair Launches
                </div>
                <p className="text-dim text-sm leading-relaxed">
                  Continuous Clearing Auction
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
                  Uniswap V4 pool created automatically at the final clearing price
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
                  no fixed launch price, no VC allocation, pure market demand
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* How CCA works */}
      <section className="py-20 border-t border-border">
        <Container size="md">
          <div className="text-dim text-sm mb-6">
            ~/nyx <span className="text-green">$</span> nyx explain
            --cca
          </div>

          <h2 className="text-xl md:text-2xl font-bold mb-2">
            How Continuous Clearing Auction (CCA) Actually Works
          </h2>
          <p className="text-dim text-sm mb-10">
            Fair price discovery. No sniping. Instant liquidity — in 5 simple
            steps.
          </p>

          <div className="border border-border bg-card p-6">
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="text-green w-8 shrink-0 font-bold">01.</div>
                <div>
                  <div className="font-bold mb-1">Token & Auction Created</div>
                  <p className="text-dim text-sm leading-relaxed">
                    Creator sets name, symbol, description. Deploys token + CCA
                    auction in one transaction.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-green w-8 shrink-0 font-bold">02.</div>
                <div>
                  <div className="font-bold mb-1">Bidding Phase Begins</div>
                  <p className="text-dim text-sm leading-relaxed">
                    Anyone commits USDC. Every bid is automatically spread evenly
                    across all remaining blocks of the auction duration.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-green w-8 shrink-0 font-bold">03.</div>
                <div>
                  <div className="font-bold mb-1">Continuous Price Discovery</div>
                  <p className="text-dim text-sm leading-relaxed">
                    Each block: all active bids are aggregated. A uniform
                    clearing price is calculated and updated in real time.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-green w-8 shrink-0 font-bold">04.</div>
                <div>
                  <div className="font-bold mb-1">Auction Ends</div>
                  <p className="text-dim text-sm leading-relaxed">
                    At the end of the fixed duration, final clearing price is
                    locked. No last-second sniping or front-running possible.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-green w-8 shrink-0 font-bold">05.</div>
                <div>
                  <div className="font-bold mb-1">Liquidity Bootstrapped</div>
                  <p className="text-dim text-sm leading-relaxed">
                    Raised USDC + unsold tokens automatically migrate to a
                    Uniswap v4 pool initialized exactly at the final clearing
                    price. Trading begins instantly. Liquidity is locked — no rug
                    risk.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 pt-6 mt-6 border-t border-border">
                <div className="text-purple w-8 shrink-0">✦</div>
                <div className="flex-1">
                  <div className="font-bold mb-2">optional — secure your ENS</div>
                  <p className="text-dim text-sm mb-4">
                    one-click purchase yourtoken.eth matching your ticker.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-start gap-3">
                      <Shield className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-cyan-500 font-medium mb-1 text-sm">
                          anti-impersonation
                        </div>
                        <p className="text-dim text-xs leading-relaxed">
                          tickers aren&apos;t unique — own your name on-chain
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <BadgeCheck className="h-4 w-4 text-green shrink-0 mt-0.5" />
                      <div>
                        <div className="text-green font-medium mb-1 text-sm">
                          verified badge
                        </div>
                        <p className="text-dim text-xs leading-relaxed">
                          green checkmark shown on all launchpad pages
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-4 w-4 text-yellow shrink-0 mt-0.5" />
                      <div>
                        <div className="text-yellow font-medium mb-1 text-sm">
                          trust signal
                        </div>
                        <p className="text-dim text-xs leading-relaxed">
                          buyers feel confident with verified projects
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Comparison table */}
      <section className="py-20 border-t border-border">
        <Container size="xl">
          <div className="text-dim text-sm mb-8">
            ~/nyx <span className="text-green">$</span> nyx compare
            --launchpads
          </div>

          <div className="overflow-x-auto border border-border bg-card">
            <table className="w-full text-sm min-w-[900px]">
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
                  <td className="p-4 text-dim">Moderate — whale oversubscription</td>
                  <td className="p-4 text-dim">High - MEV, frontrunning bots</td>
                  <td className="p-4 text-green font-medium bg-green/5">
                    Negligible
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="p-4 font-medium">Liquidity After Launch</td>
                  <td className="p-4 text-dim">Delayed / manual LP</td>
                  <td className="p-4 text-dim">only graduated tokens move to AMM</td>
                  <td className="p-4 text-green font-medium bg-green/5">
                    Instant liquidity bootstrapping to UniV4
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      {/* Nyx Agent - Mock chat interface */}
      <section className="py-12 border-t border-border">
        <Container size="md">
          <div className="text-dim text-sm mb-4">
            ~/nyx <span className="text-green">$</span> nyx agent
            --on-chain
          </div>

          <h2 className="text-xl md:text-2xl font-bold mb-2 text-center">
            Nyx Agent - Your personal onchain assistant
          </h2>
          <p className="text-dim text-sm text-center mb-6 max-w-xl mx-auto">
            ask questions, swap tokens, place bids, launch tokens in plain
            english.
          </p>

          <div className="border border-border bg-card overflow-hidden max-w-2xl mx-auto">
            {/* Chat header */}
            <div className="border-b border-border px-4 py-2 flex items-center gap-2">
              <div className="w-2 h-2 bg-green pulse-soft" />
              <span className="text-sm font-medium">nyx agent v1.0</span>
              <span className="text-dim text-xs ml-auto">on-chain</span>
            </div>

            {/* Message exchanges */}
            <div className="p-3 md:p-4 space-y-4">
              {/* User 1 */}
              <div className="flex justify-end">
                <div className="max-w-[85%] text-right">
                  <div className="text-purple text-xs mb-1">&gt; you</div>
                  <div className="bg-purple/10 border border-purple/30 px-3 py-1.5 text-sm">
                    Show me the fastest filling CCA auctions right now
                  </div>
                </div>
              </div>

              {/* Nyx 1 */}
              <div className="flex justify-start">
                <div className="max-w-[85%]">
                  <div className="text-green text-xs mb-1">&gt; nyx agent</div>
                  <div className="bg-green/5 border border-green/30 px-3 py-1.5 text-sm text-green">
                    <div className="mb-1">Top auctions by fill rate:</div>
                    <div className="space-y-0.5 text-xs text-dim">
                      <div>
                        1. $PRISE — 67% filled · +12% clearing uplift · 47
                        bidders
                      </div>
                      <div>
                        2. $MMIS — 45% filled · +8% clearing uplift · 156
                        bidders
                      </div>
                      <div>
                        3. $ALFA — 32% filled · +5% clearing uplift · 89
                        bidders
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* User 2 */}
              <div className="flex justify-end">
                <div className="max-w-[85%] text-right">
                  <div className="text-purple text-xs mb-1">&gt; you</div>
                  <div className="bg-purple/10 border border-purple/30 px-3 py-1.5 text-sm">
                    Swap 0.5 ETH to USDC and bid max on the top one
                  </div>
                </div>
              </div>

              {/* Nyx 2 */}
              <div className="flex justify-start">
                <div className="max-w-[85%]">
                  <div className="text-green text-xs mb-1">&gt; nyx agent</div>
                  <div className="bg-green/5 border border-green/30 px-3 py-1.5 text-sm text-green">
                    <div className="mb-1">Route: ETH → USDC (Uniswap)</div>
                    <div className="text-dim text-xs mb-1">
                      Est. 0.5 ETH → ~1,850 USDC · bid on $PRISE
                    </div>
                    <div className="pt-2 border-t border-green/30 text-green font-medium">
                      Review & sign →
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Input area with blinking cursor */}
            <div className="border-t border-border px-4 py-2 flex items-center gap-2">
              <span className="text-dim text-sm">$</span>
              <span className="text-green text-sm">ask agent...</span>
              <span className="w-2 h-4 bg-green blink ml-1" />
            </div>
          </div>

          <p className="text-dim text-sm text-center mt-4">
            click the agent icon in the bottom-right to try it live
          </p>
        </Container>
      </section>

      {/* What People Are Saying */}
      <section className="py-20 border-t border-border">
        <Container size="xl">
          <div className="text-dim text-sm mb-6">
            ~/nyx <span className="text-green">$</span> nyx testimonials
          </div>

          <h2 className="text-xl md:text-2xl font-bold mb-2">
            What People Are Saying
          </h2>
          <p className="text-dim text-sm mb-10">
            Real voices from the community about Nyx and Continuous Clearing
            Auctions
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Quote 1 */}
            <div className="terminal-card-hover border border-border bg-card p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 shrink-0 border border-border flex items-center justify-center text-purple font-bold text-sm">
                  D
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-sm">DegenSniperNoMore</span>
                    <BadgeCheck className="h-4 w-4 text-green shrink-0" />
                  </div>
                  <p className="text-dim text-xs mt-0.5">@DegenSniperNoMore · 14h ago</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed mb-4">
                Finally a launchpad where snipers and MEV bots can&apos;t eat my
                lunch. Bid early on Nyx and actually get rewarded.{' '}
                <span className="text-green">Game changer.</span>
              </p>
              <div className="flex items-center gap-4 text-dim text-xs">
                <span>342 likes</span>
                <span>87 RTs</span>
              </div>
            </div>

            {/* Quote 2 */}
            <div className="terminal-card-hover border border-border bg-card p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 shrink-0 border border-border flex items-center justify-center text-purple font-bold text-sm">
                  T
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-sm">TokenBuilderETH</span>
                    <BadgeCheck className="h-4 w-4 text-green shrink-0" />
                  </div>
                  <p className="text-dim text-xs mt-0.5">@TokenBuilderETH · 3d ago</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed mb-4">
                Launched my token on Nyx yesterday — one tx, clean ENS, green
                check, instant Uniswap v4 pool. No rugs possible.{' '}
                <span className="text-green">This is how fair launches should work.</span>
              </p>
              <div className="flex items-center gap-4 text-dim text-xs">
                <span>521 likes</span>
                <span>142 RTs</span>
              </div>
            </div>

            {/* Quote 3 */}
            <div className="terminal-card-hover border border-border bg-card p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 shrink-0 border border-border flex items-center justify-center text-purple font-bold text-sm">
                  O
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-sm">OnchainAlphaHunter</span>
                    <BadgeCheck className="h-4 w-4 text-green shrink-0" />
                  </div>
                  <p className="text-dim text-xs mt-0.5">@OnchainAlphaHunter · 1d ago</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed mb-4">
                Nyx Agent just found me a 7x velocity auction and swapped + bid
                in one flow. Signed once.{' '}
                <span className="text-green">Insane alpha tool.</span>
              </p>
              <div className="flex items-center gap-4 text-dim text-xs">
                <span>289 likes</span>
                <span>64 RTs</span>
              </div>
            </div>

            {/* Quote 4 */}
            <div className="terminal-card-hover border border-border bg-card p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 shrink-0 border border-border flex items-center justify-center text-purple font-bold text-sm">
                  D
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-sm">DeFiResearchGuy</span>
                    <BadgeCheck className="h-4 w-4 text-green shrink-0" />
                  </div>
                  <p className="text-dim text-xs mt-0.5">@DeFiResearchGuy · 2d ago</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed mb-4">
                Bonding curves are dead. CCA on Nyx is the real deal —
                continuous fair price discovery, no timing games, locked
                liquidity.{' '}
                <span className="text-green">Institutions will love this too.</span>
              </p>
              <div className="flex items-center gap-4 text-dim text-xs">
                <span>198 likes</span>
                <span>53 RTs</span>
              </div>
            </div>

            {/* Quote 5 */}
            <div className="terminal-card-hover border border-border bg-card p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 shrink-0 border border-border flex items-center justify-center text-purple font-bold text-sm">
                  E
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-sm">EarlyBirdGetsTheWorm</span>
                    <BadgeCheck className="h-4 w-4 text-green shrink-0" />
                  </div>
                  <p className="text-dim text-xs mt-0.5">@EarlyBirdGetsTheWorm · 18h ago</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed mb-4">
                Bidded early on a Nyx auction and got noticeably better fill than
                latecomers. Math doesn&apos;t lie.{' '}
                <span className="text-green">Early = advantage.</span>
              </p>
              <div className="flex items-center gap-4 text-dim text-xs">
                <span>411 likes</span>
                <span>96 RTs</span>
              </div>
            </div>

            {/* Quote 6 */}
            <div className="terminal-card-hover border border-border bg-card p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 shrink-0 border border-border flex items-center justify-center text-green font-bold text-sm">
                  Z
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-sm">ZeroFeeChad</span>
                    <BadgeCheck className="h-4 w-4 text-green shrink-0" />
                  </div>
                  <p className="text-dim text-xs mt-0.5">@ZeroFeeChad · 4d ago</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed mb-4">
                No protocol fees, no bullshit, just pure on-chain fairness. Nyx
                is what launchpads should have been from day one.
              </p>
              <div className="flex items-center gap-4 text-dim text-xs">
                <span>673 likes</span>
                <span>184 RTs</span>
              </div>
            </div>
          </div>

          <p className="text-center text-dim text-sm mt-10">
            <Link
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green hover:underline"
            >
              Join the conversation on X →
            </Link>
          </p>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-border">
        <Container size="sm">
          <div className="border border-border bg-card p-8 md:p-12">
            <div className="text-dim text-sm mb-6">
              ~/nyx <span className="text-green">$</span> nyx init
            </div>

            <div className="text-xl md:text-2xl font-bold mb-4">
              ready to launch?
            </div>

            <p className="text-dim mb-8">
              create a fair token launch in under 30 seconds.
              <br />
              no coding required.
            </p>

            <Link
              href="/launch"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green text-background font-bold hover:bg-green/90 transition-colors"
            >
              launch
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}
