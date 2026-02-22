import type {Address} from 'viem';
import {useState} from 'react';
import {formatUnits} from 'viem';
import {Button} from '~/components/ui/button';
import {Skeleton} from '~/components/ui/skeleton';
import {useTokenByAddress} from '~/hooks/use-tokens';
import {usePoolPrice} from '~/hooks/use-pool-price';
import {useTokenData} from '~/hooks/tokens/use-token-data';
import {usePoolKey} from '~/hooks/swap/use-pool-key';

export const TokenMetadataCard = ({address}: {address?: Address}) => {
  const {data: token} = useTokenByAddress(address);
  const {data: poolKeyData} = usePoolKey(address);
  const poolKey = poolKeyData?.poolKey;
  const {data: poolPrice} = usePoolPrice(address);
  const {data: tokenData} = useTokenData(address);
  const createdAt = token ? new Date(token.createdAt * 1000) : undefined;

  const token0 = poolKey?.currency0;
  const token1 = poolKey?.currency1;

  const {data: {decimals: token0Decimals} = {}} = useTokenData(token0);
  const {data: {decimals: token1Decimals} = {}} = useTokenData(token1);

  // priceE18 = token1/token0 scaled by 1e18 (how much token1 per token0)
  // If token is token0, priceE18 is already quote/token (correct direction)
  // If token is token1, we need to invert: 1e36 / priceE18 to get quote/token
  const tokenIsToken0 = token0?.toLowerCase() === address?.toLowerCase();
  const quoteDecimals = tokenIsToken0 ? token1Decimals : token0Decimals;
  const tokenDecimals = tokenIsToken0 ? token0Decimals : token1Decimals;

  // Normalize price to always be quote/token, scaled by 1e18
  const normalizedPriceE18 =
    poolPrice?.priceE18 && poolPrice.priceE18 > 0n
      ? tokenIsToken0
        ? poolPrice.priceE18
        : 10n ** 36n / poolPrice.priceE18
      : undefined;

  // Calculate market cap: totalSupply * price
  // normalizedPriceE18 is quote/token scaled by 1e18, totalSupply is already formatted
  const marketCap =
    normalizedPriceE18 && tokenData && quoteDecimals && tokenDecimals
      ? Number(
          formatUnits(normalizedPriceE18, 18 + quoteDecimals - tokenDecimals),
        ) * Number(tokenData.totalSupply)
      : undefined;

  const [copied, setCopied] = useState(false);
  const [copiedCreator, setCopiedCreator] = useState(false);

  const copyAddress = () => {
    if (!address) return;
    void navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCreator = () => {
    if (!token?.creator) return;
    void navigator.clipboard.writeText(token.creator);
    setCopiedCreator(true);
    setTimeout(() => setCopiedCreator(false), 2000);
  };

  if (!address || !token) {
    return (
      <div className="border border-border bg-card p-4">
        <div className="flex items-start gap-6">
          <Skeleton className="w-48 h-48 shrink-0" />
          <div className="flex-1 min-w-0">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-32 mt-2" />
            <Skeleton className="h-4 w-48 mt-3" />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-dim">price</div>
              <Skeleton className="h-5 w-20 mt-1" />
            </div>
            <div>
              <div className="text-xs text-dim">market_cap</div>
              <Skeleton className="h-5 w-24 mt-1" />
            </div>
            <div>
              <div className="text-xs text-dim">created_at</div>
              <Skeleton className="h-5 w-32 mt-1" />
            </div>
            <div>
              <div className="text-xs text-dim">creator</div>
              <Skeleton className="h-5 w-28 mt-1" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border bg-card p-4">
      {/* Top Section: Token Symbol + Info */}
      <div className="flex items-start gap-6">
        {/* Token Symbol */}
        <div className="w-48 h-48 shrink-0 border border-border flex items-center justify-center text-5xl text-purple overflow-hidden">
          {token.symbol.slice(0, 2)}
        </div>

        {/* Token Info */}
        <div className="flex-1 min-w-0 flex flex-col h-48">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-medium">{token.name}</h1>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-dim">{token.symbol}</span>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={copyAddress}
                  className="text-dim hover:text-foreground"
                >
                  {address.slice(0, 6)}...{address.slice(-4)}
                  <span className="text-green">
                    {copied ? '[copied]' : '[copy]'}
                  </span>
                </Button>
              </div>
            </div>
            <a
              href={`https://etherscan.io/token/${token.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-dim hover:text-green text-xs shrink-0"
            >
              [etherscan]
            </a>
          </div>
        </div>
      </div>

      {/* Token Stats - Below the whole top section */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex justify-between gap-4">
          <div>
            <div className="text-xs text-dim">price</div>
            <div className="tabular-nums">
              {normalizedPriceE18 && quoteDecimals && tokenDecimals
                ? `$${Number(formatUnits(normalizedPriceE18, 18 + quoteDecimals - tokenDecimals)).toFixed(4)}`
                : '-'}
            </div>
          </div>
          <div>
            <div className="text-xs text-dim">market_cap</div>
            <div className="tabular-nums">
              {marketCap !== undefined
                ? `$${marketCap.toLocaleString(undefined, {maximumFractionDigits: 2})}`
                : '-'}
            </div>
          </div>
          <div>
            <div className="text-xs text-dim">created_at</div>
            <div className="tabular-nums text-sm">
              {createdAt
                ? createdAt.toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '-'}
            </div>
          </div>
          <div>
            <div className="text-xs text-dim">creator</div>
            <Button
              variant="ghost"
              size="xs"
              onClick={copyCreator}
              className="hover:text-purple"
            >
              {token.creator.slice(0, 6)}...{token.creator.slice(-4)}
              <span className="text-green">
                {copiedCreator ? '[copied]' : '[copy]'}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
