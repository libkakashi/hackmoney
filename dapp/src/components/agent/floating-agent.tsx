'use client';

import {useRef, useEffect, useState, useMemo, type FormEvent} from 'react';
import {useChat} from '@ai-sdk/react';
import {
  type UIMessage,
  type UIMessagePart,
  isToolUIPart,
  getToolName,
  DefaultChatTransport,
} from 'ai';
import Link from 'next/link';
import {Send, Loader2} from 'lucide-react';
import Draggable from 'react-draggable';
import {Button} from '~/components/ui/button';
import {Input} from '~/components/ui/input';
import {useAgent, usePageContext} from './agent-context';
import {useAgentTools} from './use-agent-tools';
import {MarkdownRenderer} from './markdown-renderer';

type AnyPart = UIMessagePart<any, any>;

/* ── Mascot SVG ─────────────────────────────────────────────────────────── */
function Mascot({className}: {className?: string}) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="16"
        y="20"
        width="32"
        height="28"
        fill="var(--card)"
        stroke="var(--terminal-green)"
        strokeWidth="2"
      />
      <rect
        x="20"
        y="8"
        width="24"
        height="16"
        fill="var(--card)"
        stroke="var(--terminal-green)"
        strokeWidth="2"
      />
      <line
        x1="32"
        y1="2"
        x2="32"
        y2="8"
        stroke="var(--terminal-green)"
        strokeWidth="2"
      />
      <rect x="30" y="0" width="4" height="4" fill="var(--terminal-green)" />
      <rect
        x="25"
        y="13"
        width="4"
        height="4"
        fill="var(--terminal-green)"
        className="pulse-soft"
      />
      <rect
        x="35"
        y="13"
        width="4"
        height="4"
        fill="var(--terminal-green)"
        className="pulse-soft"
      />
      <rect x="27" y="19" width="10" height="2" fill="var(--terminal-purple)" />
      <rect
        x="22"
        y="26"
        width="20"
        height="12"
        fill="var(--background)"
        stroke="var(--terminal-dim)"
        strokeWidth="1"
      />
      <rect
        x="24"
        y="29"
        width="8"
        height="1"
        fill="var(--terminal-green)"
        opacity="0.8"
      />
      <rect
        x="24"
        y="32"
        width="12"
        height="1"
        fill="var(--terminal-green)"
        opacity="0.5"
      />
      <rect
        x="24"
        y="35"
        width="6"
        height="1"
        fill="var(--terminal-green)"
        opacity="0.3"
      />
      <rect
        x="20"
        y="48"
        width="8"
        height="8"
        fill="var(--card)"
        stroke="var(--terminal-green)"
        strokeWidth="2"
      />
      <rect
        x="36"
        y="48"
        width="8"
        height="8"
        fill="var(--card)"
        stroke="var(--terminal-green)"
        strokeWidth="2"
      />
      <rect
        x="8"
        y="24"
        width="8"
        height="4"
        fill="var(--card)"
        stroke="var(--terminal-green)"
        strokeWidth="2"
      />
      <rect
        x="48"
        y="24"
        width="8"
        height="4"
        fill="var(--card)"
        stroke="var(--terminal-green)"
        strokeWidth="2"
      />
    </svg>
  );
}

/* ── Tool result display ────────────────────────────────────────────────── */
function ToolResultCard({result}: {result: unknown}) {
  if (!Array.isArray(result)) {
    if (
      result &&
      typeof result === 'object' &&
      'error' in (result as Record<string, unknown>)
    ) {
      return (
        <div className="text-red text-xs">
          err: {(result as {error: string}).error}
        </div>
      );
    }
    if (
      result &&
      typeof result === 'object' &&
      'success' in (result as Record<string, unknown>)
    ) {
      const r = result as {success: boolean; txHash?: string};
      return (
        <div className="text-green text-xs">
          tx confirmed{r.txHash ? `: ${r.txHash.slice(0, 10)}...` : ''}
        </div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-1">
      {result.map(
        (
          token: {
            address: string;
            name: string;
            symbol: string;
            description?: string;
          },
          i: number,
        ) => (
          <Link
            key={token.address || i}
            href={`/token/${token.address}`}
            className="block border border-border p-1.5 hover:border-green transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-green ">$</span>
              <span className="text-xs font-bold">{token.symbol}</span>
              <span className="text-dim  truncate">{token.name}</span>
            </div>
            {token.description && (
              <div className="text-dim  mt-0.5 line-clamp-1">
                {token.description}
              </div>
            )}
          </Link>
        ),
      )}
    </div>
  );
}

/* ── Comic bubble ───────────────────────────────────────────────────────── */
function ComicBubble({
  message,
  isLast,
  onMascotClick,
}: {
  message: UIMessage;
  isLast: boolean;
  onMascotClick?: () => void;
}) {
  const isUser = message.role === 'user';

  return (
    <div className="flex items-end gap-2">
      {/* Bubble */}
      <div
        className={`relative border-2 px-3 py-2 w-[300px] ${
          isUser
            ? 'border-terminal-purple bg-card'
            : 'border-terminal-green bg-card'
        }`}
      >
        {/* Comic tail — triangle pointing right toward mascot */}
        <div
          className={`absolute -right-[9px] bottom-2 w-0 h-0
            border-t-[6px] border-t-transparent
            border-b-[6px] border-b-transparent
            ${isUser ? 'border-l-[9px] border-l-terminal-purple' : 'border-l-[9px] border-l-terminal-green'}`}
        />
        {/* Inner tail to match bg */}
        <div
          className="absolute -right-[6px] bottom-2 w-0 h-0
            border-t-[6px] border-t-transparent
            border-b-[6px] border-b-transparent
            border-l-[7px] border-l-card"
        />

        {/* Label */}
        <div
          className={`uppercase tracking-wider mb-1 ${
            isUser ? 'text-purple' : 'text-green'
          }`}
        >
          {isUser ? '> you' : '> agent'}
        </div>

        {/* Content */}
        <div
          className={`text-xs leading-relaxed ${isUser ? 'text-foreground' : 'text-purple'}`}
        >
          {(message.parts as AnyPart[]).map((part, i) => {
            if (part.type === 'text') {
              return (
                <div key={i}>
                  <MarkdownRenderer content={part.text} />
                </div>
              );
            }
            if (isToolUIPart(part)) {
              const toolName = getToolName(part as any);
              const p = part as any;
              if (p.state === 'output-available') {
                return (
                  <div key={i} className="my-1.5">
                    <div className="text-dim mb-0.5">&gt; {toolName}()</div>
                    <ToolResultCard result={p.output} />
                  </div>
                );
              }
              if (p.state === 'output-error') {
                return (
                  <div key={i} className="my-1 text-red ">
                    err: {toolName}() failed
                  </div>
                );
              }
              return (
                <div key={i} className="flex items-center gap-1 my-1 text-dim ">
                  <Loader2 className="size-2.5 animate-spin" />
                  {toolName}...
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>

      {/* Mascot on the right of the last message — click to close */}
      {isLast ? (
        <div className="flex-shrink-0 self-end" onClick={onMascotClick}>
          <Mascot className="w-10 h-10" />
        </div>
      ) : (
        /* Spacer to keep bubbles aligned when no mascot */
        <div className="w-10 flex-shrink-0" />
      )}
    </div>
  );
}

/* ── Main Floating Agent ────────────────────────────────────────────────── */
export function FloatingAgent() {
  const {open, toggle} = useAgent();
  const {placeBid, claimTokens, swapTokens} = useAgentTools();
  const pageContext = usePageContext();
  const [chatOpen, setChatOpen] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const transport = useMemo(
    () => new DefaultChatTransport({body: () => ({pageContext})}),
    [pageContext],
  );

  const {messages, sendMessage, addToolOutput, status} = useChat({
    transport,
    onToolCall: async ({toolCall}) => {
      const {toolName, toolCallId} = toolCall;
      const input = (toolCall as any).input as
        | Record<string, string>
        | undefined;
      if (!input) return;

      if (toolName === 'placeBid') {
        const result = await placeBid(input.auctionAddress, input.amount);
        addToolOutput({tool: toolName as any, toolCallId, output: result});
        return;
      }
      if (toolName === 'claimTokens') {
        const result = await claimTokens(input.auctionAddress);
        addToolOutput({tool: toolName as any, toolCallId, output: result});
        return;
      }
      if (toolName === 'swapTokens') {
        const result = await swapTokens(
          input.tokenAddress,
          input.sellAmount,
          input.buyToken as 'token' | 'quote',
        );
        addToolOutput({tool: toolName as any, toolCallId, output: result});
        return;
      }
    },
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isStreaming = status === 'streaming' || status === 'submitted';

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (chatOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [chatOpen]);

  // Sync with agent context
  useEffect(() => {
    if (open && !chatOpen) setChatOpen(true);
  }, [open, chatOpen]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const input = inputRef.current;
    if (!input || !input.value.trim() || isStreaming) return;
    const text = input.value.trim();
    input.value = '';
    sendMessage({text});
  };

  const handleMascotClick = () => {
    if (isDragging.current) return;
    if (!open) toggle();
    setChatOpen(prev => !prev);
  };

  if (!open && !chatOpen) return null;

  // Find last message index (regardless of role) for mascot placement
  const lastIdx = messages.length - 1;

  return (
    <Draggable
      nodeRef={nodeRef as React.RefObject<HTMLElement>}
      cancel="input, button, a, form"
      defaultPosition={{x: 0, y: 0}}
      onStart={() => {
        isDragging.current = false;
      }}
      onDrag={() => {
        isDragging.current = true;
      }}
    >
      <div
        ref={nodeRef}
        className="text-xs fixed bottom-6 right-6 z-50 flex flex-col items-end cursor-grab active:cursor-grabbing"
      >
        {/* Chat area */}
        {chatOpen && (
          <div className="flex flex-col w-[348px] max-h-[60vh] mb-2">
            {/* Scrollable messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto min-h-0 mb-2"
              style={{direction: 'rtl'}}
            >
              <div className="flex flex-col gap-3" style={{direction: 'ltr'}}>
                {/* Empty state — mascot greeting */}
                {messages.length === 0 && (
                  <div className="flex items-end gap-2">
                    <div className="relative border-2 border-terminal-green bg-card px-3 py-3 w-[300px]">
                      {/* Comic tail pointing right */}
                      <div
                        className="absolute -right-[9px] bottom-2 w-0 h-0
                        border-t-[6px] border-t-transparent
                        border-b-[6px] border-b-transparent
                        border-l-[9px] border-l-terminal-green"
                      />
                      <div
                        className="absolute -right-[6px] bottom-2 w-0 h-0
                        border-t-[6px] border-t-transparent
                        border-b-[6px] border-b-transparent
                        border-l-[7px] border-l-card"
                      />
                      <div className="text-green uppercase tracking-wider mb-1.5">
                        &gt; agent
                      </div>
                      <div className="text-xs text-purple leading-relaxed">
                        hey. ask me about tokens, auctions, or anything on the
                        platform.
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {[
                          'show live tokens',
                          'what is timelock?',
                          'list new launches',
                        ].map(s => (
                          <Button
                            key={s}
                            variant="outline"
                            size="xs"
                            className="text-dim hover:text-green hover:border-green"
                            onClick={() => {
                              if (inputRef.current) {
                                inputRef.current.value = s;
                                inputRef.current.focus();
                              }
                            }}
                          >
                            {s}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div
                      className="flex-shrink-0 self-end"
                      onClick={handleMascotClick}
                    >
                      <Mascot className="w-10 h-10" />
                    </div>
                  </div>
                )}

                {/* Message bubbles */}
                {messages.map((msg, i) => (
                  <ComicBubble
                    key={msg.id}
                    message={msg}
                    isLast={i === lastIdx}
                    onMascotClick={handleMascotClick}
                  />
                ))}

                {/* Thinking indicator */}
                {isStreaming &&
                  messages[messages.length - 1]?.role === 'user' && (
                    <div className="flex items-end gap-2">
                      <div className="relative border-2 border-terminal-green bg-card px-3 py-2 w-[300px]">
                        {/* Comic tail */}
                        <div
                          className="absolute -right-[9px] bottom-2 w-0 h-0
                          border-t-[6px] border-t-transparent
                          border-b-[6px] border-b-transparent
                          border-l-[9px] border-l-terminal-green"
                        />
                        <div
                          className="absolute -right-[6px] bottom-2 w-0 h-0
                          border-t-[6px] border-t-transparent
                          border-b-[6px] border-b-transparent
                          border-l-[7px] border-l-card"
                        />
                        <div className="flex items-center gap-1.5 text-dim ">
                          <Loader2 className="size-2.5 animate-spin" />
                          thinking<span className="blink">_</span>
                        </div>
                      </div>
                      <div
                        className="flex-shrink-0 self-end"
                        onClick={handleMascotClick}
                      >
                        <Mascot className="w-10 h-10" />
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Input — same width as message bubbles */}
            <form onSubmit={handleSubmit} className="flex gap-2 w-[300px]">
              <Input
                ref={inputRef}
                type="text"
                placeholder="ask agent..."
                disabled={isStreaming}
                className="flex-1 text-xs"
              />
              <Button
                type="submit"
                disabled={isStreaming}
                variant="default"
                size="icon"
              >
                {isStreaming ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
              </Button>
            </form>
          </div>
        )}

        {/* Mascot — always visible when no chat, drag handle, click to toggle */}
        {!chatOpen && (
          <div
            className="group relative w-14 h-14 border-2 border-terminal-green bg-card hover:bg-terminal-green/10 transition-all duration-200 flex items-center justify-center select-none"
            title="Drag me or click to chat"
            onClick={handleMascotClick}
          >
            <Mascot className="w-10 h-10 pointer-events-none" />
            <div
              className="absolute inset-0 border-2 border-terminal-green opacity-0 group-hover:opacity-40 transition-opacity pointer-events-none"
              style={{boxShadow: '0 0 12px var(--terminal-green)'}}
            />
          </div>
        )}
      </div>
    </Draggable>
  );
}
