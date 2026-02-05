'use client';

import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import {cn} from '~/lib/utils';
import {QUOTE_TOKENS, type QuoteToken} from '~/lib/pools';

/** Map token symbols to their icon paths */
const TOKEN_ICONS: Record<string, string> = {
  USDC: '/tokens/usdc.svg',
  ETH: '/tokens/eth.svg',
  USDT: '/tokens/usdt.svg',
  WBTC: '/tokens/wbtc.svg',
  DAI: '/tokens/dai.svg',
};

interface TokenSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedToken: QuoteToken;
  onSelect: (token: QuoteToken) => void;
}

export function TokenSelectorModal({
  open,
  onOpenChange,
  selectedToken,
  onSelect,
}: TokenSelectorModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-green">$ nyx select --token</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <p className="text-sm text-cyan-400">
            // choose a quote token for your swap
          </p>

          <div className="space-y-1">
            {QUOTE_TOKENS.map(token => {
              const isSelected =
                token.address.toLowerCase() ===
                selectedToken.address.toLowerCase();
              const icon = TOKEN_ICONS[token.symbol];

              return (
                <button
                  key={token.address}
                  type="button"
                  onClick={() => {
                    onSelect(token);
                    onOpenChange(false);
                  }}
                  className={cn(
                    'flex items-center gap-3 w-full px-3 py-2.5 text-left border transition-colors',
                    isSelected
                      ? 'border-green bg-green/5'
                      : 'border-border hover:border-dim',
                  )}
                >
                  {/* Token icon */}
                  <div className="shrink-0 size-7 rounded-full overflow-hidden bg-background border border-border flex items-center justify-center">
                    {icon ? (
                      <Image
                        src={icon}
                        alt={token.symbol}
                        width={28}
                        height={28}
                      />
                    ) : (
                      <span className="text-[10px] text-dim">?</span>
                    )}
                  </div>

                  {/* Token info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          isSelected ? 'text-green' : 'text-foreground',
                        )}
                      >
                        {token.symbol}
                      </span>
                      {token.intermediatePool && (
                        <span className="text-[10px] text-dim">[2-hop]</span>
                      )}
                    </div>
                    <span className="text-[10px] text-dim font-mono truncate block">
                      {token.address.slice(0, 6)}...{token.address.slice(-4)}
                    </span>
                  </div>

                  {/* Selected indicator */}
                  {isSelected && (
                    <span className="shrink-0 text-green text-xs font-mono">
                      [*]
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-dim text-center">esc to close</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
