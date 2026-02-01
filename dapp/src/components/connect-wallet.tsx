'use client';
import {Big} from 'big.js';
import {useAccountModal, useConnectModal} from '@rainbow-me/rainbowkit';
import {Wallet} from 'lucide-react';
import {useConnection, useBalance, useSwitchChain} from 'wagmi';
import {Button} from '~/components/ui/button';
import {cn} from '~/lib/utils';
import {useSiweAuth} from '~/hooks/use-siwe-auth';
import {env} from '~/lib/env';
import {chain} from '~/lib/wagmi-config';

interface ConnectWalletProps {
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showBalance?: boolean;
}

export function ConnectWallet({
  className,
  size = 'sm',
  showBalance = true,
}: ConnectWalletProps) {
  const {openConnectModal} = useConnectModal();
  const {openAccountModal} = useAccountModal();

  const {address, isConnected, chainId} = useConnection();
  const {data: balance} = useBalance({address});
  const {isSigning, needsSignIn, signIn} = useSiweAuth();

  const {mutate: switchChain, isPending: isSwitching} = useSwitchChain();

  const isWrongChain = isConnected && chainId !== env.chainId;

  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  const formattedBalance = balance
    ? `${new Big(balance.value.toString()).div(10 ** balance.decimals).toFixed(4)} ${balance.symbol}`
    : null;

  if (!isConnected) {
    return (
      <Button
        variant="default"
        size={size}
        onClick={openConnectModal}
        className={cn('gap-1.5', className)}
      >
        <Wallet className="h-3.5 w-3.5" />
        Connect
      </Button>
    );
  }

  if (isSwitching) {
    return (
      <Button
        variant="outline"
        size={size}
        disabled
        className={cn('gap-1.5', className)}
      >
        <Wallet className="h-3.5 w-3.5" />
        Switching...
      </Button>
    );
  }

  if (isWrongChain) {
    return (
      <Button
        variant="default"
        size={size}
        onClick={() => switchChain({chainId: env.chainId})}
        className={cn('gap-1.5', className)}
      >
        <Wallet className="h-3.5 w-3.5" />
        <span className="flex items-center gap-1.5">
          {truncatedAddress && (
            <>
              <span className="opacity-75">{truncatedAddress}</span>
              <span className="opacity-50">|</span>
            </>
          )}
          Switch to {chain.name}
        </span>
      </Button>
    );
  }

  if (isSigning) {
    return (
      <Button
        variant="outline"
        size={size}
        disabled
        className={cn('gap-1.5', className)}
      >
        <Wallet className="h-3.5 w-3.5" />
        Signing...
      </Button>
    );
  }

  if (needsSignIn) {
    return (
      <Button
        variant="default"
        size={size}
        onClick={signIn}
        className={cn('gap-1.5', className)}
      >
        <Wallet className="h-3.5 w-3.5" />
        <span className="flex items-center gap-1.5">
          {truncatedAddress && (
            <>
              <span className="opacity-75">{truncatedAddress}</span>
              <span className="opacity-50">|</span>
            </>
          )}
          Sign In
        </span>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size={size}
      onClick={openAccountModal}
      className={cn('gap-1.5', className)}
    >
      <Wallet className="h-3.5 w-3.5" />
      <span className="flex items-center gap-1.5">
        {showBalance && formattedBalance && (
          <>
            <span className="text-muted-foreground">{formattedBalance}</span>
            <span className="text-muted-foreground/50">|</span>
          </>
        )}
        <span>{truncatedAddress}</span>
      </span>
    </Button>
  );
}
