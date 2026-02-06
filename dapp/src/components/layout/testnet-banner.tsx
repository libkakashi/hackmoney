'use client';

import {usePathname} from 'next/navigation';

export const TestnetBanner = () => {
  const pathname = usePathname();

  if (pathname === '/') return null;

  return (
    <div className="border-b border-yellow/30 bg-yellow/10 px-4 py-2">
      <p className="text-xs  text-yellow">
        // running on a mainnet anvil fork for easy testing — use the faucet in
        the top-left to mint native ETH and USDC.
      </p>
    </div>
  );
};
