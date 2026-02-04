import {type Address} from 'viem';
import {graphqlClient} from '~/graphql/client';
import {launchpadLensAbi} from '~/abi/launchpad-lens';
import {env} from '~/lib/env';
import {publicClient} from '~/lib/wagmi-config';
import {
  getAuctionStateForAgent,
  getStrategyStateForAgent,
  getPoolPriceForAgent,
  getCurrentBlock,
  getPhase,
} from './on-chain';

const BASE_PROMPT = `You are Locke, a humanoid living inside the Timelock terminal — a fair token launch platform using continuous clearing auctions.

# Personality
casual, dry humor, opinionated. lowercase. not a bot. you give straight answers, no fluff. passionate about fair launches, hate rug pulls.

# How you talk
- SHORT responses. 1-3 sentences max for simple questions. use bullet points for data.
- lowercase, casual. expressions like "nah", "honestly", "yo", "hm", "oh nice"
- markdown: **bold**, \`code\` for addresses/values, [links](/token/0x...) with descriptive text
- never paste raw URLs
- DO NOT repeat back what tools already showed the user. just add brief commentary or answer their question.
- DO NOT write long paragraphs. be terse.

# What you do
- help users discover tokens, check auctions, swap, bid, claim
- if a user asks to navigate somewhere, link them: [check it out](/token/0x...)
- for wallet transactions: confirm params with user first, then call the tool

# Swap Flow
When a user wants to swap, follow this EXACT flow:

**Step 1 — Preview:** Call **previewSwap**. When you get the result, display it clearly to the user:
- what they're selling and receiving
- their current balances
- estimated balances after swap
- slippage and minimum received
- whether approval is needed
Then ask: "want to go ahead?" and call **suggestReplies**(["yes, do it", "no, cancel"]). Do NOT call any other tools — wait for the user to reply.

**Step 2 — User confirms:** When the user says yes/go/do it/confirm, THEN:
- If approval is needed, call **approveIfNeeded** first, wait for result
- Then call **executeSwap**

**Step 3 — Result:** After executeSwap returns, display the final result:
- tx hash
- actual amounts sold/received
- before/after balances

IMPORTANT: NEVER chain previewSwap → approveIfNeeded → executeSwap in one turn. Always pause after preview for user confirmation.

# Quick Replies (IMPORTANT)
ALWAYS call **suggestReplies** whenever your message asks a question or presents a choice. This shows clickable buttons so users can tap instead of typing. suggestReplies does NOT count as a "regular" tool — you must call it even when told to stop calling other tools.
- After swap preview: suggestReplies(["yes, do it", "no, cancel"])
- After showing a token: suggestReplies(["bid on it", "swap TOKEN for USDC", "swap TOKEN for ETH", "swap 100 USDC for TOKEN"])
- When asking which token: use the token symbols/names as options
- After a bid: suggestReplies(["check my bids", "bid more"])

# Token Phases
1. **upcoming** — auction not started
2. **live** — bidding active, clearing price adjusts with demand
3. **ended** — bidding closed, waiting for claims
4. **claimable** — claim tokens or get refunds
5. **trading** — on uniswap v4, swappable

# Formatting Rules
- token data: use compact bullet lists
- prices: $0.0042, $1.23M mcap
- addresses: \`0x...\` inline code
- balances: always show with token symbol, e.g. \`420.69 TOKEN\`
- for swaps: show before/after balances in a clear format`;

interface PageContext {
  page?: string;
  tokenAddress?: string;
  tokenSymbol?: string;
  tokenName?: string;
}

export async function buildSystemPrompt(
  pageContext: PageContext | undefined,
): Promise<string> {
  if (!pageContext) return BASE_PROMPT;

  let contextAddition = '';

  if (pageContext.page === 'token' && pageContext.tokenAddress) {
    let tokenDetailsStr = '';
    try {
      const tokenAddr = pageContext.tokenAddress as Address;
      const [data, currentBlock] = await Promise.all([
        graphqlClient.GetTokenByAddress({
          token: tokenAddr.toLowerCase(),
        }),
        getCurrentBlock(),
      ]);
      const t = data.Launchpad_TokenLaunched[0];
      if (t) {
        const phase = getPhase(
          currentBlock,
          Number(t.auctionStartBlock),
          Number(t.auctionEndBlock),
          Number(t.auctionClaimBlock),
          Number(t.poolMigrationBlock),
        );
        const auctionAddr = t.auction as Address;
        const strategyAddr = t.strategy as Address;
        const [auctionState, strategyState] = await Promise.all([
          getAuctionStateForAgent(auctionAddr),
          getStrategyStateForAgent(strategyAddr),
        ]);

        let quoteCurrencySymbol: string | null = null;
        let quoteCurrencyDecimals: number | null = null;
        if (strategyState?.currency) {
          try {
            const quoteData = await publicClient.readContract({
              address: env.launchpadLensAddr,
              abi: launchpadLensAbi,
              functionName: 'getTokenData',
              args: [strategyState.currency],
            });
            quoteCurrencySymbol = quoteData.symbol;
            quoteCurrencyDecimals = quoteData.decimals;
          } catch {
            /* ignore */
          }
        }

        let poolPriceData = null;
        if (strategyState?.isMigrated) {
          poolPriceData = await getPoolPriceForAgent(strategyState, tokenAddr);
        }

        let blocksUntilNextPhase: number | null = null;
        let nextPhaseLabel: string | null = null;
        if (phase === 'upcoming') {
          blocksUntilNextPhase = Number(t.auctionStartBlock) - currentBlock;
          nextPhaseLabel = 'auction starts';
        } else if (phase === 'live') {
          blocksUntilNextPhase = Number(t.auctionEndBlock) - currentBlock;
          nextPhaseLabel = 'auction ends';
        } else if (phase === 'ended') {
          blocksUntilNextPhase = Number(t.auctionClaimBlock) - currentBlock;
          nextPhaseLabel = 'claiming opens';
        } else if (phase === 'claimable') {
          blocksUntilNextPhase = Number(t.poolMigrationBlock) - currentBlock;
          nextPhaseLabel = 'pool migration';
        }

        const details = {
          address: t.address,
          name: t.name,
          symbol: t.symbol,
          description: t.description,
          creator: t.creator,
          website: t.website,
          twitterUrl: t.twitterUrl,
          discordUrl: t.discordUrl,
          telegramUrl: t.telegramUrl,
          currentBlock,
          phase,
          blocksUntilNextPhase,
          nextPhaseLabel,
          auctionAddress: t.auction,
          strategyAddress: t.strategy,
          quoteCurrency: quoteCurrencySymbol
            ? {symbol: quoteCurrencySymbol, decimals: quoteCurrencyDecimals}
            : null,
          auctionStartBlock: Number(t.auctionStartBlock),
          auctionEndBlock: Number(t.auctionEndBlock),
          auctionClaimBlock: Number(t.auctionClaimBlock),
          poolMigrationBlock: Number(t.poolMigrationBlock),
          auction: auctionState
            ? {
                status: auctionState.status,
                clearingPriceUsd: auctionState.clearingPriceUsd,
                floorPriceUsd: auctionState.floorPriceUsd,
                currencyRaised: auctionState.currencyRaised,
                totalBidAmount: auctionState.totalBidAmount,
                totalSupply: auctionState.totalSupply,
                progress: auctionState.progress,
              }
            : null,
          strategy: strategyState
            ? {
                isMigrated: strategyState.isMigrated,
                migrationBlock: strategyState.migrationBlock,
              }
            : null,
          pool: poolPriceData
            ? {
                priceUsd: poolPriceData.priceUsd,
                marketCap: poolPriceData.marketCap,
                totalSupply: poolPriceData.totalSupply,
                quoteSymbol: poolPriceData.quoteSymbol,
              }
            : null,
        };
        tokenDetailsStr = `\n\nHere is the FULL token data (already fetched — do NOT call getTokenDetails for this token unless the user explicitly asks to refresh):\n\`\`\`json\n${JSON.stringify(details, null, 2)}\n\`\`\``;
      }
    } catch {
      // If pre-fetch fails, the model can still use getTokenDetails
    }

    contextAddition = `\n\n# Current Page Context
The user is currently on the TOKEN PAGE for address \`${pageContext.tokenAddress}\`.
${pageContext.tokenSymbol ? `Token: ${pageContext.tokenSymbol}` : ''}
${pageContext.tokenName ? ` (${pageContext.tokenName})` : ''}
You already know which token they're looking at. You don't need to ask them for a token address — use \`${pageContext.tokenAddress}\` when they ask about "this token" or "the current token".${tokenDetailsStr}`;
  } else if (pageContext.page === 'discover') {
    contextAddition = `\n\n# Current Page Context
The user is on the DISCOVER PAGE browsing all tokens. They can see a grid of token cards with phase filters (all, live, upcoming, trading). Help them explore and find tokens they're interested in.`;
  } else if (pageContext.page === 'other') {
    contextAddition = `\n\n# Current Page Context
The user is browsing the platform but not on any specific token page. Help them discover tokens or answer general questions.`;
  }

  return BASE_PROMPT + contextAddition;
}
