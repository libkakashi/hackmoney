'use client';

import {useMutation} from '@tanstack/react-query';
import {useState} from 'react';
import {toast} from 'sonner';
import {
  formatEther,
  formatUnits,
  parseEther,
  parseUnits,
  type Address,
} from 'viem';
import {useBalance, useConnection} from 'wagmi';

import {useTokenBalance} from '~/hooks/tokens/use-token-balance';

import {Button} from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import {env} from '~/lib/env';
import {Loader} from './ui/loader';

// USDC address on mainnet (used in fork)
const USDC_ADDRESS: Address = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
// Circle's USDC whale address (has billions of USDC)
const USDC_WHALE: Address = '0x55FE002aefF02F77364de339a1292923A15844B8';

function EthLogo({className}: {className?: string}) {
  return (
    <svg
      className={className}
      viewBox="0 0 256 417"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid"
    >
      <path
        fill="#343434"
        d="m127.961 0-2.795 9.5v275.668l2.795 2.79 127.962-75.638z"
      />
      <path fill="#8C8C8C" d="M127.962 0 0 212.32l127.962 75.639V154.158z" />
      <path
        fill="#3C3C3B"
        d="m127.961 312.187-1.575 1.92v98.199l1.575 4.6L256 236.587z"
      />
      <path fill="#8C8C8C" d="M127.962 416.905v-104.72L0 236.585z" />
      <path fill="#141414" d="m127.961 287.958 127.96-75.637-127.96-58.162z" />
      <path fill="#393939" d="m.001 212.321 127.96 75.637V154.159z" />
    </svg>
  );
}

function UsdcLogo({className}: {className?: string}) {
  return (
    <svg
      className={className}
      viewBox="0 0 2000 2000"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#2775CA"
        d="M1000 2000c554.17 0 1000-445.83 1000-1000S1554.17 0 1000 0 0 445.83 0 1000s445.83 1000 1000 1000z"
      />
      <path
        fill="#fff"
        d="M1275 1158.33c0-145.83-87.5-195.83-262.5-216.66-125-16.67-150-50-150-108.34s41.67-95.83 125-95.83c75 0 116.67 25 137.5 87.5 4.17 12.5 16.67 20.83 29.17 20.83h66.66c16.67 0 29.17-12.5 29.17-29.16v-4.17c-16.67-91.67-91.67-162.5-187.5-170.83v-100c0-16.67-12.5-29.17-33.33-33.34h-62.5c-16.67 0-29.17 12.5-33.34 33.34v95.83c-125 16.67-204.16 100-204.16 204.17 0 137.5 83.33 191.66 258.33 212.5 116.67 20.83 154.17 45.83 154.17 112.5s-58.34 112.5-137.5 112.5c-108.34 0-145.84-45.84-158.34-108.34-4.16-16.66-16.66-25-29.16-25h-70.84c-16.66 0-29.16 12.5-29.16 29.17v4.17c16.66 104.16 83.33 179.16 220.83 200v100c0 16.66 12.5 29.16 33.33 33.33h62.5c16.67 0 29.17-12.5 33.34-33.33v-100c125-20.84 208.33-108.34 208.33-220.84z"
      />
      <path
        fill="#fff"
        d="M787.5 1595.83c-325-116.66-491.67-479.16-370.83-800 62.5-166.67 191.66-295.84 358.33-358.34 16.67-8.33 25-20.83 25-41.66v-58.34c0-16.66-8.33-29.16-25-33.33-4.17 0-12.5 0-16.67 4.17-395.83 125-612.5 545.83-487.5 941.66 75 233.34 254.17 412.5 487.5 487.5 16.67 8.34 33.34 0 37.5-16.66 4.17-4.17 4.17-8.34 4.17-16.67v-58.33c0-12.5-12.5-29.17-12.5-50zm441.67-1512.5c-16.67-8.33-33.34 0-37.5 16.67-4.17 4.17-4.17 8.33-4.17 16.67v58.33c0 16.67 12.5 33.33 25 41.67 325 116.66 491.67 479.16 370.83 800-62.5 166.67-191.66 295.83-358.33 358.33-16.67 8.34-25 20.84-25 41.67v58.33c0 16.67 8.33 29.17 25 33.34 4.17 0 12.5 0 16.67-4.17 395.83-125 612.5-545.83 487.5-941.67-75-237.5-258.34-416.66-500-479.16z"
      />
    </svg>
  );
}

interface FaucetModalProps {
  trigger?: React.ReactNode;
}

interface Balances {
  eth: bigint;
  usdc: bigint;
}

export function FaucetModal({trigger}: FaucetModalProps) {
  const [open, setOpen] = useState(false);
  const [beforeBalances, setBeforeBalances] = useState<Balances | null>(null);

  const {address, isConnected} = useConnection();

  const {data: ethBalance, refetch: refetchEth} = useBalance({address});
  const {data: usdcBalance, refetch: refetchUsdc} = useTokenBalance(
    USDC_ADDRESS,
    address,
  );

  const {
    mutate: handleClaim,
    isPending,
    isSuccess,
  } = useMutation({
    mutationFn: async () => {
      if (!address) {
        throw new Error('Wallet not connected');
      }
      const currentEth = ethBalance?.value ?? 0n;
      const currentUsdc = usdcBalance ?? 0n;

      setBeforeBalances({eth: currentEth, usdc: currentUsdc});

      const ethAmount = parseEther('100');
      const usdcAmount = parseUnits('10000', 6);

      const newEthBalance = currentEth + ethAmount;

      await fetch(env.rpcUrl!, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'anvil_setBalance',
          params: [address, '0x' + newEthBalance.toString(16)],
          id: 1,
        }),
      });

      // For USDC, impersonate a whale and transfer (anvil_deal doesn't work for USDC)
      // 1. Impersonate the whale account
      await fetch(env.rpcUrl!, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'anvil_impersonateAccount',
          params: [USDC_WHALE],
          id: 2,
        }),
      });

      // 2. Send USDC transfer transaction from the whale
      // transfer(address,uint256) function selector: 0xa9059cbb
      const paddedRecipient = address.slice(2).toLowerCase().padStart(64, '0');
      const paddedAmount = usdcAmount.toString(16).padStart(64, '0');
      const transferData = `0xa9059cbb${paddedRecipient}${paddedAmount}`;

      await fetch(env.rpcUrl!, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_sendTransaction',
          params: [{from: USDC_WHALE, to: USDC_ADDRESS, data: transferData}],
          id: 3,
        }),
      });

      // 3. Stop impersonating
      await fetch(env.rpcUrl!, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'anvil_stopImpersonatingAccount',
          params: [USDC_WHALE],
          id: 4,
        }),
      });

      // Small delay to ensure anvil has processed the changes
      await new Promise(resolve => setTimeout(resolve, 500));

      // Refetch balances after claiming
      await Promise.all([refetchEth(), refetchUsdc()]);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to claim tokens');
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="text-yellow">
            faucet
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-green">
            $ nyx faucet --testnet
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <p className="text-sm text-cyan-400">
            // claim test tokens for trying nyx out
          </p>

          {!isConnected ? (
            <div className="p-4 border border-dashed border-border text-center">
              <p className="text-xs text-dim">connect wallet to use faucet</p>
            </div>
          ) : (
            <>
              {/* Balances */}
              <div className="text-sm border border-border p-3">
                <div className="text-dim mb-2">current_balances</div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-dim">ETH</span>
                    <span className="space-x-2">
                      {isSuccess && beforeBalances && (
                        <span className="text-dim line-through">
                          {Number(
                            formatEther(beforeBalances.eth),
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      )}
                      <span className="text-green">
                        {Number(
                          formatEther(ethBalance?.value ?? 0n),
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-dim">USDC</span>

                    <span className="space-x-2">
                      {isSuccess && beforeBalances && (
                        <span className="text-dim line-through">
                          {Number(
                            formatUnits(beforeBalances.usdc, 6),
                          ).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      )}
                      <span className="text-purple">
                        {Number(
                          formatUnits(usdcBalance ?? 0n, 6),
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* ETH Card */}
                <div className="border border-border p-6 flex flex-col items-center gap-3">
                  <EthLogo className="w-12 h-12" />
                  <div className="text-center">
                    <div className="text-xl text-green tabular-nums">100</div>
                    <div className="text-sm text-dim">ETH</div>
                  </div>
                </div>

                {/* USDC Card */}
                <div className="border border-border p-6 flex flex-col items-center gap-3">
                  <UsdcLogo className="w-12 h-12" />
                  <div className="text-center">
                    <div className="text-xl text-purple tabular-nums">
                      10000
                    </div>
                    <div className="text-sm text-dim">USDC</div>
                  </div>
                </div>
              </div>

              {/* Claim Button */}
              {!isSuccess && (
                <Button
                  className="w-full h-12"
                  onClick={() => handleClaim()}
                  disabled={isPending}
                  showPrefix={!isPending}
                >
                  {isPending ? (
                    <>
                      <Loader /> claiming...
                    </>
                  ) : (
                    'claim'
                  )}
                </Button>
              )}

              {/* Success */}
              {isSuccess && (
                <div className="p-3 border border-green text-center">
                  <p className="text-xs text-green">
                    success: 1000 ETH + 1000 USDC claimed
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
