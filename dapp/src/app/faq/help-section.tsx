'use client';

import {useState} from 'react';
import {Send, Mail, MessageSquare, Terminal, Users} from 'lucide-react';
import {Input} from '~/components/ui/input';
import {Textarea} from '~/components/ui/textarea';

export function HelpSection() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [formStatus, setFormStatus] = useState<
    'idle' | 'sending' | 'sent' | 'error'
  >('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !message) return;

    setFormStatus('sending');
    // Simulate sending - replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setFormStatus('sent');
    setEmail('');
    setMessage('');
    setTimeout(() => setFormStatus('idle'), 3000);
  };

  return (
    <div className="mt-12 pt-8 border-t border-border">
      <div className="text-sm mb-6 text-dim">
        <span className="text-yellow">$</span> need more help?
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column - Contact form (2/3 width) */}
        <div className="md:col-span-2 border border-border">
          <div className="flex items-center gap-2 border-b border-border text-sm text-dim px-4 py-3 bg-card">
            <MessageSquare className="size-4" />
            <span className="text-purple">submit</span>
            <span>:</span>
            <span>feedback</span>
          </div>

          <form onSubmit={handleSubmit} className="p-4">
            <div className="space-y-4">
              {/* Email input */}
              <div>
                <label className="flex items-center gap-2  text-dim mb-2">
                  <Mail className="size-3" />
                  <span>email</span>
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="anon@example.com"
                  required
                />
              </div>

              {/* Message textarea */}
              <div>
                <label className="flex items-center gap-2  text-dim mb-2">
                  <Terminal className="size-3" />
                  <span>message</span>
                </label>
                <Textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="describe your question or feedback..."
                  rows={8}
                  required
                />
              </div>

              {/* Submit button */}
              <div className="flex items-center justify-between">
                <div className="">
                  {formStatus === 'sent' && (
                    <span className="text-green flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 bg-green" />
                      message sent successfully
                    </span>
                  )}
                  {formStatus === 'error' && (
                    <span className="text-red flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 bg-red" />
                      failed to send
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={formStatus === 'sending' || !email || !message}
                  className="flex items-center gap-2 border border-yellow text-yellow px-4 py-2 text-sm hover:bg-yellow hover:text-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-yellow"
                >
                  {formStatus === 'sending' ? (
                    <>
                      <span className="animate-pulse">sending</span>
                      <span className="blink">_</span>
                    </>
                  ) : (
                    <>
                      <Send className="size-3.5" />
                      <span>submit</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Right column - Social links (1/3 width) */}
        <div className="border border-border flex flex-col">
          <div className="flex items-center gap-2 border-b border-border text-sm text-dim px-4 py-3 bg-card">
            <Users className="size-4" />
            <span className="text-purple">socials</span>
          </div>

          <div className="flex flex-col">
            <a
              href="https://discord.gg/timelock"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between hover:bg-purple/5 transition-colors group p-4 border-b border-border"
            >
              <div>
                <div className=" text-dim">join</div>
                <div className="text-purple group-hover:underline">discord</div>
              </div>
              <span className="text-purple">→</span>
            </a>

            <a
              href="https://twitter.com/timelock"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between hover:bg-green/5 transition-colors group p-4 border-b border-border"
            >
              <div>
                <div className=" text-dim">follow</div>
                <div className="text-green group-hover:underline">twitter</div>
              </div>
              <span className="text-green">→</span>
            </a>
          </div>
        </div>
      </div>

      {/* Terminal footer */}
      <div className="mt-8 text-xs text-dim">
        <div className="flex items-center gap-2">
          <span className="text-green">●</span>
          <span>process complete</span>
          <span className="text-dim">|</span>
          <span>exit code: 0</span>
        </div>
      </div>
    </div>
  );
}
