'use client';

import {useState} from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {WagmiProvider} from 'wagmi';
import {RainbowKitProvider} from '@rainbow-me/rainbowkit';
import {ThemeProvider} from './theme/theme-provider';
import {wagmiConfig} from '~/lib/wagmi-config';
import '@rainbow-me/rainbowkit/styles.css';

export function Providers({children}: {children: React.ReactNode}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </>
  );
}
