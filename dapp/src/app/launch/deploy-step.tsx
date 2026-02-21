'use client';

import {Globe, MessageCircle, Send} from 'lucide-react';
import {Button} from '~/components/ui/button';
import {Loader} from '~/components/ui/loader';
import type {FormData} from './config-step';

interface DeployStepProps {
  form: FormData;
  isConnected: boolean;
  isDeploying: boolean;
  saltReady: boolean;
  isMining: boolean;
  miningProgress: string | null;
  onBack: () => void;
  onDeploy: () => void;
}

const TOTAL_SUPPLY = 1_000_000;
const FLOOR_PRICE = 0.1;
const AUCTION_AMOUNT = 100_000;

export const DeployStep = ({
  form,
  isConnected,
  isDeploying,
  saltReady,
  isMining,
  miningProgress,
  onBack,
  onDeploy,
}: DeployStepProps) => {
  const marketCap = TOTAL_SUPPLY * FLOOR_PRICE;
  const fdv = TOTAL_SUPPLY * FLOOR_PRICE;

  const socialLinks = [
    {key: 'website', value: form.website, icon: Globe, label: 'website'},
    {
      key: 'twitter',
      value: form.twitter,
      icon: null,
      label: 'twitter',
      svgPath:
        'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
    },
    {
      key: 'discord',
      value: form.discord,
      icon: MessageCircle,
      label: 'discord',
    },
    {key: 'telegram', value: form.telegram, icon: Send, label: 'telegram'},
  ].filter(l => l.value);

  return (
    <div className="space-y-8">
      {/* Review section */}
      <div>
        <div className="text-sm mb-4">
          <span className="text-dim">01</span> <span>review token</span>
        </div>
        <div className="border-b border-border mb-6" />

        <div className="flex gap-6 mb-4">
          <div className="w-28 h-28 border border-border shrink-0 flex items-center justify-center text-purple text-3xl overflow-hidden">
            {form.image ? (
              <img
                src={form.image}
                alt={form.name}
                className="w-full h-full object-cover"
              />
            ) : (
              form.symbol.slice(0, 2) || '??'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">{form.name}</span>
            </div>
            <div className="text-dim mb-1">${form.symbol}</div>
            {form.description && (
              <p className="text-dim text-sm leading-relaxed">
                {form.description}
              </p>
            )}
          </div>
        </div>

        {/* Social links */}
        {socialLinks.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-4">
            {socialLinks.map(link => (
              <a
                key={link.key}
                href={link.value}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 border border-border text-xs text-dim hover:text-foreground hover:border-green transition-colors"
              >
                {link.svgPath ? (
                  <svg
                    className="h-3.5 w-3.5 shrink-0"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d={link.svgPath} />
                  </svg>
                ) : (
                  link.icon && <link.icon className="h-3.5 w-3.5 shrink-0" />
                )}
                {link.value}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Parameters section */}
      <div>
        <div className="text-sm mb-4">
          <span className="text-dim">02</span> <span>launch details</span>
        </div>
        <div className="border-b border-border mb-4" />
        <div className="grid grid-cols-3 gap-2">
          <div className="px-4 py-4 border border-border space-y-1">
            <div className="text-dim text-xs">total supply</div>
            <div className="text-sm">{TOTAL_SUPPLY.toLocaleString()}</div>
          </div>
          <div className="px-4 py-4 border border-border space-y-1">
            <div className="text-dim text-sm">for auction</div>
            <div className="text-sm">
              {AUCTION_AMOUNT.toLocaleString()}{' '}
              <span className="text-dim">
                ({((AUCTION_AMOUNT / TOTAL_SUPPLY) * 100).toFixed(0)}%)
              </span>
            </div>
          </div>
          <div className="px-4 py-4 border border-border space-y-1">
            <div className="text-dim text-sm">floor price</div>
            <div className="text-sm text-green">${FLOOR_PRICE}</div>
          </div>
          <div className="px-4 py-4 border border-border space-y-1">
            <div className="text-dim text-sm">auction duration</div>
            <div className="text-sm">24 hours</div>
          </div>
          <div className="px-4 py-4 border border-border space-y-1">
            <div className="text-dim text-sm">market cap</div>
            <div className="text-sm text-purple">
              ${marketCap.toLocaleString()}
            </div>
          </div>
          <div className="px-4 py-4 border border-border space-y-1">
            <div className="text-dim text-sm">fdv</div>
            <div className="text-sm text-purple">${fdv.toLocaleString()}</div>
          </div>
        </div>

        <div className="px-2 text-xs text-cyan-500 mt-8">
          // These parameters are fixed for all tokens on nyx.
          <br />
          // This is so that our users do not have to track individual token
          details.
          <br />
          // For example, a $2 token is exactly as valuable as a $1 token.
        </div>
      </div>

      {/* Mining / deploy progress */}
      {isMining && miningProgress && (
        <div className="text-yellow text-sm flex items-center gap-2">
          <Loader />
          {miningProgress}
        </div>
      )}
      {isDeploying && (
        <div className="text-green text-sm flex items-center gap-2">
          <Loader />
          deploying token...
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          onClick={onBack}
          disabled={isDeploying}
          variant="secondary"
          size="lg"
          className="flex-1 h-12"
        >
          back
        </Button>
        <Button
          onClick={onDeploy}
          disabled={!isConnected || isDeploying || !saltReady}
          size="lg"
          className="flex-1 h-12"
          showPrefix={!isDeploying && saltReady}
        >
          {isDeploying ? (
            <>
              <Loader type="dots" />
              deploying...
            </>
          ) : !saltReady ? (
            <>
              <Loader type="dots" />
              preparing...
            </>
          ) : (
            'deploy token'
          )}
        </Button>
      </div>

      {!isConnected && (
        <p className="text-center text-dim text-xs">connect wallet to deploy</p>
      )}
    </div>
  );
};
