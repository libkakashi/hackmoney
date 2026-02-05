'use client';

import {useCallback} from 'react';
import {Globe, MessageCircle, Send, Zap, Calendar, Clock} from 'lucide-react';
import {Button} from '~/components/ui/button';
import {Input} from '~/components/ui/input';
import {ImageUpload} from '~/components/ui/image-upload';

export type LaunchMode = 'now' | 'scheduled';

export interface FormData {
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

interface ConfigStepProps {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  mode: LaunchMode;
  setMode: (mode: LaunchMode) => void;
  scheduledTime: string;
  setScheduledTime: (time: string) => void;
  onContinue: () => void;
  disabled?: boolean;
}

export const ConfigStep = ({
  form,
  setForm,
  mode,
  setMode,
  scheduledTime,
  setScheduledTime,
  onContinue,
  disabled,
}: ConfigStepProps) => {
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
    [setForm],
  );

  const canProceed = form.name && form.symbol;

  return (
    <div className="space-y-8">
      {/* Token configuration section */}
      <div>
        <div className="text-sm mb-4">
          <span className="text-dim">01</span> <span>token configuration</span>
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
                disabled={disabled}
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
                  disabled={disabled}
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
                  disabled={disabled}
                  maxLength={10}
                  className="h-11 px-4 uppercase placeholder:normal-case"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-dim text-xs block mb-2">description</label>
            <textarea
              placeholder="describe your token..."
              value={form.description}
              onChange={e => updateForm('description', e.target.value)}
              disabled={disabled}
              rows={4}
              className="w-full px-4 py-3 bg-background border border-border text-sm resize-none placeholder:text-dim focus:outline-none focus:border-green disabled:opacity-50"
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
                  disabled={disabled}
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
                  disabled={disabled}
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
                  disabled={disabled}
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
                  disabled={disabled}
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
            disabled={disabled}
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
              <p className="text-dim text-xs">start auction immediately</p>
            </div>
          </Button>
          <Button
            onClick={() => setMode('scheduled')}
            variant="outline"
            disabled={disabled}
            className={`p-4 h-auto text-left justify-start ${
              mode === 'scheduled' ? 'border-purple bg-purple/5' : ''
            }`}
          >
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2 mb-1">
                <Calendar
                  className={`h-4 w-4 ${mode === 'scheduled' ? 'text-purple' : 'text-dim'}`}
                />
                <span className={mode === 'scheduled' ? 'text-purple' : ''}>
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
            disabled={disabled}
            className="h-11 px-4 mt-4 focus:border-purple"
          />
        )}
      </div>

      {/* Continue */}
      <Button
        onClick={onContinue}
        disabled={!canProceed || disabled}
        size="lg"
        className="w-full h-12"
        showPrefix
      >
        continue
      </Button>
    </div>
  );
};
