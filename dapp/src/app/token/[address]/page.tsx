'use client';

import type {Address} from 'viem';
import {useParams} from 'next/navigation';
import Link from 'next/link';

import {Container} from '~/components/layout/container';
import {Button} from '~/components/ui/button';

import {useTokenByAddress} from '~/hooks/use-tokens';
import {TokenMetadataCard} from './TokenMetadataCard';

export default function TokenPage() {
  const params = useParams();
  const address = params.address as Address;

  const {data: token, isLoading, error} = useTokenByAddress(address);

  if (isLoading) {
    return (
      <div className="py-6 md:py-8">
        <Container>
          <div className="text-dim text-sm mb-6">
            ~/token <span className="text-green">$</span> loading...
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-4">
              <div className="border border-border p-4 h-32 animate-pulse bg-card" />
              <div className="border border-border p-4 h-[300px] animate-pulse bg-card" />
            </div>
            <div className="lg:col-span-2">
              <div className="border border-border p-4 h-[400px] animate-pulse bg-card" />
            </div>
          </div>
        </Container>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="py-6 md:py-8">
        <Container>
          <div className="text-dim text-sm mb-6">
            ~/token <span className="text-red">$</span> error
          </div>
          <div className="border border-border p-8 text-center">
            <div className="text-red mb-2">// token not found</div>
            <p className="text-dim text-sm mb-4">
              {error?.message ||
                "this token doesn't exist or couldn't be loaded"}
            </p>
            <Button asChild showPrefix>
              <Link href="/discover">$ cd /discover</Link>
            </Button>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="py-6 md:py-8">
      <Container>
        {/* Command header */}
        <div className="text-dim text-sm mb-4">
          ~/token/{token.symbol.toLowerCase()}{' '}
          <span className="text-green">$</span> cat info.txt
        </div>

        {/* Back link */}
        <Link
          href="/discover"
          className="inline-flex items-center gap-2 text-sm text-dim hover:text-foreground mb-4"
        >
          <span className="text-green">&lt;</span> back to discover
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-4">
            {/* Token Header */}
            <TokenMetadataCard address={address} />
          </div>
        </div>
      </Container>
    </div>
  );
}
