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
    q: 'who benefits from using CCA?',
    a: `Projects/Initiators: Achieve fair pricing, transparent distributions, and instant liquidity without intermediaries.

Bidders/Participants: Fair access with incentives for early involvement, real-time transparency, and no sniping risks.

Ecosystem: Deeper, more stable markets reduce volatility and attract long-term liquidity.`,
    tag: 'core',
  },
  {
    q: 'why is bidding early beneficial?',
    a: `CCA splits bids evenly over every block in auction duration. When you bid early, your bid gets split over more blocks.

    This means early bidders receive slightly better token allocations.

The mechanism discourages sniping and front-running, createing a more stable auction environment. Early bidding also gives you more time to add additional bids if needed.`,
    tag: 'core',
  },
  {
    q: 'how does price discovery work in CCA?',
    a: `Price discovery is continuous and market-driven:

Bids are spread proportionally across the remaining auction based on the release schedule $ Q(t) $.
For each period, aggregate demand forms a curve; the clearing price $ p^* $ is the highest where demand ≥ supply.
Winners pay $ p^* $ uniformly, with partial fills if needed.
This minimizes timing attacks and promotes stable pricing, unlike one-shot auctions.`,
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
    tag: 'guide',
  },
  {
    q: 'when and how do i receive my tokens?',
    a: `After the auction ends, the protocol finalizes the clearing price and migrates liquidity to Uniswap V4.

This typically takes around 10-20 blocks and you can claim your tokens post that. Once claims are enabled, visit the token page and click the claim button to receive your allocated tokens.
`,
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
    q: 'is the contract code audited?',
    a: `Yes. The CCA contracts have been audited by leading security firms including Spearbit, OpenZeppelin, and ABDK.

There's also an active bug bounty program on Cantina for responsible disclosure.

Contracts use Solidity 0.8.26 with reentrancy guards and established OpenZeppelin patterns.`,
    tag: 'security',
  },
  {
    q: 'how do i launch a token?',
    a: `Navigate to the /launch page, fill in your token details (name, symbol, description, and optional social links), then deploy with a single transaction.

Behind the scenes, the platform performs "salt mining" in your browser to generate a deterministic deployment address, then creates your token contract and initializes the auction.

You can start the auction immediately or schedule it for a future date. The entire process is permissionless and requires no approval from anyone.`,
    tag: 'guide',
  },
  {
    q: 'what parameters are fixed vs configurable?',
    a: `Nyx uses standardized parameters to ensure fairness. Fixed parameters include:
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
  {
    q: 'which networks are supported?',
    a: `Nyx supports multiple networks:
• Ethereum mainnet
• Base
• Arbitrum
• Unichain

Each network has its own deployed contracts. Your auction runs entirely on the chosen chain, and bidders need assets on that same network.

L2 networks offer significantly lower gas costs for both creators and bidders.`,
    tag: 'guide',
  },
];

const beginnerFAQs = [
  // ─── DEFI BASICS (The ABCs) ───
  { q: 'what is defi?', a: `DeFi = Decentralized Finance. 
    
    basically, money lego blocks without the suits. no banks, no managers, just code and chaos.`, tag: 'basics' },
  { q: 'what is a smart contract?', a: `it's a robot that keeps its promises.
    
    unlike your ex, once this code is deployed, it does exactly what it says. no takebacks.`, tag: 'basics' },
  { q: 'what is an amm?', a: `Automated Market Maker.
    
    it's a vending machine for tokens. you put money in, you get tokens out. math determines the price, not a guy on a trading floor.`, tag: 'mechanics' },
  { q: 'what is a liquidity pool?', a: `a big pile of money that makes trading possible.
    
    think of it as the cash register. people put tokens in so others can swap. if the pool is empty, the shop is closed.`, tag: 'mechanics' },
  { q: 'what is a token?', a: `digital bragging rights.
    
    could be money, could be a picture of a dog, could be absolutely nothing. welcome to crypto.`, tag: 'basics' },
  { q: 'what is blockchain?', a: `the receipt that never fades.
    
    a public list of who sent what to whom. everyone has a copy, so you can't fake it.`, tag: 'basics' },
  { q: 'what does decentralized mean?', a: `no boss key.
    
    nobody can shut it down, nobody can freeze your account (mostly). it's the wild west, baby.`, tag: 'basics' },
  { q: 'what is a dex?', a: `Decentralized Exchange.
    
    like the NYSE but run by code and accessible in your underwear. uniswap is the king here.`, tag: 'basics' },
  { q: 'what is supply?', a: `how many slices of the pizza exist.
    
    if supply is huge, price is usually small (unless you're shib). know your math.`, tag: 'basics' },
  { q: 'what is market cap?', a: `price x supply. the only number that actually matters.
    
    don't look at "cheap" price per token. look at how much the whole bag is worth.`, tag: 'basics' },
  // ─── LAUNCHING (Sending It) ───
  { q: 'how do i launch a memecoin?', a: `1. click launch.
    2. name your child.
    3. pay gas.
    
    congrats, you're a dev now. don't rug us.`, tag: 'guide' },
  { q: 'can anyone create a memecoin?', a: `literally anyone.
    
    your grandma, your dog, that guy from high school. permissionless means PERMISSIONLESS.`, tag: 'guide' },
  { q: 'do i need coding skills?', a: `nope. if you can click buttons, you can deploy.
    
    we handle the spaghetti code; you handle the memes.`, tag: 'guide' },
  { q: 'how long does it take?', a: `faster than heating a hot pocket.
    
    block times are fast. seconds, maybe minutes if congested.`, tag: 'guide' },
  { q: 'can i change details later?', a: `nope. immutable means forever.
    
    check your spelling. "dige" instead of "doge" is forever.`, tag: 'guide' },
  { q: 'can i launch multiple tokens?', a: `go crazy. launch a zoo.
    
    just remember quality > quantity (usually).`, tag: 'guide' },
  { q: 'what makes a good name?', a: `make me laugh or make me money.
    
    catchy, memeable, slightly offensive? usually wins.`, tag: 'guide' },
  { q: 'can i add utility later?', a: `sure, but let's be real—the meme IS the utility.`, tag: 'guide' },
  { q: 'do i control the token?', a: `you launched it, but the market owns it now.
    
    renounced ownership is the way. don't be a controlling dev.`, tag: 'safety' },
  { q: 'what happens after launch?', a: `chaos.
    
    liquidity activates, bots snipe, chart goes brrr (or nukes). enjoy the ride.`, tag: 'mechanics' },
  // ─── TRADING (Aping In) ───
  { q: 'how do i buy?', a: `connect wallet -> pick coin -> swap.
    
    if you can order food online, you can lose money on chain.`, tag: 'guide' },
  { q: 'how do i sell?', a: `same thing but backwards.
    
    swap token -> usdc/eth. paper handing? shame.`, tag: 'guide' },
  { q: 'can i trade 24/7?', a: `crypto never sleeps.
    
    markets remain open while you ruin your sleep schedule staring at charts.`, tag: 'guide' },
  { q: 'why do prices move so fast?', a: `low liquidity + high hype = giga volatility.
    
    welcome to the thunderdome. blinking is expensive.`, tag: 'mechanics' },
  { q: 'what is slippage?', a: `the "i don't care, just buy it" tax.
    
    price changes while your transaction confirms. high slippage = you pay whatever price to get in.`, tag: 'mechanics' },
  { q: 'what is volume?', a: `how loud the party is.
    
    high volume = everyone is trading. low volume = crickets.`, tag: 'mechanics' },
  { q: 'what is price impact?', a: `how fat your splash is.
    
    if you buy 50% of the supply, price goes to mars. don't wreck yourself.`, tag: 'mechanics' },
  { q: 'why did my trade fail?', a: `probably slippage too low or you're broke (no gas).
    
    increase slippage or top up your eth/sol.`, tag: 'guide' },
  { q: 'what is swapping?', a: `trading one magic bean for another.`, tag: 'basics' },
  { q: 'can i cancel a trade?', a: `once it's on chain, it's god's plan.
    
    no customer support line here.`, tag: 'guide' },
  // ─── WALLETS (Your Keys) ───
  { q: 'what is a wallet?', a: `your digital backpack. holds your coins, nfts, and bad decisions.`, tag: 'tools' },
  { q: 'do i need one?', a: `yes. no wallet, no crypto.
    
    metamask, rainbow, rabby, phantom - pick your weapon.`, tag: 'tools' },
  { q: 'are wallets safe?', a: `as safe as you are smart.
    
    click a bad link? dry. keep your seed phrase offline? safe.`, tag: 'safety' },
  { q: 'what is a private key?', a: `the master password.
    
    shows access to everything. never share it. ever. not even with "support".`, tag: 'safety' },
  { q: 'what is a seed phrase?', a: `12-24 words that save your life if you lose your phone.
    
    write it on paper. put it in a safe. tattoo it on your dog (don't do that).`, tag: 'safety' },
  { q: 'what if i lose my seed phrase?', a: `F.
    
    game over. money gone. sorry bro.`, tag: 'safety' },
  { q: 'does the platform hold my funds?', a: `nope. self-custody.
    
    your keys, your coins. we just provide the interface.`, tag: 'safety' },
  { q: 'is there KYC?', a: `lol. no.
    
    we don't want your ID. keep it anonymous.`, tag: 'tools' },
  // ─── RISKS (Getting Rekt) ───
  { q: 'are memecoins risky?', a: `is swimming with sharks risky?
    
    yes. you can lose everything. only bet what you can light on fire.`, tag: 'safety' },
  { q: 'can prices crash?', a: `faster than gravity.
    
    -99% is a rite of passage.`, tag: 'safety' },
  { q: 'what is a rug pull?', a: `when the dev drains the pool and buys a lambo.
    
    at Nyx, we auto-lock liquidity so devs CAN'T rug standard pools. you're welcome.`, tag: 'safety' },
  { q: 'can hype die?', a: `attention spans are short.
    
    if the timeline stops posting about it, it's probably dead.`, tag: 'slang' },
  { q: 'should i invest my life savings?', a: `NO.
    
    go to a casino if you want to ruin your life. this is for fun money.`, tag: 'safety' },
  { q: 'are scams common?', a: `everywhere.
    
    if a hot girl DMs you about crypto, it's a dude in a basement. block them.`, tag: 'safety' },
  { q: 'can whales wreck me?', a: `yes.
    
    if moby dick decides to sell, you're gonna feel the splash.`, tag: 'mechanics' },
  // ─── MEME CULTURE (The Vibes) ───
  { q: 'why do memes matter?', a: `memes control the world.
    
    elon tweets, doge pumps. vibes > fundamentals.`, tag: 'slang' },
  { q: 'what is "aping in"?', a: `buying without thinking.
    
    monke see, monke do, monke buy.`, tag: 'slang' },
  { q: 'wen moon?', a: `when the green candle goes vertical.
    
    the target destination for every bagholder.`, tag: 'slang' },
  { q: 'what are diamond hands?', a: `holding while your portfolio is -50%.
    
    conviction or delusion? fine line.`, tag: 'slang' },
  { q: 'what are paper hands?', a: `selling at the first sign of trouble.
    
    ngmi (not gonna make it).`, tag: 'slang' },
  { q: 'what is FOMO?', a: `fear of missing out.
    
    buying the top because your friends are getting rich. usually ends poorly.`, tag: 'slang' },
  { q: 'what is GM?', a: `good morning.
    
    say it back. it's civilization.`, tag: 'slang' },
  { q: 'what is shilling?', a: `"bro trust me it's the next pepe".
    
    begging people to buy your bags.`, tag: 'slang' },
  { q: 'why do communities matter?', a: `strength in numbers.
    
    a coin with no community is just a dead smart contract.`, tag: 'slang' },
  { q: 'what makes a meme viral?', a: `magic. timing. resonance.
    
    and usually a cute animal or wojak.`, tag: 'slang' },
  // ─── LIQUIDITY & PRICING (The Math) ───
  { q: 'why does liquidity matter?', a: `thicc liquidity = stable price.
    thin liquidity = rollercoaster.`, tag: 'mechanics' },
  { q: 'what happens with low liquidity?', a: `you try to sell $100 and price dumps 50%.
    
    it's bad.`, tag: 'mechanics' },
  { q: 'what affects price?', a: `buyers vs sellers.
    
    more buying -> higher price. more selling -> lower price. simple economics.`, tag: 'mechanics' },
  { q: 'why buy early?', a: `bond curves favor the brave (and the early).
    
    get in before the masses.`, tag: 'alpha' },
  { q: 'what is price discovery?', a: `market figuring out what this jpeg is worth.
    
    usually volatile at start.`, tag: 'mechanics' },
  { q: 'can price be manipulated?', a: `in low liquidity? yes.
    
    watch out for wash trading (fake volume).`, tag: 'safety' },
  { q: 'what is volatility?', a: `the heart attack factor.
    
    how much the price swings up and down.`, tag: 'mechanics' },
  { q: 'what are whales?', a: `guys with big bags.
    
    they move the market. follow their tail or get crushed.`, tag: 'slang' },
  { q: 'what is circulating supply?', a: `tokens actually in hands.
    
    burned tokens don't count. locked tokens don't count (yet).`, tag: 'mechanics' },
  // ─── PLATFORM USAGE (Using This) ───
  { q: 'do i need an account?', a: `no. connect wallet and go.
    
    web3 baby.`, tag: 'guide' },
  { q: 'can i explore trending?', a: `yeah, check the leaderboard.
    
    follow the heat `, tag: 'guide' },
  { q: 'are transactions instant?', a: `blockchain speed.
    
    usually fast, sometimes lags if network is clogged.`, tag: 'mechanics' },
  { q: 'is everything on chain?', a: `yup. public ledger.
    
    everyone can see you bought "cumrocket" at the top.`, tag: 'privacy' },
  { q: 'can i trade on mobile?', a: `if your wallet works on mobile, yes.
    
    trade from the toilet. living the dream.`, tag: 'tools' },
  // ─── ADVANCED BASICS (Big Brain) ───
  { q: 'what is tokenomics?', a: `the economic rules of the coin.
    
    how many? who gets them? inflation? deflation?`, tag: 'alpha' },
  { q: 'what is an LP token?', a: `receipt for providing liquidity.
    
    proves you own a piece of the pool. earn fees with it.`, tag: 'alpha' },
  { q: 'what is impermanent loss?', a: `the confusing way you lose money by providing liquidity.
    
    basically: if token moons, you might have made more just holding.`, tag: 'alpha' },
  { q: 'what is staking?', a: `internet interest.
    
    lock tokens, get more tokens.`, tag: 'alpha' },
  { q: 'what is a governance token?', a: `voting rights.
    
    decide the future of the protocol (usually).`, tag: 'alpha' },
  { q: 'what is burning?', a: `sending tokens to token heaven.
    
    destroys them forever. reduces supply. usually good for price.`, tag: 'alpha' },
  { q: 'what is minting?', a: `printing money.
    
    creating new tokens from thin air.`, tag: 'alpha' },
  { q: 'what is a whitelist?', a: `the VIP list.
    
    only cool kids get in early. usually sold or won.`, tag: 'alpha' },
];

type Tab = 'traders' | 'creators' | 'beginners';

const ASCII_FAQ_LINES = [
  { text: '+----------------------------------------------+', color: 'text-purple' },
  { text: '|  ███████╗     █████╗      ██████╗           |', color: 'text-green' },
  { text: '|  ██╔════╝    ██╔══██╗   ██╔═══██╗          |', color: 'text-green' },
  { text: '|  █████╗       ███████║   ██║     ██║          |', color: 'text-yellow' },
  { text: '|  ██╔══╝       ██╔══██║   ██║▄▄  ██║          |', color: 'text-yellow' },
  { text: '|  ██║            ██║   ██║   ╚██████╔╝          |', color: 'text-green' },
  { text: '|  ╚═╝            ╚═╝   ╚═╝     ╚══▀▀═╝           |', color: 'text-green' },
  { text: '+----------------------------------------------+', color: 'text-purple' },
];

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
  const [collapsedIndex, setCollapsedIndex] = useState<number | null>(null);

  const getFaqs = () => {
    switch (tab) {
      case 'traders':
        return traderFAQs;
      case 'creators':
        return creatorFAQs;
      case 'beginners':
        return beginnerFAQs;
    }
  };

  const getAccentColor = () => {
    switch (tab) {
      case 'traders':
        return 'green';
      case 'creators':
        return 'purple';
      case 'beginners':
        return 'yellow';
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
              <span className="text-green font-mono">[output]</span>{' '}
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
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm transition-colors border-r border-border ${
                  tab === 'creators'
                    ? 'bg-purple/10 text-purple'
                    : 'text-dim hover:text-foreground hover:bg-card'
                }`}
              >
                <Rocket className="size-4" />
                <span>creators</span>
                {tab === 'creators' && <span className="text-xs">●</span>}
              </button>
              <button
                onClick={() => {
                  setTab('beginners');
                  setCollapsedIndex(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm transition-colors ${
                  tab === 'beginners'
                    ? 'bg-yellow/10 text-yellow'
                    : 'text-dim hover:text-foreground hover:bg-card'
                }`}
              >
                <Terminal className="size-4" />
                <span>beginners</span>
                {tab === 'beginners' && <span className="text-xs">●</span>}
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
              const isExpanded = collapsedIndex !== i;

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
                    onClick={() => setCollapsedIndex(isExpanded ? i : null)}
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
