'use client';

import {useState, useEffect, useCallback} from 'react';
import {useRouter} from 'next/navigation';
import {useConnection} from 'wagmi';
import {Globe, MessageCircle, Send, Zap, Calendar, Clock} from 'lucide-react';
import {Loader} from '~/components/ui/loader';
import {Container} from '~/components/layout/container';
import {Button} from '~/components/ui/button';
import {Input} from '~/components/ui/input';
import {ImageUpload} from '~/components/ui/image-upload';
import {useLaunch} from '~/hooks/use-launch';

type LaunchMode = 'now' | 'scheduled';

interface FormData {
  name: string;
  symbol: string;
  description: string;
  image: string;
  imageCid: string;
  website: string;
  twitter: string;
  discord: string;
  telegram: string;
}

export default function LaunchPage() {
  const router = useRouter();
  const {isConnected} = useConnection();

  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<LaunchMode>('now');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [form, setForm] = useState<FormData>({
    name: '',
    symbol: '',
    description: '',
    image: '',
    imageCid: '',
    website: '',
    twitter: '',
    discord: '',
    telegram: '',
  });

  const {
    launch,
    launchResult,
    isPending,
    isMining,
    miningProgress,
    isConfirming,
    isConfirmed,
  } = useLaunch();

  useEffect(() => {
    if (launchResult?.token && isConfirmed) {
      router.push(`/token/${launchResult.token}`);
    }
  }, [launchResult, isConfirmed, router]);

  const updateForm = (field: keyof FormData, value: string) => {
    setForm(prev => ({...prev, [field]: value}));
  };

  const handleImageChange = useCallback(
    (url: string | undefined, cid: string | undefined) => {
      setForm(prev => ({
        ...prev,
        image: url || '',
        imageCid: cid || '',
      }));
    },
    [],
  );

  const handleDeploy = async () => {
    try {
      await launch({
        name: form.name,
        symbol: form.symbol,
        description: form.description || undefined,
        image: form.image || undefined,
        websiteUrl: form.website || undefined,
        twitterUrl: form.twitter || undefined,
        discordUrl: form.discord || undefined,
        telegramUrl: form.telegram || undefined,
        scheduledTime:
          mode === 'scheduled' ? new Date(scheduledTime) : undefined,
      });
    } catch (error) {
      console.error('Launch failed:', error);
    }
  };

  const isDeploying = isPending || isMining || isConfirming;
  const canProceed = form.name && form.symbol;

  return (
    <div className="min-h-screen py-12">
      <Container size="sm">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-block px-3 py-1 border border-border text-dim text-xs mb-4">
            fair launch cca
          </div>
          <h1 className="text-2xl mb-2">
            <span className="text-green">&gt;</span> launch token
          </h1>
          <p className="text-dim text-sm">
            continuous clearing auction for fair price discovery
          </p>
        </div>

        {/* Step tabs */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <Button
            onClick={() => setStep(1)}
            variant={step === 1 ? 'default' : 'secondary'}
            size="sm"
          >
            01 config
          </Button>
          <span className="text-dim text-xs">—&gt;</span>
          <Button
            onClick={() => step === 2 && setStep(2)}
            variant={step === 2 ? 'default' : 'secondary'}
            size="sm"
          >
            02 deploy
          </Button>
        </div>

        {/* Step 1: Config */}
        {step === 1 && (
          <div className="space-y-8">
            {/* Token configuration section */}
            <div>
              <div className="text-sm mb-4">
                <span className="text-dim">01</span>{' '}
                <span>token configuration</span>
              </div>
              <div className="border-b border-border mb-6" />

              <div className="space-y-6">
                {/* Image, Name & Symbol */}
                <div className="flex gap-8">
                  {/* Token Image */}
                  <div>
                    <label className="text-xs block mb-2">
                      <span className="text-dim"> token image</span>{' '}
                      <span className="text-dim/60">(optional)</span>
                    </label>
                    <ImageUpload
                      value={form.image}
                      onChange={handleImageChange}
                      tokenSymbol={form.symbol}
                      disabled={isDeploying}
                    />
                  </div>

                  {/* Name & Symbol stacked */}
                  <div className="flex-1 flex flex-col gap-4">
                    <div>
                      <label className="text-dim text-xs block mb-2">
                        token name <span className="text-red">*</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. Pepe Rising"
                        value={form.name}
                        onChange={e => updateForm('name', e.target.value)}
                        className="h-11 px-4"
                      />
                    </div>
                    <div>
                      <label className="text-dim text-xs block mb-2">
                        symbol <span className="text-red">*</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. PRISE"
                        value={form.symbol}
                        onChange={e =>
                          updateForm('symbol', e.target.value.toUpperCase())
                        }
                        maxLength={10}
                        className="h-11 px-4 uppercase placeholder:normal-case"
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-dim text-xs block mb-2">
                    description
                  </label>
                  <textarea
                    placeholder="describe your token..."
                    value={form.description}
                    onChange={e => updateForm('description', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-background border border-border text-sm resize-none placeholder:text-dim focus:outline-none focus:border-green"
                  />
                </div>

                {/* Social links */}
                <div>
                  <label className="text-xs block mb-2">
                    <span className="text-dim">social links</span>{' '}
                    <span className="text-dim/60">(optional)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dim" />
                      <Input
                        type="url"
                        placeholder="https://website.com"
                        value={form.website}
                        onChange={e => updateForm('website', e.target.value)}
                        className="h-11 pl-10 pr-4"
                      />
                    </div>
                    <div className="relative">
                      <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dim"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      <Input
                        type="url"
                        placeholder="https://twitter.com/..."
                        value={form.twitter}
                        onChange={e => updateForm('twitter', e.target.value)}
                        className="h-11 pl-10 pr-4"
                      />
                    </div>
                    <div className="relative">
                      <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dim" />
                      <Input
                        type="url"
                        placeholder="https://discord.gg/..."
                        value={form.discord}
                        onChange={e => updateForm('discord', e.target.value)}
                        className="h-11 pl-10 pr-4"
                      />
                    </div>
                    <div className="relative">
                      <Send className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dim" />
                      <Input
                        type="url"
                        placeholder="https://t.me/..."
                        value={form.telegram}
                        onChange={e => updateForm('telegram', e.target.value)}
                        className="h-11 pl-10 pr-4"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Launch timing section */}
            <div>
              <div className="flex items-center gap-2 text-sm text-yellow mb-4">
                <Clock className="h-4 w-4" />
                <span>launch timing</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={() => setMode('now')}
                  variant="outline"
                  className={`p-4 h-auto text-left justify-start ${
                    mode === 'now' ? 'border-green bg-green/5' : ''
                  }`}
                >
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap
                        className={`h-4 w-4 ${mode === 'now' ? 'text-green' : 'text-dim'}`}
                      />
                      <span className={mode === 'now' ? 'text-green' : ''}>
                        launch now
                      </span>
                    </div>
                    <p className="text-dim text-xs">
                      start auction immediately
                    </p>
                  </div>
                </Button>
                <Button
                  onClick={() => setMode('scheduled')}
                  variant="outline"
                  className={`p-4 h-auto text-left justify-start ${
                    mode === 'scheduled' ? 'border-purple bg-purple/5' : ''
                  }`}
                >
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar
                        className={`h-4 w-4 ${mode === 'scheduled' ? 'text-purple' : 'text-dim'}`}
                      />
                      <span
                        className={mode === 'scheduled' ? 'text-purple' : ''}
                      >
                        schedule
                      </span>
                    </div>
                    <p className="text-dim text-xs">set a future launch time</p>
                  </div>
                </Button>
              </div>

              {mode === 'scheduled' && (
                <Input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={e => setScheduledTime(e.target.value)}
                  className="h-11 px-4 mt-4 focus:border-purple"
                />
              )}
            </div>

            {/* Continue */}
            <Button
              onClick={() => setStep(2)}
              disabled={!canProceed}
              size="lg"
              className="w-full h-12"
              showPrefix
            >
              continue to deploy
            </Button>
          </div>
        )}

        {/* Step 2: Deploy */}
        {step === 2 && (
          <div className="space-y-8">
            {/* Review section */}
            <div>
              <div className="text-sm mb-4">
                <span className="text-dim">01</span> <span>review token</span>
              </div>
              <div className="border-b border-border mb-6" />

              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 border border-border flex items-center justify-center text-purple text-xl overflow-hidden">
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
                <div>
                  <div className="text-lg">{form.name}</div>
                  <div className="text-dim">${form.symbol}</div>
                </div>
              </div>

              {form.description && (
                <p className="text-dim text-sm">{form.description}</p>
              )}
            </div>

            {/* Parameters section */}
            <div>
              <div className="text-sm mb-4">
                <span className="text-dim">02</span>{' '}
                <span>auction parameters</span>
              </div>
              <div className="border-b border-border mb-6" />

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 border border-border">
                  <div className="text-dim text-xs mb-1">total supply</div>
                  <div>1,000,000</div>
                </div>
                <div className="p-4 border border-border">
                  <div className="text-dim text-xs mb-1">for auction</div>
                  <div>
                    100,000 <span className="text-dim">(10%)</span>
                  </div>
                </div>
                <div className="p-4 border border-border">
                  <div className="text-dim text-xs mb-1">floor price</div>
                  <div className="text-green">$0.1</div>
                </div>
                <div className="p-4 border border-border">
                  <div className="text-dim text-xs mb-1">duration</div>
                  <div>24 hours</div>
                </div>
              </div>
            </div>

            {/* Deploy progress */}
            {isDeploying && miningProgress && (
              <div className="text-green text-sm flex items-center gap-2">
                <Loader />
                {miningProgress}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                onClick={() => setStep(1)}
                disabled={isDeploying}
                variant="secondary"
                size="lg"
                className="flex-1 h-12"
              >
                back
              </Button>
              <Button
                onClick={handleDeploy}
                disabled={!isConnected || isDeploying}
                size="lg"
                className="flex-1 h-12"
                showPrefix={!isDeploying}
              >
                {isDeploying ? (
                  <>
                    <Loader type="dots" />
                    deploying...
                  </>
                ) : (
                  'deploy token'
                )}
              </Button>
            </div>

            {!isConnected && (
              <p className="text-center text-dim text-xs">
                connect wallet to deploy
              </p>
            )}
          </div>
        )}
      </Container>
    </div>
  );
}
