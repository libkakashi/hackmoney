import type {Address} from 'viem';
import {useState} from 'react';
import {formatUnits} from 'viem';
import {Globe} from 'lucide-react';

import {TwitterIcon, DiscordIcon, TelegramIcon} from '~/components/icons';
import {Button} from '~/components/ui/button';
import {Skeleton} from '~/components/ui/skeleton';
import {useTokenByAddress} from '~/hooks/use-tokens';
import {usePoolPrice} from '~/hooks/use-pool-price';

export const TokenMetadataCard = ({address}: {address?: Address}) => {
  const {data: token} = useTokenByAddress(address);
  const {data: poolPrice} = usePoolPrice(address);
  const createdAt = token ? new Date(token.createdAt * 1000) : undefined;

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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-dim">price</div>
              <Skeleton className="h-5 w-20 mt-1" />
            </div>
            <div>
              <div className="text-xs text-dim">created_at</div>
              <Skeleton className="h-5 w-32 mt-1" />
            </div>
            <div className="col-span-2 md:col-span-1">
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
      {/* Top Section: Large Image + Token Info & Links */}
      <div className="flex items-start gap-6">
        {/* Large Token Image */}
        <div className="w-48 h-48 shrink-0 border border-border flex items-center justify-center text-5xl text-purple">
          {token.symbol.slice(0, 2)}
        </div>

        {/* Token Info & Links */}
        <div className="flex-1 min-w-0 flex flex-col h-48">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-medium">{token.name}</h1>
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

          {/* Description */}
          {token.description && (
            <p className="text-sm text-dim mt-3 line-clamp-2">
              {token.description}
            </p>
          )}

          {/* Links */}
          {(token.website ||
            token.twitterUrl ||
            token.discordUrl ||
            token.telegramUrl) && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-auto mb-2">
              {token.website && (
                <a
                  href={token.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-dim hover:text-green"
                >
                  <Globe className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    {token.website.replace(/^https?:\/\//, '')}
                  </span>
                </a>
              )}
              {token.twitterUrl && (
                <a
                  href={token.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-dim hover:text-green"
                >
                  <TwitterIcon className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    {token.twitterUrl.replace(/^https?:\/\//, '')}
                  </span>
                </a>
              )}
              {token.discordUrl && (
                <a
                  href={token.discordUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-dim hover:text-green"
                >
                  <DiscordIcon className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    {token.discordUrl.replace(/^https?:\/\//, '')}
                  </span>
                </a>
              )}
              {token.telegramUrl && (
                <a
                  href={token.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-dim hover:text-green"
                >
                  <TelegramIcon className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    {token.telegramUrl.replace(/^https?:\/\//, '')}
                  </span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Token Stats - Below the whole top section */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-dim">price</div>
            <div className="tabular-nums">
              {poolPrice?.priceE18
                ? `$${formatUnits(poolPrice.priceE18, 6)}`
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
          <div className="col-span-2 md:col-span-1">
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
