import {formatUnits, type Address} from 'viem';
import {launchpadLensAbi} from '~/abi/launchpad-lens';
import {env} from '~/lib/env';
import {publicClient} from '~/lib/wagmi-config';
import {priceQ96ToUsd} from '~/lib/cca/utils';

const STATUS_MAP = {
  0: 'not_started',
  1: 'active',
  2: 'ended',
  3: 'claimable',
} as const;

export async function getAuctionStateForAgent(auctionAddr: Address) {
  try {
    const state = await publicClient.readContract({
      address: env.launchpadLensAddr,
      abi: launchpadLensAbi,
      functionName: 'getAuctionState',
      args: [auctionAddr],
    });

    const tokenDecimals = state.tokenDecimals;
    const currencyDecimals = state.currencyDecimals;

    return {
      status:
        STATUS_MAP[state.status as keyof typeof STATUS_MAP] ?? 'not_started',
      clearingPriceUsd: priceQ96ToUsd(
        state.clearingPriceQ96,
        currencyDecimals,
        tokenDecimals,
      ),
      currencyRaised: formatUnits(state.currencyRaised, currencyDecimals),
      totalBidAmount: formatUnits(state.totalBidAmount, currencyDecimals),
      totalSupply: formatUnits(BigInt(state.totalSupply), tokenDecimals),
      startBlock: Number(state.startBlock),
      endBlock: Number(state.endBlock),
      claimBlock: Number(state.claimBlock),
      floorPriceUsd: priceQ96ToUsd(
        state.floorPriceQ96,
        currencyDecimals,
        tokenDecimals,
      ),
      progress: state.progress,
      tokenDecimals,
      currencyDecimals,
    };
  } catch {
    return null;
  }
}

export async function getStrategyStateForAgent(strategyAddr: Address) {
  try {
    const state = await publicClient.readContract({
      address: env.launchpadLensAddr,
      abi: launchpadLensAbi,
      functionName: 'getStrategyState',
      args: [strategyAddr],
    });

    return {
      isMigrated: state.isMigrated,
      migrationBlock: Number(state.migrationBlock),
      poolManager: state.poolManager,
      currency0: state.currency0,
      currency1: state.currency1,
      token: state.token,
      currency: state.currency,
      fee: state.fee,
      tickSpacing: state.tickSpacing,
      hooks: state.hooks,
    };
  } catch {
    return null;
  }
}

export async function getPoolPriceForAgent(
  strategyState: NonNullable<
    Awaited<ReturnType<typeof getStrategyStateForAgent>>
  >,
  tokenAddr: Address,
) {
  if (!strategyState.isMigrated) return null;

  try {
    const poolKey = {
      currency0: strategyState.currency0,
      currency1: strategyState.currency1,
      fee: strategyState.fee,
      tickSpacing: strategyState.tickSpacing,
      hooks: strategyState.hooks,
    };

    const price = await publicClient.readContract({
      address: env.launchpadLensAddr,
      abi: launchpadLensAbi,
      functionName: 'getPoolPrice',
      args: [strategyState.poolManager, poolKey],
    });

    const tokenData = await publicClient.readContract({
      address: env.launchpadLensAddr,
      abi: launchpadLensAbi,
      functionName: 'getTokenData',
      args: [tokenAddr],
    });

    const tokenIsToken0 =
      strategyState.currency0.toLowerCase() === tokenAddr.toLowerCase();

    const quoteAddr = tokenIsToken0
      ? strategyState.currency1
      : strategyState.currency0;
    const quoteData = await publicClient.readContract({
      address: env.launchpadLensAddr,
      abi: launchpadLensAbi,
      functionName: 'getTokenData',
      args: [quoteAddr],
    });

    const normalizedPriceE18 =
      price.priceE18 > 0n
        ? tokenIsToken0
          ? price.priceE18
          : 10n ** 36n / price.priceE18
        : 0n;

    const priceUsd =
      normalizedPriceE18 > 0n
        ? Number(
            formatUnits(
              normalizedPriceE18,
              18 + quoteData.decimals - tokenData.decimals,
            ),
          )
        : 0;

    const marketCap =
      priceUsd > 0
        ? priceUsd *
          Number(formatUnits(tokenData.totalSupply, tokenData.decimals))
        : 0;

    return {
      priceUsd,
      marketCap,
      totalSupply: formatUnits(tokenData.totalSupply, tokenData.decimals),
      tokenDecimals: tokenData.decimals,
      quoteSymbol: quoteData.symbol,
      quoteDecimals: quoteData.decimals,
    };
  } catch {
    return null;
  }
}

export async function getCurrentBlock(): Promise<number> {
  try {
    const block = await publicClient.getBlockNumber();
    return Number(block);
  } catch {
    return 0;
  }
}

export function getPhase(
  currentBlock: number,
  startBlock: number,
  endBlock: number,
  claimBlock: number,
  migrationBlock: number,
): string {
  if (currentBlock < startBlock) return 'upcoming';
  if (currentBlock >= startBlock && currentBlock < endBlock) return 'live';
  if (currentBlock >= endBlock && currentBlock < claimBlock) return 'ended';
  if (currentBlock >= claimBlock && currentBlock < migrationBlock)
    return 'claimable';
  return 'trading';
}
