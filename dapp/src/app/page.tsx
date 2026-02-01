import Link from 'next/link';
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
              ~/timelock <span className="text-green">$</span> cat readme.md
            </div>

            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-8">
              fair token launches
              <br />
              <span className="text-green">without the bullshit</span>
            </h1>

            <div className="text-dim leading-relaxed mb-12 max-w-lg">
              <p className="mb-4">
                continuous clearing auctions eliminate front-running and
                sniping. everyone pays the same price. simple.
              </p>
              <p>
                powered by uniswap v4. pool created automatically when auction
                ends.
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
                  timelock launch --new-token
                </span>
                <span className="text-dim ml-auto">create auction →</span>
              </Link>

              <Link
                href="/discover"
                className="flex items-center gap-3 p-4 border border-border hover:border-purple hover:bg-purple/5 transition-colors group"
              >
                <span className="text-purple">$</span>
                <span className="group-hover:text-purple transition-colors">
                  timelock list --active
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

      {/* How it works - as a log output */}
      <section className="py-20">
        <Container size="md">
          <div className="text-dim text-sm mb-8">
            ~/timelock <span className="text-green">$</span> timelock explain
            --verbose
          </div>

          <div className="border border-border bg-card p-6">
            <div className="text-dim text-xs mb-6">[output]</div>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="text-green w-8 shrink-0">01.</div>
                <div>
                  <div className="font-bold mb-1">create token</div>
                  <div className="text-dim text-sm">
                    set name, symbol, and auction parameters. deploy with one
                    transaction.
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-green w-8 shrink-0">02.</div>
                <div>
                  <div className="font-bold mb-1">auction runs</div>
                  <div className="text-dim text-sm">
                    bidders commit funds. clearing price updates each block. no
                    one gets front-run.
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-green w-8 shrink-0">03.</div>
                <div>
                  <div className="font-bold mb-1">pool created</div>
                  <div className="text-dim text-sm">
                    auction ends. uniswap v4 pool initialized at final clearing
                    price. trading begins.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Live auctions */}
      <section className="py-20 border-t border-border">
        <Container size="md">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green pulse-soft" />
              <span>live auctions</span>
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
      <section className="py-20 border-t border-border">
        <Container size="sm">
          <div className="border border-border bg-card p-8 md:p-12">
            <div className="text-dim text-sm mb-6">
              ~/timelock <span className="text-green">$</span> timelock init
            </div>

            <div className="text-xl md:text-2xl font-bold mb-4">
              ready to launch?
            </div>

            <p className="text-dim mb-8">
              create a fair token launch in under 5 minutes.
              <br />
              no coding required.
            </p>

            <Link
              href="/launch"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green text-background font-bold hover:bg-green/90 transition-colors"
            >
              launch token
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}
