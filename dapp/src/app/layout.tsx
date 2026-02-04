import type {Metadata} from 'next';
import {Geist_Mono, JetBrains_Mono} from 'next/font/google';
import {Providers} from '~/components/providers';
import {Navbar} from '~/components/layout/navbar';
import {AgentProvider} from '~/components/agent/agent-context';
import {AgentLayout} from '~/components/agent/agent-layout';
import './globals.css';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'timelock',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistMono.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <Providers>
          <AgentProvider>
            <div className="flex h-screen flex-col overflow-hidden">
              <Navbar />
              <AgentLayout>{children}</AgentLayout>
            </div>
          </AgentProvider>
        </Providers>
      </body>
    </html>
  );
}
