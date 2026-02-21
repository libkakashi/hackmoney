'use client';

import {useState, useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {useConnection} from 'wagmi';
import {Container} from '~/components/layout/container';
import {useLaunch} from '~/hooks/use-launch';
import {useMineSalt} from '~/hooks/use-mine-salt';
import {ConfigStep, type FormData, type LaunchMode} from './config-step';
import {DeployStep} from './deploy-step';

const STEPS = [
  {num: '01', label: 'config'},
  {num: '02', label: 'deploy'},
] as const;

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

  const {mineSalt, saltResult, isMining, miningProgress} = useMineSalt();

  const {launch, launchResult, isPending, isConfirming, isConfirmed} =
    useLaunch();

  // Mine salt when moving to deploy step
  useEffect(() => {
    if (step === 2 && !saltResult && !isMining) {
      void mineSalt({
        name: form.name,
        symbol: form.symbol,
        scheduledTime:
          mode === 'scheduled' ? new Date(scheduledTime) : undefined,
      });
    }
  }, [
    step,
    saltResult,
    isMining,
    mineSalt,
    form.name,
    form.symbol,
    mode,
    scheduledTime,
  ]);

  // When deploy confirms, redirect to token page
  useEffect(() => {
    if (launchResult?.token && isConfirmed) {
      router.push(`/token/${launchResult.token}`);
    }
  }, [launchResult, isConfirmed, router]);

  const handleDeploy = async () => {
    if (!saltResult) return;

    try {
      await launch({
        name: form.name,
        symbol: form.symbol,
        salt: saltResult.salt,
        startBlock: saltResult.startBlock,
        description: form.description || undefined,
        image: form.image || undefined,
        websiteUrl: form.website || undefined,
        twitterUrl: form.twitter || undefined,
        discordUrl: form.discord || undefined,
        telegramUrl: form.telegram || undefined,
      });
    } catch (error) {
      console.error('Launch failed:', error);
    }
  };

  const isDeploying = isPending || isConfirming;

  return (
    <div className="min-h-screen py-12">
      <Container size="sm">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl mb-2">
            <span className="text-green">&gt;</span> launch project token
          </h1>
          <p className="text-dim text-sm">
            crowdfund bounties for issues. reward contributors. let early
            believers back your project.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-10">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (i + 1 <= step) setStep(i + 1);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 border text-xs transition-colors ${
                  step === i + 1
                    ? 'border-green text-green bg-green/5'
                    : step > i + 1
                      ? 'border-green/40 text-green/60'
                      : 'border-border text-dim'
                } ${i + 1 <= step ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {step > i + 1 ? (
                  <span className="text-green">&#10003;</span>
                ) : (
                  <span className="opacity-60">{s.num}</span>
                )}
                {s.label}
              </button>
              {i < STEPS.length - 1 && (
                <span
                  className={`text-xs ${step > i + 1 ? 'text-green/40' : 'text-dim/40'}`}
                >
                  ———
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Config */}
        {step === 1 && (
          <ConfigStep
            form={form}
            setForm={setForm}
            mode={mode}
            setMode={setMode}
            scheduledTime={scheduledTime}
            setScheduledTime={setScheduledTime}
            onContinue={() => setStep(2)}
            disabled={isDeploying}
          />
        )}

        {/* Step 2: Deploy */}
        {step === 2 && (
          <DeployStep
            form={form}
            isConnected={isConnected}
            isDeploying={isDeploying}
            saltReady={!!saltResult}
            isMining={isMining}
            miningProgress={miningProgress}
            onBack={() => setStep(1)}
            onDeploy={handleDeploy}
          />
        )}
      </Container>
    </div>
  );
}
