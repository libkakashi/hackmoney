import type {Metadata} from 'next';
import {Geist_Mono, JetBrains_Mono} from 'next/font/google';
import {Providers} from '~/components/providers';
import {Navbar} from '~/components/layout/navbar';
import {AgentProvider} from '~/components/agent/agent-context';
import {FloatingAgent} from '~/components/agent/floating-agent';
import {Footer} from '~/components/layout/footer';
import {TestnetBanner} from '~/components/layout/testnet-banner';
import './globals.css';

// Server-side: stub localStorage/sessionStorage to prevent SSR errors
if (typeof window === 'undefined') {
  const noop = () => {};
  const stub = () => null;
  const storageStub = {
    getItem: stub,
    setItem: noop,
    removeItem: noop,
    clear: noop,
    length: 0,
    key: stub,
  } as Storage;
  if (
    !globalThis.localStorage ||
    typeof (globalThis.localStorage as Storage).getItem !== 'function'
  ) {
    (globalThis as typeof globalThis & {localStorage: Storage}).localStorage =
      storageStub;
  }
  if (
    !globalThis.sessionStorage ||
    typeof (globalThis.sessionStorage as Storage).getItem !== 'function'
  ) {
    (
      globalThis as typeof globalThis & {
        sessionStorage: Storage;
      }
    ).sessionStorage = storageStub;
  }
}

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'nyx - crowdfund bounties for open source issues',
  description:
    'Register open source projects and crowdfund bounties for issue resolution. Anyone can add rewards. Contributors automatically split payouts. Back the projects you believe in early.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistMono.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <Providers>
          <AgentProvider>
            <div className="flex h-screen flex-col overflow-hidden">
              <Navbar />
              <TestnetBanner />
              <main className="flex-1 overflow-y-auto">
                {children}
                <Footer />
              </main>
              <FloatingAgent />
            </div>
          </AgentProvider>
        </Providers>
      </body>
    </html>
  );
}
