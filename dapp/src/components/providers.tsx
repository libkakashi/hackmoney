'use client';

import {useState} from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {WagmiProvider} from 'wagmi';
import {RainbowKitProvider} from '@rainbow-me/rainbowkit';
import {httpBatchLink} from '@trpc/client';
import {Toaster} from 'sonner';
import superjson from 'superjson';
import {ThemeProvider} from '~/components/theme/theme-provider';
import {wagmiConfig} from '~/lib/wagmi-config';
import {trpc} from '~/lib/trpc';
import '@rainbow-me/rainbowkit/styles.css';

function getBaseUrl() {
  if (typeof window !== 'undefined') return '';
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export function Providers({children}: {children: React.ReactNode}) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: 'include',
            } as RequestInit);
          },
        }),
      ],
    }),
  );

  return (
    <>
      <Toaster
        toastOptions={{
          style: {gap: '16px'},
          classNames: {description: 'toast-description'},
        }}
      />
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
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
      </trpc.Provider>
    </>
  );
}
