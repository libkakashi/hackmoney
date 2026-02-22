'use client';

import {useState} from 'react';
import {Users, Rocket, HelpCircle, Terminal} from 'lucide-react';
import {Container} from '~/components/layout/container';
import {HelpSection} from './help-section';

const traderFAQs = [
  {
    q: 'how do bounties work?',
    a: `Anyone can add token bounties to GitHub issues—you don't need to be a maintainer. When an issue gets resolved, the bounty is automatically split across everyone who helped.

Multiple people can stack bounties on the same issue, creating a crowdfunded reward pool. The bigger the bounty, the faster it gets picked up.`,
    tag: 'guide',
  },
  {
    q: 'how do i earn tokens as a contributor?',
    a: `Find issues with bounties, help resolve them, and you automatically receive your share of the tokens. No manual claiming needed.

Since the tokens are liquid from day one, you can hold them if you believe in the project or sell them immediately. The more issues you close, the bigger your position in the project.`,
    tag: 'guide',
  },
  {
    q: 'can i just buy tokens without contributing code?',
    a: `Yes. You can participate in the fair launch or buy tokens on the open market after. You don't need to write a single line of code.

If you spot a promising project early—strong team, active development, growing community—you can back it with capital. If the project takes off, your tokens reflect that.`,
    tag: 'guide',
  },
  {
    q: 'what happens to my tokens after the launch?',
    a: `They're instantly tradable. Liquidity is created automatically after the launch window closes (~10-20 blocks).

You can hold, sell, or use them to add bounties to issues you care about. There's no lockup, no vesting, no restrictions.`,
    tag: 'guide',
  },
  {
    q: 'what makes a token go up in value?',
    a: `The same things that make any project valuable: more adoption, more contributors, more demand.

When a project ships features, closes issues, and grows its user base, demand for its token tends to follow. Early supporters who spotted this before everyone else benefit the most.`,
    tag: 'guide',
  },
  {
    q: 'how are bounty splits decided?',
    a: `Splits are proportional to contributions. If 3 people help resolve an issue, the bounty gets divided based on who did what.

Project maintainers or the community determine the split. It's all transparent and recorded on-chain.`,
    tag: 'guide',
  },
];

const generalFAQs = [
  {
    q: 'how does the fair launch work?',
    a: `Every token launches with a 30-minute window where everyone gets equal access. No advantage to being first or last—everyone pays the same final price based on total demand.

No whales corner the supply. No VCs get special allocations. No bots snipe tokens. Just a level playing field for anyone who wants in early.`,
    tag: 'core',
  },
  {
    q: 'do i need to be a developer to participate?',
    a: `No. If you spot a promising project early, you can back it during the fair launch or buy tokens on the open market after.

You're basically angel investing in open source. If you're right about a project's potential—strong team, active development, growing community—your tokens reflect that growth.`,
    tag: 'core',
  },
  {
    q: 'why would a token increase in value?',
    a: `Same reason any project becomes more valuable: adoption, activity, and demand.

When a project ships consistently, closes issues, attracts more contributors, and grows its community, more people want the token. Early supporters who spotted this before the crowd are the ones who benefit most.

There's also a flywheel: higher token price means bounties are worth more, which attracts better contributors, which makes the project better, which drives more demand.`,
    tag: 'core',
  },
  {
    q: 'how do bounties create a flywheel?',
    a: `Anyone can add token bounties to issues. More bounties attract more contributors. More contributors ship more features and fixes. Better projects attract more supporters and buyers. Higher token value makes existing bounties worth more.

It's a self-reinforcing cycle where everyone—builders, backers, and users—benefits from the project getting better.`,
    tag: 'core',
  },
  {
    q: 'can the liquidity be rugged?',
    a: `No. Liquidity is locked automatically through immutable smart contracts. It cannot be withdrawn by anyone, including the project creator.

This protects everyone who bought tokens—whether you're a contributor holding rewards or someone who backed the project early.`,
    tag: 'security',
  },
  {
    q: 'what is the floor price?',
    a: `Every token has a floor price of $0.10, translating to a minimum FDV of $100,000 for the 1M token supply.

The clearing price can go higher based on demand, but never lower. This gives early backers a known downside while the upside is uncapped.`,
    tag: 'config',
  },
];

const creatorFAQs = [
  {
    q: 'how do i launch a token?',
    a: `Go to /launch, pick a GitHub repository or organization, and sign one transaction. That's it.

Every launch follows the same rules:
• 1,000,000 total supply
• $0.10 starting price
• Single-sided liquidity on Uniswap V4 — trading starts immediately

You can launch immediately or schedule for later.`,
    tag: 'guide',
  },
  {
    q: 'what do i get as a project creator?',
    a: `You receive the LP position NFT, which earns you swap fees on every trade. That's passive income for as long as people trade your token.

You can also participate in your own launch to acquire tokens for bounties. As your project grows and the token appreciates, your bounties become more attractive to contributors, creating a virtuous cycle.

No VCs, no equity dilution, no reliance on donations.`,
    tag: 'fees',
  },
  {
    q: 'what are the fees?',
    a: `Zero protocol fees. You only pay gas for deployment.

The liquidity pool has a 1% swap fee that goes directly to you as the LP holder. More trading activity on your token = more revenue for your project.`,
    tag: 'fees',
  },
  {
    q: 'where does the raised USDC go?',
    a: `All raised USDC is automatically paired with your tokens to create instant liquidity. Smart contracts handle everything—no manual setup.

The liquidity is locked and cannot be removed. This protects your supporters and gives them confidence to back you early.`,
    tag: 'security',
  },
  {
    q: 'why would people buy my token?',
    a: `Some will buy because they use your project and want to fund bounties for features they need. Some will buy because they contribute code and want to hold their upside.

And some will buy because they believe your project is going to grow and they want to get in early. All three types of buyers are good for your project—they increase token value, which makes your bounties more attractive, which brings in better contributors.`,
    tag: 'core',
  },
  {
    q: "what if my launch doesn't get enough participation?",
    a: `All launches succeed regardless of participation level. Even with minimal support, the liquidity pool is created at the minimum price.

Your tokens remain tradable, and people can still buy in after launch. A quiet start isn't a failure—some of the best projects build momentum over time.`,
    tag: 'rules',
  },
];

type Tab = 'general' | 'traders' | 'creators';

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
  const [tab, setTab] = useState<Tab>('general');

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

  const accentClass =
    accentColor === 'green'
      ? 'text-green'
      : accentColor === 'purple'
        ? 'text-purple'
        : 'text-yellow';

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border">
        <Container size="md">
          <div className="py-8">
            <div className="text-dim text-sm mb-4">
              ~/nyx <span className="text-green">$</span> man faq
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              <span className="text-green">?</span> faq
              <span className="blink ml-1 text-green">_</span>
            </h1>

            <div className="text-dim text-sm">frequently asked questions</div>
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
                onClick={() => setTab('general')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm transition-colors border-r border-border ${
                  tab === 'general'
                    ? 'bg-yellow/10 text-yellow'
                    : 'text-dim hover:text-foreground hover:bg-card'
                }`}
              >
                <HelpCircle className="size-4" />
                <span>general</span>
                {tab === 'general' && (
                  <span className="text-xs">{'\u25CF'}</span>
                )}
              </button>
              <button
                onClick={() => setTab('traders')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm transition-colors border-r border-border ${
                  tab === 'traders'
                    ? 'bg-green/10 text-green'
                    : 'text-dim hover:text-foreground hover:bg-card'
                }`}
              >
                <Users className="size-4" />
                <span>contributors</span>
                {tab === 'traders' && (
                  <span className="text-xs">{'\u25CF'}</span>
                )}
              </button>
              <button
                onClick={() => setTab('creators')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm transition-colors ${
                  tab === 'creators'
                    ? 'bg-purple/10 text-purple'
                    : 'text-dim hover:text-foreground hover:bg-card'
                }`}
              >
                <Rocket className="size-4" />
                <span>projects</span>
                {tab === 'creators' && (
                  <span className="text-xs">{'\u25CF'}</span>
                )}
              </button>
            </div>
          </div>

          {/* Command indicator */}
          <div className="text-sm mb-6 flex items-center gap-2">
            <Terminal className="size-4 text-dim" />
            <span className="text-dim">$</span>
            <span className={accentClass}>nyx faq --type={tab}</span>
            <span className="blink">_</span>
          </div>

          {/* FAQ list — all open, styled like terminal log output */}
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-border">
                {/* Question header */}
                <div className="p-4 flex items-start gap-3 border-b border-border bg-card">
                  <span
                    className={`text-xs tabular-nums shrink-0 mt-0.5 ${accentClass}`}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground">
                      {faq.q}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 border uppercase tracking-wider ${tagColors[faq.tag]}`}
                    >
                      {faq.tag}
                    </span>
                  </div>
                </div>

                {/* Answer */}
                <div className="p-4 pl-11">
                  <div className="text-foreground/80 text-sm whitespace-pre-line leading-relaxed">
                    {faq.a}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats bar */}
          <div className="mt-8 border border-border p-4 bg-card">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="text-dim">type:</span>
                <span className={accentClass}>{tab}</span>
                <span className="text-dim">| entries:</span>
                <span className={accentClass}>{faqs.length}</span>
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
              <span className="text-green">{'\u25CF'}</span>
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
