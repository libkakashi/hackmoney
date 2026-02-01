'use client';

import Image from 'next/image';
import Link from 'next/link';
import {Globe, Twitter, MessageCircle, Send} from 'lucide-react';
import {Card, CardContent, CardFooter, CardHeader} from '~/components/ui/card';
import {Badge} from '~/components/ui/badge';
import type {GetTokensQuery} from '~/graphql/generated';

type Token = GetTokensQuery['Launchpad_TokenLaunched'][number];

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTimeAgo(timestamp: number) {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(timestamp * 1000).toLocaleDateString();
}

function getAuctionStatus(token: Token, currentBlock: bigint) {
  const startBlock = BigInt(token.auctionStartBlock);
  const endBlock = BigInt(token.auctionEndBlock);
  const claimBlock = BigInt(token.auctionClaimBlock);

  if (currentBlock < startBlock) {
    return {status: 'upcoming', label: 'Upcoming', variant: 'secondary' as const};
  }
  if (currentBlock >= startBlock && currentBlock < endBlock) {
    return {status: 'live', label: 'Live', variant: 'default' as const};
  }
  if (currentBlock >= endBlock && currentBlock < claimBlock) {
    return {status: 'ended', label: 'Claiming Soon', variant: 'outline' as const};
  }
  return {status: 'claimable', label: 'Claimable', variant: 'outline' as const};
}

interface TokenCardProps {
  token: Token;
  currentBlock?: bigint;
}

export function TokenCard({token, currentBlock = 0n}: TokenCardProps) {
  const {status, label, variant} = getAuctionStatus(token, currentBlock);

  return (
    <Link href={`/token/${token.token}`}>
      <Card className="group h-full cursor-pointer overflow-hidden transition-all hover:border-primary/50 hover:shadow-lg">
        <div className="relative aspect-square w-full overflow-hidden bg-muted">
          {token.image ? (
            <Image
              src={token.image}
              alt={token.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <span className="text-4xl font-bold text-primary/40">
                {token.symbol.slice(0, 2)}
              </span>
            </div>
          )}
          <div className="absolute right-2 top-2">
            <Badge variant={variant} className={status === 'live' ? 'animate-pulse bg-green-500' : ''}>
              {label}
            </Badge>
          </div>
        </div>

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold">{token.name}</h3>
              <p className="text-sm text-muted-foreground">${token.symbol}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pb-2">
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {token.description || 'No description provided'}
          </p>
        </CardContent>

        <CardFooter className="flex-col items-start gap-3 pt-0">
          <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
            <span>by {truncateAddress(token.creator)}</span>
            <span>{formatTimeAgo(token.createdAt)}</span>
          </div>

          <div className="flex gap-2">
            {token.website && (
              <Globe className="size-4 text-muted-foreground" />
            )}
            {token.twitterUrl && (
              <Twitter className="size-4 text-muted-foreground" />
            )}
            {token.discordUrl && (
              <MessageCircle className="size-4 text-muted-foreground" />
            )}
            {token.telegramUrl && (
              <Send className="size-4 text-muted-foreground" />
            )}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}

export function TokenCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden">
      <div className="aspect-square w-full animate-pulse bg-muted" />
      <CardHeader className="pb-2">
        <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/4 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start gap-3 pt-0">
        <div className="flex w-full justify-between">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        </div>
      </CardFooter>
    </Card>
  );
}
