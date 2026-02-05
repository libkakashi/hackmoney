'use client';

import {useState} from 'react';
import {Users, Rocket, ChevronRight, Terminal, Zap} from 'lucide-react';
import {Container} from '~/components/layout/container';
import {HelpSection} from './help-section';

const traderFAQs = [
  {
    q: 'what is a continuous clearing auction?',
    a: `Continuous Clearing Auction or CCA is a novel onchain auction mechanism developed by Uniswap for fair token distributions and liquidity bootstrapping in DeFi.

Unlike traditional launchpads which use bonding curves which are plagued by snipers and MEV bots which take undue advantage over retail, CCA enables market driven price discovery and immediate liquidity seeding into Uniswap v4 pools.

This create 'fair-launches' and eliminates timing games, front-running and MEV extraction that plague traditional token sales.`,
    tag: 'core',
  },
  {
    q: 'how does CCA actually work?',
    a: ` CCA works in three main steps:
    
    1. Create Auction: Projects set token ticker, name and image along with auction parameters like total token supply, floor price, auction schedule etc.
    
2. Price Discovery: Traders submit their budget, and their bids are uniformly spread over the entire auction period where a clearing price is calculated per block based on demand & supply, ensuring fair pricing.

3. Long-Term Liquidity: Post-auction, proceeds seed a Uniswap v4 pool at the discovered price, enabling seamless trading.
This ensures transparent, onchain processes with no arbitrary pricing or offchain deals.
    `,
    tag: 'core',
  },
  {
    q: 'how do i place a bid?',
    a: `Connect your wallet, navigate to the token you want to bid on, and enter the amount of USDC you wish to commit.

The platform uses Permit2 for gasless approvals, so you'll sign a message and then submit your bid transaction. 

You can view your active bids and their status on the token page at any time. There's no minimum bid amount.`,
    tag: 'guide',
  },
  {
    q: 'can i cancel or modify my bid?',
    a: `No, bids are irrevocable once submitted. This is a deliberate design choice to prevent manipulation.

If participants could cancel freely, bad actors could artificially inflate demand to drive up the clearing price, then withdraw at the last moment to harm other bidders.

You can, however, place additional bids on the same auction. Each new bid is treated independently and adds to your total commitment.`,
    tag: 'rules',
  },
  {
    q: 'when and how do i receive my tokens?',
    a: `After the auction ends, the protocol finalizes the clearing price and migrates liquidity to Uniswap V4.

This typically takes around 10-20 blocks and you can claim your tokens post that. Once claims are enabled, visit the token page and click the claim button to receive your allocated tokens.
`,
    tag: 'guide',
  },
  {
    q: 'why is bidding early beneficial?',
    a: `CCA splits bids evenly over every block in auction duration. When you bid early, your bid gets split over more blocks.

    This means early bidders receive slightly better token allocations.

The mechanism discourages sniping and front-running, createing a more stable auction environment. Early bidding also gives you more time to add additional bids if needed.`,
    tag: 'rules',
  },
  {
    q: 'is this protected from MEV and front-running?',
    a: `Yes, CCAs are inherently MEV-resistant by design.

Since every bid is split over the entire auction duration, there's nothing for bots or validators to extract through front-running or sandwich attacks.

In traditional token sales or bonding curves, front-running a large buy is profitable since it allows a bot to corner large supply at cheaper prices. In CCA, everyone essentially receives a TWAP(time weighted average price) since they enter the auction.`,
    tag: 'security',
  },
  {
    q: 'what currencies can i bid with?',
    a: `All auctions on Timelock are denominated in USDC (USD Coin).

You'll need USDC in your wallet on the same network as the auction.  If you have ETH or other tokens, swap for USDC first using any DEX.

We chose USDC because it provides stable, predictable pricing and eliminates volatility risk.`,
    tag: 'guide',
  },
  {
    q: 'what happens after the auction ends?',
    a: `Once an auction concludes, several things happen automatically:

First, the final clearing price is calculated and locked in. Then, the raised USDC and tokens are migrated to create a Uniswap V4 liquidity pool at the clearing price.

After migration completes (~20 blocks), claims open for bidders to collect their tokens or refunds. The entire process is trustless, immutable and on-chain.`,
    tag: 'guide',
  },
];

const creatorFAQs = [
  {
    q: 'how do i launch a token?',
    a: `Navigate to the /launch page, fill in your token details (name, symbol, description, and optional social links), then deploy with a single transaction.

Behind the scenes, the platform performs "salt mining" in your browser to generate a deterministic deployment address, then creates your token contract and initializes the auction.

You can start the auction immediately or schedule it for a future date. The entire process is permissionless and requires no approval from anyone.`,
    tag: 'guide',
  },
  {
    q: 'what parameters are fixed vs configurable?',
    a: `Timelock uses standardized parameters to ensure fairness. Fixed parameters include:
• Total supply: 1,000,000 tokens
• Auction duration: ~30 minutes
• Floor price: $0.10 per token
• Split: 10% auction, 90% LP

You can configure: token name, symbol, description, social links, and auction start time. This standardization helps bidders easily compare opportunities.`,
    tag: 'config',
  },
  {
    q: 'what does the 10/90 split mean?',
    a: `Of your 1,000,000 token supply, 10% (100,000 tokens) are sold through the auction to establish the initial price and raise USDC.

The remaining 90% (900,000 tokens) are automatically paired with the raised USDC to create deep Uniswap V4 liquidity.

This ensures most tokens are available for trading immediately, creating a healthy liquid market rather than locking supply in team wallets.`,
    tag: 'config',
  },
  {
    q: 'what are the fees for launching?',
    a: `Timelock charges zero protocol fees. You only pay gas costs for deployment.

On Ethereum mainnet this might cost $10-20 at typical gas prices. On L2s like Base or Arbitrum, it's just a few cents.

No ongoing fees, no percentage of raised funds taken. The Uniswap V4 pool has a 1% swap fee, but that goes to liquidity providers (including you).`,
    tag: 'fees',
  },
  {
    q: 'where does the raised USDC go?',
    a: `All USDC raised is automatically paired with tokens to create a Uniswap V4 liquidity pool. This happens trustlessly through smart contracts.

The pool is initialized at the clearing price with full-range liquidity. As the creator, you receive the LP position NFT and earn swap fees from trading activity.

This liquidity cannot be removed immediately, protecting bidders from rug pulls.`,
    tag: 'security',
  },
  {
    q: 'can the liquidity be rugged?',
    a: `No. Liquidity pool creation and locking happens automatically through immutable smart contracts.

When your auction ends, the USDC and tokens are migrated directly into a Uniswap V4 pool. While you receive the LP position NFT, it's locked and cannot be withdrawn.

You benefit from swap fees, but you cannot drain the pool. This eliminates rug-pull risk.`,
    tag: 'security',
  },
  {
    q: 'how do i benefit as a creator?',
    a: `You benefit in several ways:

1. LP Position NFT: You receive the Uniswap V4 LP position, earning a share of 1% swap fees on all trades. This creates ongoing passive income.

2. Token Holdings: You can participate in your own auction like any other bidder.

3. Ecosystem Building: A successful launch builds community and value you can continue developing.`,
    tag: 'fees',
  },
  {
    q: 'what is the floor price?',
    a: `Every token has a floor price of $0.10, translating to a minimum FDV of $100,000 for the 1M token supply.

The clearing price can go higher based on demand, but never lower. This prevents races to the bottom where projects compete on cheapest tokens.

Bidders can bid up to 1000x the floor ($100 per token) as a safety ceiling.`,
    tag: 'config',
  },
  {
    q: 'what if my auction does not get enough bids?',
    a: `If an auction doesn't meet the graduation threshold, all bidders receive complete USDC refunds and no tokens are distributed.

Currently, the graduation threshold is zero, meaning auctions always graduate regardless of amount raised. Even with minimal bids, the pool will be created at floor price.

You can always launch again with a new token if you want to try different timing.`,
    tag: 'rules',
  },
  {
    q: 'which networks are supported?',
    a: `Timelock supports multiple networks:
• Ethereum mainnet
• Base
• Arbitrum
• Unichain

Each network has its own deployed contracts. Your auction runs entirely on the chosen chain, and bidders need assets on that same network.

L2 networks offer significantly lower gas costs for both creators and bidders.`,
    tag: 'guide',
  },
  {
    q: 'is the contract code audited?',
    a: `Yes. The CCA contracts have been audited by leading security firms including Spearbit, OpenZeppelin, and ABDK.

The code is production-ready and has undergone extensive review. There's also an active bug bounty program on Cantina for responsible disclosure.

Contracts use Solidity 0.8.26 with reentrancy guards and established OpenZeppelin patterns.`,
    tag: 'security',
  },
];

type Tab = 'traders' | 'creators';

const ASCII_FAQ_LINES = [
  {text: '┌────────────────────────────────────────┐', color: 'text-purple'},
  {text: '│ ███████╗ █████╗     ██████╗            │', color: 'text-green'},
  {text: '│ ██╔════╝██╔══██╗   ██╔═══██╗           │', color: 'text-green'},
  {text: '│ █████╗  ███████║   ██║   ██║           │', color: 'text-yellow'},
  {text: '│ ██╔══╝  ██╔══██║   ██║▄▄ ██║           │', color: 'text-yellow'},
  {text: '│ ██║     ██║  ██║   ╚██████╔╝           │', color: 'text-green'},
  {text: '│ ╚═╝     ╚═╝  ╚═╝    ╚══▀▀═╝            │', color: 'text-green'},
  {text: '└────────────────────────────────────────┘', color: 'text-purple'},
];

const tagColors: Record<string, string> = {
  core: 'text-yellow border-yellow/30 bg-yellow/5',
  guide: 'text-green border-green/30 bg-green/5',
  rules: 'text-purple border-purple/30 bg-purple/5',
  security: 'text-green border-green/30 bg-green/5',
  config: 'text-purple border-purple/30 bg-purple/5',
  fees: 'text-yellow border-yellow/30 bg-yellow/5',
};

export default function FAQPage() {
  const [tab, setTab] = useState<Tab>('traders');
  const [collapsedIndex, setCollapsedIndex] = useState<number | null>(null);
  const faqs = tab === 'traders' ? traderFAQs : creatorFAQs;

  return (
    <div className="min-h-screen">
      {/* Header with ASCII art */}
      <div className="border-b border-border">
        <Container size="md">
          <div className="py-8">
            <div className="text-dim text-sm mb-4">
              ~/timelock <span className="text-green">$</span> man faq
            </div>

            <link
              href="https://fonts.googleapis.com/css2?family=JetBrains+Mono&display=swap"
              rel="stylesheet"
            />

            {/* ASCII header */}
            <pre className="mb-4">
              {ASCII_FAQ_LINES.map((line, i) => (
                <span key={i} className={line.color}>
                  {line.text}
                  {'\n'}
                </span>
              ))}
            </pre>
            <h1 className="text-2xl font-bold sm:hidden">FAQ</h1>

            <div className="text-dim text-xs mt-2">
              <span className="text-green font-jetbrains!">[output]</span>{' '}
              frequently asked questions
            </div>
          </div>
        </Container>
      </div>

      <Container size="md">
        <div className="py-8">
          {/* Tab selector - terminal style */}
          <div className="border border-border mb-8">
            <div className="flex border-b border-border text-xs text-dim px-3 py-1.5 bg-card">
              <span className="text-purple">select</span>
              <span className="mx-1">:</span>
              <span>user_type</span>
            </div>
            <div className="flex">
              <button
                onClick={() => {
                  setTab('traders');
                  setCollapsedIndex(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm transition-colors border-r border-border ${
                  tab === 'traders'
                    ? 'bg-green/10 text-green'
                    : 'text-dim hover:text-foreground hover:bg-card'
                }`}
              >
                <Users className="size-4" />
                <span>traders</span>
                {tab === 'traders' && <span className="text-xs">●</span>}
              </button>
              <button
                onClick={() => {
                  setTab('creators');
                  setCollapsedIndex(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm transition-colors ${
                  tab === 'creators'
                    ? 'bg-purple/10 text-purple'
                    : 'text-dim hover:text-foreground hover:bg-card'
                }`}
              >
                <Rocket className="size-4" />
                <span>creators</span>
                {tab === 'creators' && <span className="text-xs">●</span>}
              </button>
            </div>
          </div>

          {/* Command indicator */}
          <div className="text-sm mb-6 flex items-center gap-2">
            <Terminal className="size-4 text-dim" />
            <span className="text-dim">$</span>
            <span className={tab === 'traders' ? 'text-green' : 'text-purple'}>
              timelock faq --type={tab}
            </span>
            <span className="blink">_</span>
          </div>

          {/* FAQ list */}
          <div className="space-y-3">
            {faqs.map((faq, i) => {
              const isExpanded = collapsedIndex !== i;
              const accentColor = tab === 'traders' ? 'green' : 'purple';

              return (
                <div
                  key={i}
                  className={`border transition-all ${
                    isExpanded
                      ? `border-${accentColor}/50 bg-${accentColor}/5`
                      : 'border-border hover:border-dim'
                  }`}
                >
                  <button
                    onClick={() => setCollapsedIndex(isExpanded ? i : null)}
                    className="w-full text-left p-4 flex items-start gap-3"
                  >
                    {/* Line number */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs tabular-nums ${
                          isExpanded ? `text-${accentColor}` : 'text-dim'
                        }`}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <ChevronRight
                        className={`size-4 transition-transform ${
                          isExpanded
                            ? `rotate-90 text-${accentColor}`
                            : 'text-dim'
                        }`}
                      />
                    </div>

                    {/* Question */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-smfont-medium ${isExpanded ? 'text-foreground' : ''}`}
                        >
                          {faq.q}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 border uppercase tracking-wider ${tagColors[faq.tag]}`}
                        >
                          {faq.tag}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Answer */}
                  {isExpanded && (
                    <div className="px-4 pb-4">
                      <div className="pl-10 border-l-2 border-dim/30 ml-3">
                        <div className="pl-4">
                          <div className="text-xs text-dim mb-1 flex items-center gap-1">
                            <Zap className="size-3" />
                            response
                          </div>
                          <div className="text-foreground text-sm whitespace-pre-line">
                            {faq.a}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Stats bar */}
          <div className="mt-8 border border-border p-4 bg-card">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="text-dim">type:</span>
                <span
                  className={tab === 'traders' ? 'text-green' : 'text-purple'}
                >
                  {tab}
                </span>
                <span className="text-dim">| entries:</span>
                <span
                  className={tab === 'traders' ? 'text-green' : 'text-purple'}
                >
                  {faqs.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green pulse-soft" />
                <span className="text-dim">docs synced</span>
              </div>
            </div>
          </div>

          <HelpSection />

          {/* Terminal footer */}
          <div className="mt-8 text-xs text-dim">
            <div className="flex items-center gap-2">
              <span className="text-green">●</span>
              <span>process complete</span>
              <span className="text-dim">|</span>
              <span>exit code: 0</span>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
