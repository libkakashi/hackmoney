import {formatUnits, type Address} from 'viem';
import {launchpadLensAbi} from '~/abi/launchpad-lens';
import {launchpadAbi} from '~/abi/launchpad';
import {env} from '~/lib/env';
import {publicClient} from '~/lib/wagmi-config';
import {USDC_ADDRESS} from '~/lib/pools';

const POOL_FEE = 10000;
const POOL_TICK_SPACING = 60;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address;

export async function getPoolInfoForAgent(tokenAddr: Address) {
  try {
    const poolManager = await publicClient.readContract({
      address: env.launchpadAddr,
      abi: launchpadAbi,
      functionName: 'POOL_MANAGER',
    });

    const poolInfo = await publicClient.readContract({
      address: env.launchpadLensAddr,
      abi: launchpadLensAbi,
      functionName: 'getPoolInfo',
      args: [poolManager, tokenAddr, USDC_ADDRESS, POOL_FEE, POOL_TICK_SPACING],
    });

    return {
      isInitialized: poolInfo.isInitialized,
      poolManager: poolManager as Address,
      currency0: poolInfo.currency0,
      currency1: poolInfo.currency1,
      fee: poolInfo.fee,
      tickSpacing: poolInfo.tickSpacing,
      hooks: ZERO_ADDRESS,
    };
  } catch {
    return null;
  }
}

export async function getPoolPriceForAgent(tokenAddr: Address) {
  try {
    const poolInfo = await getPoolInfoForAgent(tokenAddr);
    if (!poolInfo || !poolInfo.isInitialized) return null;

    const poolKey = {
      currency0: poolInfo.currency0,
      currency1: poolInfo.currency1,
      fee: poolInfo.fee,
      tickSpacing: poolInfo.tickSpacing,
      hooks: poolInfo.hooks,
    };

    const price = await publicClient.readContract({
      address: env.launchpadLensAddr,
      abi: launchpadLensAbi,
      functionName: 'getPoolPrice',
      args: [poolInfo.poolManager, poolKey],
    });

    const tokenData = await publicClient.readContract({
      address: env.launchpadLensAddr,
      abi: launchpadLensAbi,
      functionName: 'getTokenData',
      args: [tokenAddr],
    });

    const tokenIsToken0 =
      poolInfo.currency0.toLowerCase() === tokenAddr.toLowerCase();

    const quoteAddr = tokenIsToken0
      ? poolInfo.currency1
      : poolInfo.currency0;
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
