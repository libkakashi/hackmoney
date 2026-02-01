import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <span className="text-green">~</span>
              <span className="font-bold">timelock</span>
            </Link>
            <p className="text-dim text-sm">
              fair token launches with continuous clearing auctions
            </p>
          </div>

          {/* Protocol */}
          <div>
            <div className="text-dim text-xs mb-4">protocol</div>
            <div className="space-y-2 text-sm">
              <Link
                href="/discover"
                className="block text-dim hover:text-foreground"
              >
                discover
              </Link>
              <Link
                href="/launch"
                className="block text-dim hover:text-foreground"
              >
                launch
              </Link>
              <Link
                href="/docs"
                className="block text-dim hover:text-foreground"
              >
                docs
              </Link>
            </div>
          </div>

          {/* Resources */}
          <div>
            <div className="text-dim text-xs mb-4">resources</div>
            <div className="space-y-2 text-sm">
              <Link
                href="/docs/guide"
                className="block text-dim hover:text-foreground"
              >
                guide
              </Link>
              <Link
                href="/docs/faq"
                className="block text-dim hover:text-foreground"
              >
                faq
              </Link>
              <Link
                href="/docs/api"
                className="block text-dim hover:text-foreground"
              >
                api
              </Link>
            </div>
          </div>

          {/* Social */}
          <div>
            <div className="text-dim text-xs mb-4">social</div>
            <div className="space-y-2 text-sm">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-dim hover:text-foreground"
              >
                twitter
              </a>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-dim hover:text-foreground"
              >
                discord
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-dim hover:text-foreground"
              >
                github
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-dim">
          <div>{new Date().getFullYear()} timelock</div>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-foreground">
              terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
