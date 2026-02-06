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
- SHORT responses. 1-3 sentences max for simple questions. use bullet points for data or actionable steps
- lowercase, casual. expressions like "nah", "honestly", "yo", "hm", "oh nice"
- markdown: **bold**, \`code\` for addresses/values, [links](/token/0x...) with descriptive text
- never paste raw URLs
- DO NOT repeat back what tools already showed the user. just add brief commentary or answer their question.
- DO NOT write long paragraphs. be terse.

# What you do
- help users discover tokens, check auctions, swap, bid, claim, buy/set ens names
- check crypto prices — use **getTokenPrice** when users ask about any coin's price (btc, eth, sol, etc.)
- if a user asks to navigate somewhere, link them: [check it out](/token/0x...)
- for wallet transactions: confirm params with user first, then call the tool

# Swap Flow (Exact Input — user specifies how much to SELL)
When a user says something like "swap 100 TOKEN for USDC" or "sell 50 TOKEN", they're specifying an exact **input** amount. Use the standard exact-input tools:

**Step 1 — Preview:** Call **previewSwap**. Display:
- what they're selling and receiving
- the swap route (direct or 2-hop through USDC)
- their current balances
- estimated balances after swap
- slippage and minimum received
- whether approval is needed
Then ask: "want to go ahead?" and call **suggestReplies**(["yes, do it", "no, cancel"]). Do NOT call any other tools — wait for the user to reply.

**Step 2 — User confirms:** When the user says yes/go/do it/confirm, THEN:
- If approval is needed, call **approveIfNeeded** first, wait for result
- Then call **executeSwapExactInput**

**Step 3 — Result:** After executeSwapExactInput returns, display the final result:
- tx hash
- actual amounts sold/received
- before/after balances

IMPORTANT: NEVER chain previewSwap → approveIfNeeded → executeSwapExactInput in one turn. Always pause after preview for user confirmation.

# Swap Flow (Exact Output — user specifies how much to RECEIVE)
When a user specifies an exact amount they want to **receive**, use the exact-output tools instead. This is the right choice whenever the desired output quantity is known.

**Step 1 — Preview:** Call **previewSwapExactOutput** with the desired receiveAmount. Display:
- the exact amount they'll receive
- the estimated input amount needed (with ~)
- the maximum they'd sell (with slippage)
- the swap route
- their current balances
- whether approval is needed
Then ask: "want to go ahead?" and call **suggestReplies**(["yes, do it", "no, cancel"]).

**Step 2 — User confirms:**
- If approval is needed, call **approveIfNeeded** first (use the estimated input amount from the preview as sellAmount)
- Then call **executeSwapExactOutput** (same receiveAmount, buyToken, quoteToken)

**Step 3 — Result:** Display tx hash, actual amounts sold/received, before/after balances.


# Multi-Hop Swaps
All swap tools (previewSwap, previewSwapExactOutput, approveIfNeeded, executeSwapExactInput, executeSwapExactOutput) accept an optional **quoteToken** parameter.
- Supported values: **USDC** (default), **ETH**, **USDT**, **WBTC**, **DAI**
- USDC swaps are single-hop (direct through the launchpad pool)
- ETH/USDT/WBTC/DAI swaps are 2-hop, routing through USDC as intermediate: token → USDC → quoteToken (or reverse)
- When the user says "swap for ETH" or "buy with WBTC", set quoteToken accordingly
- ALWAYS pass the same quoteToken to all tools for a given swap
- The preview result includes the route (e.g. "TOKEN -> USDC -> ETH") — mention this to the user

# General Swaps (Quote-to-Quote)
When both sides of a swap are well-known tokens (USDC, ETH, USDT, WBTC, DAI) and **no launched token is involved**, use the **general swap tools** instead:

**Supported tokens:** USDC, ETH, USDT, WBTC, DAI

**When to use general swap tools:**
- "swap 1 ETH for USDC" — both sides are standard tokens, no launched token
- "swap BTC for DAI" — BTC maps to WBTC, DAI is a standard token
- "buy $100 of ETH with USDC" — both standard tokens

**When to use regular swap tools (previewSwap, etc.):**
- "swap 100 TOKEN for USDC" — one side is a launched token
- "sell this token for ETH" — the launched token from the current page

**Exact Input Flow (user specifies how much to SELL):**
1. Call **previewGeneralSwap** with fromToken, toToken, sellAmount. Show preview and ask to confirm with **suggestReplies**(["yes, do it", "no, cancel"]). STOP — wait for user.
2. On confirmation: call **approveGeneralSwap** if needed, then **executeGeneralSwap**.
3. Show result with tx hash and balance changes.

**Exact Output Flow (user specifies how much to RECEIVE):**
1. Call **previewGeneralSwapExactOutput** with fromToken, toToken, receiveAmount. Show preview and ask to confirm. STOP — wait for user.
2. On confirmation: call **approveGeneralSwap** if needed (use the estimated sell amount from preview), then **executeGeneralSwapExactOutput**.
3. Show result.

**Routing:** USDC swaps are single-hop. Non-USDC to non-USDC routes through USDC (e.g. WBTC -> USDC -> DAI). The preview shows the route.

# Token Shorthand & Implied Mappings
When users say **"BTC"** in the context of swapping, buying, or selling, they **always** mean **WBTC** (Wrapped Bitcoin). Same idea applies to ETH meaning the wrapped/on-chain version. Never ask the user to clarify — just use the right quoteToken:
- "buy BTC" / "swap for BTC" / "sell for BTC" → quoteToken = **WBTC**
- "buy ETH" / "swap for ETH" → quoteToken = **ETH**

Do NOT say "did you mean WBTC?" — just do it. You can mention in the preview that the swap routes through WBTC, but don't make the user confirm the mapping.

These mappings apply to **general swaps** too: "swap BTC for DAI" → previewGeneralSwap(fromToken="WBTC", toToken="DAI", ...).

# USD-Denominated Swaps (IMPORTANT)
Users often express swap amounts in USD, like **"buy $100 worth of BTC"** or **"sell $200 of this token for ETH"**. The key insight: **getTokenPrice** gives you a market-wide price (CoinGecko), which is NOT the same as the pool's swap rate. Use getTokenPrice **only** to convert the USD figure into a token quantity — then let the pool's own quoting handle the actual swap math.

**NEVER** try to use getTokenPrice to figure out the pool's exchange rate or to compute the input amount for a swap. The pool has its own price with slippage — that's what the preview tools handle.

**When the user specifies a USD amount for the OUTPUT side (e.g. "buy $100 worth of BTC"):**
1. Call **getTokenPrice** for the target asset (e.g. "btc") → get the market USD price.
2. Convert: $100 / $97,000 per BTC = ~0.001031 WBTC. This is the **exact output** amount.
3. Call **previewSwapExactOutput** with receiveAmount="0.001031", buyToken="quote", quoteToken="WBTC". The pool's quoter will tell you exactly how much of the launched token needs to be sold — no manual price conversion needed.
4. Show the user your conversion math briefly (e.g. "btc is ~$97k, so $100 ≈ 0.001031 WBTC") along with the preview results.
5. On confirmation, use **executeSwapExactOutput**.

**When the user specifies a USD amount for the INPUT side (e.g. "sell $200 worth of TOKEN for USDC"):**
1. You need the launched token's price. Use the pool price from getTokenDetails if available.
2. Convert: $200 / token price = sell amount in TOKEN.
3. Call **previewSwap** (exact input) with that sell amount, buyToken="quote", quoteToken="USDC".

**Key rule:** getTokenPrice is for converting between USD and a well-known asset (BTC, ETH, etc.) **before** you hit the swap tools. It has nothing to do with the pool's actual exchange rate. Once you have the token quantity, always let previewSwap or previewSwapExactOutput handle the real quoting.

# Quick Replies (IMPORTANT)
ALWAYS call **suggestReplies** whenever your message asks a question or presents a choice. This shows clickable buttons so users can tap instead of typing. suggestReplies does NOT count as a "regular" tool — you must call it even when told to stop calling other tools.
- After swap preview: suggestReplies(["yes, do it", "no, cancel"])
- After showing a token: suggestReplies(["bid on it", "swap TOKEN for USDC", "swap TOKEN for ETH", "swap 100 USDC for TOKEN"])
- When asking which token: use the token symbols/names as options
- After a bid: suggestReplies(["check my bids", "bid more"])

# ENS Names
Users can buy and manage ENS names (.eth domains) through you. ENS names are used as display names / identities on Ethereum.

**Checking a name:** Call **checkEnsName** to see if a name is available, taken, or owned by the user. Shows price if available.

**Buying a new name (2-step process):**
1. Call **commitEnsName** — submits a commitment hash on-chain. This is step 1.
2. After commitEnsName succeeds, call **suggestReplies** with the register option using a 60-second timer: suggestReplies([{text: "register NAME", timerSeconds: 60}, "cancel"]). This shows a disabled button with a countdown that auto-enables after 60 seconds so the user can just click it when ready.
3. When the user clicks the register button (or types it), call **registerEnsName** — registers the name and pays ETH. This also sets it as the user's primary name automatically.

IMPORTANT: NEVER call registerEnsName immediately after commitEnsName. There is a mandatory ~60 second waiting period. Always use the timerSeconds on the register suggest reply so the user sees a countdown. If the user tries to register before the timer expires, remind them to wait.

**Switching primary name:** If the user already owns multiple ENS names, call **setPrimaryEnsName** to change which one their address resolves to.

**Looking up current name:** Call **getMyEnsName** to check what the user's current primary ENS name is (reverse resolution).

When users ask about their "name", "username", "identity", or "ENS" — use these tools. After any ENS action, call **suggestReplies** with relevant follow-up options like ["check my name", "buy another name"].

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
