'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Menu, X} from 'lucide-react';
import {useState} from 'react';
import {ConnectWallet} from '~/components/connect-wallet';
import {FaucetModal} from '~/components/faucet-modal';
import {Sheet, SheetContent, SheetTrigger} from '~/components/ui/sheet';

const NAV_LINKS = [
  {href: '/discover', label: 'discover'},
  {href: '/launch', label: 'launch'},
  {href: '/faq', label: 'faq'},
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="mx-auto flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <span className="text-green">~</span>
          <span className="font-bold">nyx</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={
                pathname === link.href
                  ? 'text-green'
                  : 'text-dim hover:text-foreground transition-colors'
              }
            >
              {pathname === link.href && (
                <span className="text-green mr-1">→</span>
              )}
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <div className="hidden md:block">
            <FaucetModal />
          </div>
          <div className="hidden md:block">
            <ConnectWallet />
          </div>

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="md:hidden">
              <button className="p-2 hover:bg-card transition-colors">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full max-w-xs border-l border-border bg-background p-0"
            >
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <span className="font-bold">menu</span>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="p-1 hover:bg-card"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <nav className="flex-1 p-4">
                  {NAV_LINKS.map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`block py-3 border-b border-border ${
                        pathname === link.href ? 'text-green' : 'text-dim'
                      }`}
                    >
                      {pathname === link.href && (
                        <span className="mr-2">→</span>
                      )}
                      {link.label}
                    </Link>
                  ))}
                </nav>

                <div className="p-4 border-t border-border space-y-2">
                  <FaucetModal />
                  <ConnectWallet className="w-full" />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
