'use client';

import {useState} from 'react';
import {
  Users,
  Rocket,
  HelpCircle,
  ChevronRight,
  Terminal,
  Zap,
} from 'lucide-react';
import {Container} from '~/components/layout/container';
import {HelpSection} from './help-section';

const traderFAQs = [
  {
    q: 'how do i place a bid?',
    a: `Connect your wallet, navigate to the token you want to bid on, and enter the amount of USDC you wish to commit.

The platform uses Permit2 for gasless approvals, so you'll sign a message and then submit your bid transaction.

You can view your active bids and their status on the token page at any time. There's no minimum bid amount.`,
    tag: 'guide',
  },
  {
    q: 'why is bidding early beneficial?',
    a: `CCA splits bids evenly over every block in auction duration. When you bid early, your bid gets split over more blocks.

    This means early bidders receive slightly better token allocations.

The mechanism discourages sniping and front-running, createing a more stable auction environment. Early bidding also gives you more time to add additional bids if needed.`,
    tag: 'core',
  },
  {
    q: 'can i cancel or modify my bid?',
    a: `No, bids are irrevocable once submitted. This is a deliberate design choice to prevent manipulation.

If participants could cancel freely, bad actors could artificially inflate demand to drive up the clearing price, then withdraw at the last moment to harm other bidders.

You can, however, place additional bids on the same auction. Each new bid is treated independently and adds to your total commitment.`,
    tag: 'guide',
  },
  {
    q: 'when and how do i receive my tokens?',
    a: `Once an auction concludes, several things happen automatically:

First, the final clearing price is calculated and locked in.

Then, the raised USDC and tokens are migrated to create a Uniswap V4 liquidity pool at the clearing price.

This typically takes around 10-20 blocks.

Once claims are enabled, visit the token page and click the claim button to receive your allocated tokens or refunds.

The entire process is trustless, immutable and on-chain.`,
    tag: 'guide',
  },
  {
    q: 'is this protected from MEV and front-running?',
    a: `Yes, CCAs are inherently MEV-resistant by design.

Since every bid is split over the entire auction duration, there's very little for bots or validators to extract through front-running or sandwich attacks.

In traditional token sales or bonding curves, front-running is profitable since it allows a bot to corner large supply at cheaper prices.

In CCA, everyone essentially receives a TWAP(time weighted average price) since they enter the auction.`,
    tag: 'security',
  },
  {
    q: 'what currencies can i bid with?',
    a: `All auctions on Nyx are denominated in USDC (USD Coin).

You'll need USDC in your wallet on the same network as the auction. If you have ETH or other tokens, swap for USDC first using any DEX.

We chose USDC because it provides stable, predictable pricing and eliminates volatility risk.

Ramen can help you swap any token to USDC and participate in the auction in 1 click.`,
    tag: 'guide',
  },
];

const generalFAQs = [
  {
    q: 'what is Nyx?',
    a: `Nyx is a permissionless token launchpad powered by Uniswap's Continuous Clearing Auction (CCA) on Uniswap V4.

It enables fair token launches with transparent price discovery, immediate liquidity, and MEV-resistant auctions. Whether you're bidding on tokens or launching your own, Nyx provides the infrastructure for decentralized, trustless token distribution.`,
    tag: 'core',
  },
  {
    q: 'who is ramen?',
    a: `Ramen is your personal on-chain assistant built into the platform.

It provides real-time market intelligence and helps you find the best opportunities by finding:
• Top 24-hour price performers
• Fastest-filling auctions (strongest early demand)
• Highest volume auctions right now
• Other momentum and discovery filters

You can ask it anything about CCA mechanics, token launches, bidding strategy, or Nyx features & it answers in plain English.

For power users, it can also:

• bid in auctions on your behalf
• buy/sell any token
• multi hop swaps (ask it to participate in an auction by swapping eth to usdc!)

only after you review and sign!`,
    tag: 'tools',
  },
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
    q: 'who benefits from using CCA?',
    a: `Projects/Initiators: Achieve fair pricing, transparent distributions, and instant liquidity without intermediaries.

Bidders/Participants: Fair access with incentives for early involvement, real-time transparency, and no sniping risks.

Ecosystem: Deeper, more stable markets reduce volatility and attract long-term liquidity.`,
    tag: 'core',
  },
  {
    q: 'how does price discovery work in CCA?',
    a: `Price discovery is continuous and market-driven:

Bids are spread proportionally across all blocks remaining in the auction.
For each block, a clearing price is calculated by fairly distributing all tokens proportionally to each bidder.

This minimizes timing attacks and promotes stable pricing, unlike one-shot auctions.`,
    tag: 'core',
  },
  {
    q: 'benefits of ens names for launches?',
    a: `Nyx offers a one-click step to purchase an ENS domain that matches your token (e.g. YOURTOKEN.eth)

Benefits include:
• Replaces ugly 0x... addresses with a clean, readable name
• Builds instant trust and brand recognition
• Makes it much harder for impersonators to create fake versions
• Easier for users to find, share, verify, and remember your project

Tokens deployed with ENS names are shown with a green checkmark on Nyx pages.

The process is fully on-chain, transparent, and optional — but strongly recommended for serious projects.`,
    tag: 'security',
  },
];

const creatorFAQs = [
  {
    q: 'how do i launch a token?',
    a: `Launching on Nyx is simple and 100% permissionless:
1. Go to /launch
2. Fill in: Token Name, Symbol (ticker), Short description, social links(optional)
3. Hit deploy and sign one transaction

What happens behind the curtain:
• Your browser does "salt mining" to find a clean deterministic deploy address (no extra gas waste)
• Deploys your ERC-20 token contract
• Automatically sets up the Continuous Clearing Auction with all the fair-launch rules

You can choose to: Start auction right now, or schedule it for a future date/time

Fixed rules (same for every launch. Keeps it fair & comparable):
• Total supply: 1,000,000 tokens
• Auction length: ~30 minutes
• Floor price: $0.10 / token
• Allocation split: 10% sold in auction → 90% paired into Uniswap v4 LP.`,
    tag: 'guide',
  },
  {
    q: 'what are the fees for launching?',
    a: `Nyx charges zero protocol fees. You only pay gas costs for deployment.

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

The clearing price can go higher based on demand, but never lower.

Bidders can bid up to 1000x the floor ($100 per token) as a safety ceiling.`,
    tag: 'config',
  },
  {
    q: 'what if my auction does not get enough bids?',
    a: `If an auction doesn't meet the graduation threshold, all bidders receive complete USDC refunds and no tokens are distributed.

Currently, the graduation threshold is zero, meaning auctions always graduate regardless of amount raised. Even with minimal bids, the pool is created at floor price.

You can always launch again with a new token if you want to try different timing.`,
    tag: 'rules',
  },
];

type Tab = 'general' | 'traders' | 'creators';

function FAQBanner() {
  const scanlines = Array.from({length: 20}, (_, i) => 30 + i * 10);
  const gridLines = Array.from({length: 12}, (_, i) => 50 + i * 60);

  return (
    <svg
      viewBox="0 0 700 230"
      className="block w-full max-w-2xl mb-6"
      aria-label="FAQ"
    >
      <defs>
        <linearGradient id="faq-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5fffb0" />
          <stop offset="50%" stopColor="#ffe080" />
          <stop offset="100%" stopColor="#d4c0f0" />
        </linearGradient>
        <linearGradient id="faq-grad-v" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5fffb0" stopOpacity="0" />
          <stop offset="50%" stopColor="#5fffb0" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#5fffb0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="faq-glow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#5fffb0" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#ffe080" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#d4c0f0" stopOpacity="0.4" />
        </linearGradient>
        <filter id="faq-blur">
          <feGaussianBlur in="SourceGraphic" stdDeviation="14" />
        </filter>
        <filter id="faq-blur-sm">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
        </filter>
      </defs>

      {/* Background grid */}
      {gridLines.map(x => (
        <line
          key={`gv-${x}`}
          x1={x}
          y1="15"
          x2={x}
          y2="215"
          stroke="#5fffb0"
          strokeOpacity="0.04"
          strokeWidth="1"
        />
      ))}

      {/* Scanlines */}
      {scanlines.map(y => (
        <line
          key={`s-${y}`}
          x1="15"
          y1={y}
          x2="685"
          y2={y}
          stroke="#5fffb0"
          strokeOpacity="0.04"
          strokeWidth="1"
        />
      ))}

      {/* Large diffuse glow behind text */}
      <text
        x="40"
        y="170"
        textAnchor="start"
        style={{
          fontSize: '160px',
          fontFamily: 'var(--font-jetbrains-mono), monospace',
          fontWeight: 800,
          fill: 'url(#faq-glow)',
          filter: 'url(#faq-blur)',
        }}
      >
        FAQ
      </text>

      {/* Tighter inner glow */}
      <text
        x="40"
        y="170"
        textAnchor="start"
        style={{
          fontSize: '160px',
          fontFamily: 'var(--font-jetbrains-mono), monospace',
          fontWeight: 800,
          fill: 'url(#faq-glow)',
          filter: 'url(#faq-blur-sm)',
        }}
      >
        FAQ
      </text>

      {/* Main text with gradient */}
      <text
        x="40"
        y="170"
        textAnchor="start"
        style={{
          fontSize: '160px',
          fontFamily: 'var(--font-jetbrains-mono), monospace',
          fontWeight: 800,
          fill: 'url(#faq-grad)',
        }}
      >
        FAQ
      </text>

      {/* Blinking cursor */}
      <rect
        x="340"
        y="70"
        width="6"
        height="100"
        rx="1"
        fill="#5fffb0"
        opacity="0.9"
      >
        <animate
          attributeName="opacity"
          values="0.9;0;0.9"
          dur="1.2s"
          repeatCount="indefinite"
        />
      </rect>

      {/* Top dashed line */}
      <line
        x1="40"
        y1="12"
        x2="660"
        y2="12"
        stroke="url(#faq-grad)"
        strokeWidth="1.5"
        strokeDasharray="8 5"
      />

      {/* Bottom dashed line */}
      <line
        x1="40"
        y1="218"
        x2="660"
        y2="218"
        stroke="url(#faq-grad)"
        strokeWidth="1.5"
        strokeDasharray="8 5"
      />

      {/* Corner brackets — top left */}
      <path
        d="M12 32 L12 12 L32 12"
        stroke="#5fffb0"
        strokeWidth="2.5"
        fill="none"
      />
      {/* Corner brackets — top right */}
      <path
        d="M688 32 L688 12 L668 12"
        stroke="#d4c0f0"
        strokeWidth="2.5"
        fill="none"
      />
      {/* Corner brackets — bottom left */}
      <path
        d="M12 198 L12 218 L32 218"
        stroke="#ffe080"
        strokeWidth="2.5"
        fill="none"
      />
      {/* Corner brackets — bottom right */}
      <path
        d="M688 198 L688 218 L668 218"
        stroke="#5fffb0"
        strokeWidth="2.5"
        fill="none"
      />

      {/* Decorative side ticks — left */}
      {[60, 115, 170].map(y => (
        <line
          key={`tl-${y}`}
          x1="12"
          y1={y}
          x2="22"
          y2={y}
          stroke="#5fffb0"
          strokeOpacity="0.3"
          strokeWidth="1.5"
        />
      ))}
      {/* Decorative side ticks — right */}
      {[60, 115, 170].map(y => (
        <line
          key={`tr-${y}`}
          x1="678"
          y1={y}
          x2="688"
          y2={y}
          stroke="#d4c0f0"
          strokeOpacity="0.3"
          strokeWidth="1.5"
        />
      ))}

      {/* Top left label */}
      <text
        x="42"
        y="30"
        style={{
          fontSize: '10px',
          fontFamily: 'var(--font-jetbrains-mono), monospace',
          fill: '#5fffb0',
          opacity: 0.5,
        }}
      >
        nyx://help
      </text>

      {/* Top right label */}
      <text
        x="658"
        y="30"
        textAnchor="end"
        style={{
          fontSize: '10px',
          fontFamily: 'var(--font-jetbrains-mono), monospace',
          fill: '#d4c0f0',
          opacity: 0.5,
        }}
      >
        v1.0.0
      </text>

      {/* Bottom status line */}
      <text
        x="42"
        y="210"
        style={{
          fontSize: '10px',
          fontFamily: 'var(--font-jetbrains-mono), monospace',
          fill: '#ffe080',
          opacity: 0.4,
        }}
      >
        man faq | grep --help
      </text>

      {/* Bottom right status */}
      <text
        x="658"
        y="210"
        textAnchor="end"
        style={{
          fontSize: '10px',
          fontFamily: 'var(--font-jetbrains-mono), monospace',
          fill: '#5fffb0',
          opacity: 0.4,
        }}
      >
        [READY]
      </text>
    </svg>
  );
}

const tagColors: Record<string, string> = {
  core: 'text-yellow border-yellow/30 bg-yellow/5',
  guide: 'text-green border-green/30 bg-green/5',
  rules: 'text-purple border-purple/30 bg-purple/5',
  security: 'text-green border-green/30 bg-green/5',
  config: 'text-purple border-purple/30 bg-purple/5',
  fees: 'text-yellow border-yellow/30 bg-yellow/5',
  basics: 'text-yellow border-yellow/30 bg-yellow/5',
  mechanics: 'text-green border-green/30 bg-green/5',
  alpha: 'text-purple border-purple/30 bg-purple/5',
  safety: 'text-red border-red/30 bg-red/5',
  slang: 'text-purple border-purple/30 bg-purple/5',
  tools: 'text-green border-green/30 bg-green/5',
  privacy: 'text-yellow border-yellow/30 bg-yellow/5',
};

export default function FAQPage() {
  const [tab, setTab] = useState<Tab>('traders');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const getFaqs = () => {
    switch (tab) {
      case 'general':
        return generalFAQs;
      case 'traders':
        return traderFAQs;
      case 'creators':
        return creatorFAQs;
    }
  };

  const getAccentColor = () => {
    switch (tab) {
      case 'general':
        return 'yellow';
      case 'traders':
        return 'green';
      case 'creators':
        return 'purple';
    }
  };

  const faqs = getFaqs();
  const accentColor = getAccentColor();

  return (
    <div className="min-h-screen">
      {/* Header with ASCII art */}
      <div className="border-b border-border">
        <Container size="md">
          <div className="py-8">
            <div className="text-dim text-sm mb-4">
              ~/nyx <span className="text-green">$</span> man faq
            </div>

            <FAQBanner />
            <h1 className="text-2xl font-bold sm:hidden">FAQ</h1>

            <div className="text-dim text-xs mt-2">
              <span className="text-green font-mono">[output]</span> frequently
              asked questions
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
                  setTab('general');
                  setExpandedIndex(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm transition-colors border-r border-border ${
                  tab === 'general'
                    ? 'bg-yellow/10 text-yellow'
                    : 'text-dim hover:text-foreground hover:bg-card'
                }`}
              >
                <HelpCircle className="size-4" />
                <span>general</span>
                {tab === 'general' && <span className="text-xs">●</span>}
              </button>
              <button
                onClick={() => {
                  setTab('traders');
                  setExpandedIndex(null);
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
                  setExpandedIndex(null);
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
            <span
              className={
                accentColor === 'green'
                  ? 'text-green'
                  : accentColor === 'purple'
                    ? 'text-purple'
                    : 'text-yellow'
              }
            >
              nyx faq --type={tab}
            </span>
            <span className="blink">_</span>
          </div>

          {/* FAQ list */}
          <div className="space-y-3">
            {faqs.map((faq, i) => {
              const isExpanded = expandedIndex === i;

              return (
                <div
                  key={i}
                  className={`border transition-all ${
                    isExpanded
                      ? accentColor === 'green'
                        ? 'border-green/50 bg-green/5'
                        : accentColor === 'purple'
                          ? 'border-purple/50 bg-purple/5'
                          : 'border-yellow/50 bg-yellow/5'
                      : 'border-border hover:border-dim'
                  }`}
                >
                  <button
                    onClick={() => setExpandedIndex(isExpanded ? null : i)}
                    className="w-full text-left p-4 flex items-start gap-3"
                  >
                    {/* Line number */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs tabular-nums ${
                          isExpanded
                            ? accentColor === 'green'
                              ? 'text-green'
                              : accentColor === 'purple'
                                ? 'text-purple'
                                : 'text-yellow'
                            : 'text-dim'
                        }`}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <ChevronRight
                        className={`size-4 transition-transform ${
                          isExpanded
                            ? `rotate-90 ${
                                accentColor === 'green'
                                  ? 'text-green'
                                  : accentColor === 'purple'
                                    ? 'text-purple'
                                    : 'text-yellow'
                              }`
                            : 'text-dim'
                        }`}
                      />
                    </div>

                    {/* Question */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-medium ${isExpanded ? 'text-foreground' : ''}`}
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
                  className={
                    accentColor === 'green'
                      ? 'text-green'
                      : accentColor === 'purple'
                        ? 'text-purple'
                        : 'text-yellow'
                  }
                >
                  {tab}
                </span>
                <span className="text-dim">| entries:</span>
                <span
                  className={
                    accentColor === 'green'
                      ? 'text-green'
                      : accentColor === 'purple'
                        ? 'text-purple'
                        : 'text-yellow'
                  }
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
