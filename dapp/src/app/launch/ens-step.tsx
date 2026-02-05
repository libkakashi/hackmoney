'use client';

import {useEffect, useRef, useState} from 'react';
import {
  BadgeCheck,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Shield,
  Sparkles,
} from 'lucide-react';
import {Button} from '~/components/ui/button';
import {Loader} from '~/components/ui/loader';
import {VerifiedBadge} from '~/components/verified-badge';
import {useRegisterEns} from '~/hooks/ens/use-register-ens';
import {useCheckEnsAvailability} from '~/hooks/ens/use-check-ens-availability';
import {useDebounce} from '~/hooks/utils/use-debounce';
import {ENS_MIN_NAME_LENGTH} from '~/abi/ens-registrar';
import {cn} from '~/lib/utils';
import type {FormData} from './config-step';

interface ENSStepProps {
  form: FormData;
  ensName: string;
  setEnsName: (name: string) => void;
  saltReady: boolean;
  isMining: boolean;
  miningProgress: string | null;
  onBack: () => void;
  onContinue: () => void;
  onRegistered?: () => void;
}

export const ENSStep = ({
  form,
  ensName,
  setEnsName,
  saltReady,
  isMining,
  miningProgress,
  onBack,
  onContinue,
  onRegistered,
}: ENSStepProps) => {
  const suggestedName =
    form.symbol?.toLowerCase().replace(/[^a-z0-9-]/g, '') || '';

  // Local input state — only propagated to parent ensName on confirmed ownership
  const [inputName, setInputName] = useState(ensName || '');
  const currentName = inputName || suggestedName;
  const debouncedName = useDebounce(currentName, 500);

  const {
    isAvailable,
    isOwnedByUser,
    isCheckingAvailability,
    rentPriceFormatted,
    rentPrice,
  } = useCheckEnsAvailability(debouncedName);

  const {
    registrationState,
    timeUntilReveal,
    canReveal,
    commit,
    register,
    isPending,
    isCommitting,
    isRegistering,
    error,
  } = useRegisterEns(debouncedName, rentPrice);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setInputName(sanitized);
    // Clear parent ensName when user changes input — only set again on confirmed ownership
    if (ensName) setEnsName('');
  };

  const isRegistered = registrationState === 'complete' || isOwnedByUser;

  // Only set parent ensName when registration completes or user already owns it
  useEffect(() => {
    if ((isOwnedByUser || registrationState === 'complete') && currentName) {
      setEnsName(currentName);
    }
  }, [isOwnedByUser, registrationState, currentName, setEnsName]);

  // Auto-advance to deploy after registration completes
  const hasAutoAdvanced = useRef(false);
  useEffect(() => {
    if (
      registrationState === 'complete' &&
      saltReady &&
      onRegistered &&
      !hasAutoAdvanced.current
    ) {
      hasAutoAdvanced.current = true;
      // Small delay so the user sees the success state
      const timer = setTimeout(onRegistered, 1500);
      return () => clearTimeout(timer);
    }
  }, [registrationState, saltReady, onRegistered]);
  const showStatus =
    currentName &&
    currentName.length >= ENS_MIN_NAME_LENGTH &&
    !isCheckingAvailability;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8">
      {/* Hype banner */}
      <div className="border border-green/30 bg-green/5 p-6">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-yellow shrink-0" />
          <div>
            <div className="text-lg text-cyan-500">
              awesome! your <span className="text-yellow">${form.symbol}</span>{' '}
              token looks amazing
            </div>
            <p className="text-sm text-dim mt-0.5">
              before we deploy, you can claim an ens name to earn a{' '}
              <span className="text-green">verified badge</span>
            </p>
          </div>
        </div>
      </div>

      {/* Verified badge preview */}
      <div className="text-sm">
        <div className="mb-4">
          <span className="text-yellow">01</span>{' '}
          <span>
            earn a <span className="text-green">verified badge</span>
          </span>
        </div>
        <div className="border-b border-border mb-6" />

        <div className="border border-border p-6">
          <p className="text-dim mb-4">
            this is how your token appears on the launchpad:
          </p>

          <div className="grid grid-cols-2 gap-4">
            {/* Without badge */}
            <div className="border border-border p-4 opacity-50">
              <div className="text-yellow/60 mb-3 uppercase tracking-wider">
                // without ens
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 border border-border flex items-center justify-center text-purple overflow-hidden shrink-0">
                  {form.image ? (
                    <img
                      src={form.image}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    form.symbol.slice(0, 2) || '??'
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate">{form.name}</div>
                  <div className="text-dim text-sm">${form.symbol}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-dim/60">
                <div className="w-3 h-3 border border-dim/30 flex items-center justify-center">
                  <span className="text-sm">?</span>
                </div>
                unverified identity
              </div>
            </div>

            {/* With badge */}
            <div className="border border-green/30 bg-green/[0.02] p-4 relative">
              <div className="absolute top-3 right-2">
                <span className="text-xs px-1.5 py-1 border text-green tracking-wide">
                  recommended
                </span>
              </div>
              <div className="text-green mb-3 uppercase tracking-wider">
                // with ens
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 border border-green/30 flex items-center justify-center text-purple overflow-hidden shrink-0">
                  {form.image ? (
                    <img
                      src={form.image}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    form.symbol.slice(0, 2) || '??'
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="truncate">{form.name}</span>
                    <VerifiedBadge ensName={currentName || 'yourtoken'} />
                  </div>
                  <div className="text-dim text-sm">${form.symbol}</div>
                </div>
              </div>
              <VerifiedBadge
                ensName={currentName || 'yourtoken'}
                showName
                className="text-green/80"
                iconClassName="h-3 w-3"
              />
            </div>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-3 gap-2 mt-5 pt-5 border-t border-border">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-cyan-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-cyan-500">anti-impersonation</div>
                <p className="text-dim text-xs mt-0.5 leading-relaxed">
                  tickers aren't unique — own your name on-chain
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <BadgeCheck className="h-4 w-4 text-green shrink-0 mt-0.5" />
              <div>
                <div className="text-green">verified badge</div>
                <p className="text-dim text-xs mt-0.5 leading-relaxed">
                  green checkmark shown on all launchpad pages
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-yellow shrink-0 mt-0.5" />
              <div>
                <div className="text-yellow">trust signal</div>
                <p className="text-dim text-xs mt-0.5 leading-relaxed">
                  buyers feel confident with verified projects
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Claim ENS name */}
      <div className="text-sm">
        <div className="mb-4">
          <span className="text-yellow">02</span>{' '}
          <span>claim your ens name</span>
        </div>
        <div className="border-b border-border mb-6" />

        <div className="border border-green/20 bg-green/[0.02] p-8 flex flex-col items-center text-center space-y-5">
          <div className="text-lg">
            claim{' '}
            <span className="text-green">{currentName || 'yourtoken'}.eth</span>
          </div>

          {/* Search-bar style input + button */}
          <div className="flex items-center border border-border bg-background">
            <input
              type="text"
              placeholder={suggestedName || 'yourtoken'}
              value={inputName}
              onChange={handleNameChange}
              disabled={
                isOwnedByUser ||
                registrationState === 'committing' ||
                registrationState === 'waiting' ||
                registrationState === 'ready' ||
                registrationState === 'registering'
              }
              className="h-12 w-32 bg-transparent px-4 text-md outline-none placeholder:text-dim disabled:opacity-50"
            />
            <span className="text-dim pr-3 text-md select-none">.eth</span>
            {!isOwnedByUser && (
              <Button
                onClick={commit}
                disabled={
                  isPending ||
                  !rentPrice ||
                  !isAvailable ||
                  !currentName ||
                  currentName.length < ENS_MIN_NAME_LENGTH ||
                  registrationState !== 'idle'
                }
                size="lg"
                className="h-12 px-6 shrink-0 border-0 border-l border-border"
                showPrefix
              >
                {isCommitting ? (
                  <>
                    <Loader type="dots" />
                    claiming...
                  </>
                ) : (
                  'claim'
                )}
              </Button>
            )}
          </div>

          <div className="text-xs text-dim">
            // it's ok if it doesn't match the ticker exactly
          </div>

          {/* Inline status */}
          {currentName && (
            <div className="flex flex-col items-center gap-1 text-sm">
              <div className="flex items-center gap-2">
                {isCheckingAvailability ? (
                  <>
                    <Loader type="dots" />
                    <span className="text-dim">checking...</span>
                  </>
                ) : currentName.length < ENS_MIN_NAME_LENGTH ? (
                  <span className="text-dim">
                    minimum {ENS_MIN_NAME_LENGTH} characters
                  </span>
                ) : showStatus && isOwnedByUser ? (
                  <>
                    <VerifiedBadge
                      ensName={currentName}
                      iconClassName="h-3.5 w-3.5"
                    />
                    <span className="text-green">registered by you</span>
                  </>
                ) : showStatus && isAvailable ? (
                  <>
                    <CheckCircle className="h-3.5 w-3.5 text-green" />
                    <span className="text-green">available</span>
                  </>
                ) : showStatus && isAvailable === false ? (
                  <>
                    <XCircle className="h-3.5 w-3.5 text-red" />
                    <span className="text-red">taken</span>
                  </>
                ) : null}
              </div>
              {showStatus && isAvailable && rentPriceFormatted && (
                <span className="text-dim tabular-nums text-xs">
                  ~{Number(rentPriceFormatted).toFixed(4)} ETH/year
                </span>
              )}
            </div>
          )}

          {/* Registration flow (post-commit states) */}
          {currentName &&
            currentName.length >= ENS_MIN_NAME_LENGTH &&
            isAvailable &&
            registrationState !== 'idle' && (
              <div className="w-full max-w-sm space-y-4">
                {/* Step progress bar */}
                <div className="flex items-center gap-2">
                  <RegistrationStep
                    step={1}
                    label="commit"
                    state={registrationState}
                    activeStates={['committing']}
                    completeStates={[
                      'waiting',
                      'ready',
                      'registering',
                      'complete',
                    ]}
                  />
                  <div
                    className={cn(
                      'flex-1 h-px',
                      ['waiting', 'ready', 'registering', 'complete'].includes(
                        registrationState,
                      )
                        ? 'bg-green/40'
                        : 'bg-border',
                    )}
                  />
                  <RegistrationStep
                    step={2}
                    label="wait"
                    state={registrationState}
                    activeStates={['waiting']}
                    completeStates={['ready', 'registering', 'complete']}
                  />
                  <div
                    className={cn(
                      'flex-1 h-px',
                      ['ready', 'registering', 'complete'].includes(
                        registrationState,
                      )
                        ? 'bg-green/40'
                        : 'bg-border',
                    )}
                  />
                  <RegistrationStep
                    step={3}
                    label="register"
                    state={registrationState}
                    activeStates={['ready', 'registering']}
                    completeStates={['complete']}
                  />
                </div>

                {/* Committing */}
                {registrationState === 'committing' && (
                  <div className="p-5 border border-yellow/30 bg-yellow/5">
                    <Loader className="mx-auto mb-2" />
                    <div className="text-sm">submitting commitment...</div>
                    <p className="text-dim text-xs mt-1">
                      confirm the transaction in your wallet
                    </p>
                  </div>
                )}

                {/* Waiting */}
                {registrationState === 'waiting' && (
                  <div className="p-6 border border-yellow/30 bg-yellow/5">
                    <Clock className="h-8 w-8 text-yellow mx-auto mb-3" />
                    <div className="mb-2">waiting for commitment to mature</div>
                    <div className="text-3xl text-yellow tabular-nums mb-2">
                      {formatTime(timeUntilReveal)}
                    </div>
                    <div className="w-full max-w-48 mx-auto h-1 bg-border overflow-hidden">
                      <div
                        className="h-full bg-yellow transition-all duration-1000"
                        style={{
                          width: `${Math.max(0, ((60 - timeUntilReveal) / 60) * 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-dim text-xs mt-3">
                      ~60 seconds to prevent front-running
                    </p>
                  </div>
                )}

                {/* Ready */}
                {registrationState === 'ready' && canReveal && (
                  <div className="space-y-3">
                    <div className="p-3 border border-green/30 bg-green/5">
                      <span className="text-green text-sm">
                        ready to register!
                      </span>
                    </div>
                    <Button
                      onClick={register}
                      disabled={isPending}
                      className="w-full h-12 text-base"
                      showPrefix
                    >
                      {isRegistering ? (
                        <>
                          <Loader type="dots" />
                          registering...
                        </>
                      ) : (
                        <>register {currentName}.eth</>
                      )}
                    </Button>
                  </div>
                )}

                {/* Registering */}
                {registrationState === 'registering' && (
                  <div className="p-5 border border-yellow/30 bg-yellow/5">
                    <Loader className="mx-auto mb-2" />
                    <div className="text-sm">
                      registering {currentName}.eth...
                    </div>
                    <p className="text-dim text-xs mt-1">
                      confirm the transaction in your wallet
                    </p>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="p-3 border border-red/50 bg-red/5 text-red text-sm">
                    {error.message}
                  </div>
                )}
              </div>
            )}
        </div>
      </div>

      {/* Registration complete */}
      {isRegistered && (
        <div className="border border-green/30 bg-green/5 p-6 text-center">
          <div className="flex justify-center mb-3">
            <VerifiedBadge ensName={currentName} iconClassName="h-10 w-10" />
          </div>
          <div className="text-lg text-green mb-1">
            {currentName}.eth registered!
          </div>
          <p className="text-dim text-sm">
            your token will display a verified badge across the launchpad
          </p>
        </div>
      )}

      {/* Still mining — only show when user is ready to move on */}
      {isMining && (isRegistered || registrationState === 'idle') && (
        <div className="border border-yellow/30 bg-yellow/5 p-4 flex items-center gap-3">
          <Loader />
          <div>
            <div className="text-sm text-yellow">preparing deployment...</div>
            <p className="text-xs text-dim mt-0.5">
              {miningProgress || 'mining salt for token address...'}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4 pt-2">
        <Button
          onClick={onBack}
          variant="secondary"
          size="lg"
          className="flex-1 h-12"
        >
          back
        </Button>
        <Button
          onClick={onContinue}
          disabled={!saltReady}
          size="lg"
          className="flex-1 h-12"
          showPrefix={saltReady}
        >
          {!saltReady ? (
            <>
              <Loader type="dots" />
              preparing...
            </>
          ) : isRegistered ? (
            <>
              continue to deploy <ArrowRight className="h-4 w-4" />
            </>
          ) : (
            <>
              skip & deploy <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

/* --- Subcomponents --- */

function RegistrationStep({
  step,
  label,
  state,
  activeStates,
  completeStates,
}: {
  step: number;
  label: string;
  state: string;
  activeStates: string[];
  completeStates: string[];
}) {
  const isActive = activeStates.includes(state);
  const isComplete = completeStates.includes(state);

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={cn(
          'w-6 h-6 border flex items-center justify-center text-xs',
          isComplete
            ? 'border-green text-green bg-green/10'
            : isActive
              ? 'border-yellow text-yellow bg-yellow/10'
              : 'border-dim/40 text-dim/60',
        )}
      >
        {isComplete ? '✓' : step}
      </div>
      <span
        className={cn(
          'text-sm',
          isComplete ? 'text-green' : isActive ? 'text-yellow' : 'text-dim/60',
        )}
      >
        {label}
      </span>
    </div>
  );
}
