'use client';

import {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
  type SubmitEventHandler,
} from 'react';
import {useChat} from '@ai-sdk/react';
import {
  type UIMessage,
  isToolUIPart,
  getToolName,
  DefaultChatTransport,
} from 'ai';
import Link from 'next/link';
import {Send, Loader2, Power, Clock} from 'lucide-react';
import Draggable from 'react-draggable';
import {Resizable} from 're-resizable';
import {Button} from '~/components/ui/button';
import {Input} from '~/components/ui/input';
import {usePageContext} from './agent-context';
import {useAgentTools} from './use-agent-tools';
import {MarkdownRenderer} from './markdown-renderer';

/* ── Tool result display ────────────────────────────────────────────────── */
function ToolResultCard({result}: {result: unknown}) {
  if (!Array.isArray(result)) {
    if (
      result &&
      typeof result === 'object' &&
      'error' in (result as Record<string, unknown>)
    ) {
      return (
        <div className="text-red ">
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
      if (r.txHash) {
        return (
          <div className="text-green ">
            tx confirmed: {r.txHash.slice(0, 10)}...
          </div>
        );
      }
      return null;
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
              <span className="text-green">$</span>
              <span className="font-bold">{token.symbol}</span>
              <span className="text-dim truncate">{token.name}</span>
            </div>
            {token.description && (
              <div className="text-dim mt-0.5 line-clamp-1">
                {token.description}
              </div>
            )}
          </Link>
        ),
      )}
    </div>
  );
}

/* ── Message row inside the CRT screen ──────────────────────────────────── */
function CRTMessage({message}: {message: UIMessage}) {
  const isUser = message.role === 'user';

  return (
    <div className={`px-3 py-1.5 ${isUser ? '' : 'crt-glow'}`}>
      {/* Role label */}
      <div
        className={`tracking-wider mb-0.5 ${
          isUser ? 'text-cyan-400' : 'text-green'
        }`}
      >
        {isUser ? '> you' : '> agent'}
      </div>

      {/* Content */}
      <div
        className={`leading-relaxed ${isUser ? 'text-foreground' : 'text-purple'}`}
      >
        {message.parts.map((part, i) => {
          if (part.type === 'text') {
            return (
              <div key={i}>
                <MarkdownRenderer content={part.text} />
              </div>
            );
          }
          if (isToolUIPart(part)) {
            const toolName = getToolName(part);
            const p = part;

            // suggestReplies rendered separately as clickable buttons
            if (toolName === 'suggestReplies') return null;

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
  );
}

/**
 * Like lastAssistantMessageIsCompleteWithToolCalls, but excludes
 * suggestReplies so it doesn't trigger another model round.
 */
function shouldAutoSend({messages}: {messages: UIMessage[]}) {
  const message = messages[messages.length - 1];
  if (!message || message.role !== 'assistant') return false;

  const lastStepStart = message.parts.reduce(
    (idx, part, i) => (part.type === 'step-start' ? i : idx),
    -1,
  );

  const toolParts = message.parts
    .slice(lastStepStart + 1)
    .filter(isToolUIPart)
    .filter(p => !p.providerExecuted);

  // Only consider tools that should trigger another round (not suggestReplies)
  const actionable = toolParts.filter(p => getToolName(p) !== 'suggestReplies');

  return (
    actionable.length > 0 &&
    actionable.every(
      p => p.state === 'output-available' || p.state === 'output-error',
    )
  );
}

/* ── Reply type from suggestReplies ──────────────────────────────────── */
type SuggestReply = string | {text: string; timerSeconds?: number};

function getReplyText(reply: SuggestReply): string {
  return typeof reply === 'string' ? reply : reply.text;
}

function getReplyTimer(reply: SuggestReply): number | undefined {
  return typeof reply === 'string' ? undefined : reply.timerSeconds;
}

/* ── Timer button for countdown replies ─────────────────────────────── */
function TimerReplyButton({
  reply,
  onSend,
}: {
  reply: SuggestReply;
  onSend: (text: string) => void;
}) {
  const text = getReplyText(reply);
  const timerSeconds = getReplyTimer(reply);
  const [remaining, setRemaining] = useState(timerSeconds ?? 0);

  useEffect(() => {
    if (!timerSeconds) return;
    setRemaining(timerSeconds);
    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerSeconds]);

  const isDisabled = timerSeconds !== null && remaining > 0;

  return (
    <Button
      variant="outline"
      size="xs"
      disabled={isDisabled}
      className={
        isDisabled
          ? 'border-yellow/40 cursor-not-allowed tabular-nums gap-1.5'
          : 'text-green border-green/50 hover:bg-green/10 hover:border-green'
      }
      onClick={() => !isDisabled && onSend(text)}
    >
      {isDisabled ? (
        <>
          <Clock className="size-2.5 text-yellow" />
          <span className="text-yellow">{remaining}s</span>
          <span className="text-yellow">|</span>
          <span className="text-foreground">{text}</span>
        </>
      ) : (
        text
      )}
    </Button>
  );
}

/* ── Main Floating Agent ────────────────────────────────────────────────── */
export function FloatingAgent() {
  const {
    placeBid,
    claimTokens,
    getBalances,
    previewSwap,
    approveIfNeeded,
    executeSwapExactInput,
    previewSwapExactOutput,
    executeSwapExactOutput,
    previewGeneralSwap,
    approveGeneralSwap,
    executeGeneralSwap,
    previewGeneralSwapExactOutput,
    executeGeneralSwapExactOutput,
    getMyEnsName,
    checkEnsName,
    commitEnsName,
    registerEnsName,
    setPrimaryEnsName,
  } = useAgentTools();
  const pageContext = usePageContext();
  const [chatOpen, setChatOpen] = useState(false);

  const nodeRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const [monitorSize, setMonitorSize] = useState({width: 400, height: 540});

  const pageContextRef = useRef(pageContext);
  const prevPageRef = useRef<string | undefined>(undefined);

  // Keep ref in sync
  useEffect(() => {
    pageContextRef.current = pageContext;
  }, [pageContext]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        body: () => ({pageContext: pageContextRef.current}),
      }),
    // Stable transport — body function reads from ref so it always gets latest context
    [],
  );

  const {messages, sendMessage, addToolOutput, status} = useChat({
    transport,
    sendAutomaticallyWhen: shouldAutoSend,
    onToolCall: async ({toolCall}) => {
      const {toolName, toolCallId} = toolCall;
      const input = toolCall.input as Record<string, string> | undefined;
      if (!input) return;

      if (toolName === 'getBalances') {
        const result = await getBalances(input.tokenAddress);
        void addToolOutput({tool: toolName, toolCallId, output: result});
        return;
      }
      if (toolName === 'placeBid') {
        const result = await placeBid(input.auctionAddress, input.amount);
        void addToolOutput({tool: toolName, toolCallId, output: result});
        return;
      }
      if (toolName === 'claimTokens') {
        const result = await claimTokens(input.auctionAddress);
        void addToolOutput({tool: toolName, toolCallId, output: result});
        return;
      }
      if (toolName === 'previewSwap') {
        const result = await previewSwap(
          input.tokenAddress,
          input.sellAmount,
          input.buyToken as 'token' | 'quote',
          input.quoteToken ?? 'USDC',
        );
        void addToolOutput({tool: toolName, toolCallId, output: result});
        return;
      }
      if (toolName === 'approveIfNeeded') {
        const result = await approveIfNeeded(
          input.tokenAddress,
          input.sellAmount,
          input.buyToken as 'token' | 'quote',
          input.quoteToken ?? 'USDC',
        );
        void addToolOutput({tool: toolName, toolCallId, output: result});
        return;
      }
      if (toolName === 'executeSwapExactInput') {
        const result = await executeSwapExactInput(
          input.tokenAddress,
          input.sellAmount,
          input.buyToken as 'token' | 'quote',
          input.quoteToken ?? 'USDC',
        );
        void addToolOutput({tool: toolName, toolCallId, output: result});
        return;
      }
      if (toolName === 'previewSwapExactOutput') {
        const result = await previewSwapExactOutput(
          input.tokenAddress,
          input.receiveAmount,
          input.buyToken as 'token' | 'quote',
          input.quoteToken ?? 'USDC',
        );
        void addToolOutput({tool: toolName, toolCallId, output: result});
        return;
      }
      if (toolName === 'executeSwapExactOutput') {
        const result = await executeSwapExactOutput(
          input.tokenAddress,
          input.receiveAmount,
          input.buyToken as 'token' | 'quote',
          input.quoteToken ?? 'USDC',
        );
        void addToolOutput({tool: toolName, toolCallId, output: result});
        return;
      }
      if (toolName === 'previewGeneralSwap') {
        const result = await previewGeneralSwap(
          input.fromToken,
          input.toToken,
          input.sellAmount,
        );
        void addToolOutput({tool: toolName, toolCallId, output: result});
        return;
      }
      if (toolName === 'approveGeneralSwap') {
        const result = await approveGeneralSwap(
          input.fromToken,
          input.sellAmount,
        );
        void addToolOutput({tool: toolName, toolCallId, output: result});
        return;
      }
      if (toolName === 'executeGeneralSwap') {
        const result = await executeGeneralSwap(
          input.fromToken,
          input.toToken,
          input.sellAmount,
        );
        void addToolOutput({tool: toolName, toolCallId, output: result});
        return;
      }
      if (toolName === 'previewGeneralSwapExactOutput') {
        const result = await previewGeneralSwapExactOutput(
          input.fromToken,
          input.toToken,
          input.receiveAmount,
        );
        void addToolOutput({tool: toolName, toolCallId, output: result});
        return;
      }
      if (toolName === 'executeGeneralSwapExactOutput') {
        const result = await executeGeneralSwapExactOutput(
          input.fromToken,
          input.toToken,
          input.receiveAmount,
        );
        void addToolOutput({tool: toolName, toolCallId, output: result});
        return;
      }
      if (toolName === 'getMyEnsName') {
        const result = await getMyEnsName();
        void addToolOutput({tool: toolName, toolCallId, output: result});
        return;
      }
      if (toolName === 'checkEnsName') {
        const result = await checkEnsName(input.name);
        void addToolOutput({tool: toolName, toolCallId, output: result});
        return;
      }
      if (toolName === 'commitEnsName') {
        const result = await commitEnsName(input.name);
        void addToolOutput({tool: toolName, toolCallId, output: result});
        return;
      }
      if (toolName === 'registerEnsName') {
        const result = await registerEnsName(input.name);
        void addToolOutput({tool: toolName, toolCallId, output: result});
        return;
      }
      if (toolName === 'setPrimaryEnsName') {
        const result = await setPrimaryEnsName(input.name);
        void addToolOutput({tool: toolName, toolCallId, output: result});
        return;
      }
      if (toolName === 'suggestReplies') {
        // Provide a result so the SDK doesn't throw MissingToolResultsError
        // when the user sends the next message. The custom shouldAutoSend
        // function excludes this tool from triggering another model round.
        void addToolOutput({
          tool: toolName,
          toolCallId,
          output: {replies: input.replies},
        });
        return;
      }
    },
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isStreaming = status === 'streaming' || status === 'submitted';

  // Detect page navigation mid-conversation and notify the model
  const pageKey =
    pageContext.page === 'token'
      ? `token:${pageContext.tokenAddress}`
      : pageContext.page;
  useEffect(() => {
    if (prevPageRef.current === undefined) {
      prevPageRef.current = pageKey;
      return;
    }
    if (
      prevPageRef.current !== pageKey &&
      messages.length > 0 &&
      !isStreaming
    ) {
      prevPageRef.current = pageKey;
      let navText: string;
      if (pageContext.page === 'token' && pageContext.tokenAddress) {
        const label = pageContext.tokenSymbol
          ? `${pageContext.tokenSymbol} (${pageContext.tokenAddress})`
          : pageContext.tokenAddress;
        navText = `[I just navigated to the token page for ${label}]`;
      } else if (pageContext.page === 'discover') {
        navText = '[I just navigated to the discover page]';
      } else {
        navText = '[I just navigated to a different page]';
      }
      void sendMessage({text: navText});
    } else {
      prevPageRef.current = pageKey;
    }
  }, [pageKey]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (chatOpen) {
      setTimeout(() => inputRef.current?.focus(), 600);
    }
  }, [chatOpen]);

  const handleSubmit: SubmitEventHandler = e => {
    e.preventDefault();
    const input = inputRef.current;
    if (!input || !input.value.trim() || isStreaming) return;
    const text = input.value.trim();
    input.value = '';
    void sendMessage({text});
  };

  const handlePowerToggle = useCallback(() => {
    if (isDragging.current) return;
    if (chatOpen) {
      setChatOpen(false);
    } else {
      setChatOpen(true);
    }
  }, [chatOpen]);

  const handleMascotClick = () => {
    if (isDragging.current) return;
    handlePowerToggle();
  };

  return (
    <Draggable
      nodeRef={nodeRef as React.RefObject<HTMLElement>}
      handle=".drag-handle"
      defaultPosition={{x: 0, y: 0}}
      onStart={() => {
        if (isResizing.current) return false;
        isDragging.current = false;
      }}
      onDrag={() => {
        isDragging.current = true;
      }}
      onStop={() => {
        // Reset after a tick so the click event fires before we clear the flag
        setTimeout(() => {
          isDragging.current = false;
        }, 0);
      }}
    >
      <div
        ref={nodeRef}
        className="text-sm fixed bottom-6 right-6 z-50 flex items-end gap-3"
      >
        {/* ── CRT Monitor ─────────────────────────────────────────── */}
        {chatOpen && (
          <div className="flex flex-col items-center">
            {/* Monitor body */}
            <Resizable
              size={monitorSize}
              minWidth={280}
              minHeight={250}
              maxWidth={600}
              maxHeight={700}
              onResizeStart={() => {
                isResizing.current = true;
              }}
              onResizeStop={(_e, _dir, _ref, d) => {
                setMonitorSize(prev => ({
                  width: prev.width + d.width,
                  height: prev.height + d.height,
                }));
                setTimeout(() => {
                  isResizing.current = false;
                }, 0);
              }}
              enable={{
                top: true,
                right: true,
                bottom: true,
                left: true,
                topRight: true,
                topLeft: true,
                bottomRight: true,
                bottomLeft: true,
              }}
              handleStyles={{
                top: {cursor: 'n-resize'},
                right: {cursor: 'e-resize'},
                bottom: {cursor: 's-resize'},
                left: {cursor: 'w-resize'},
                topRight: {cursor: 'ne-resize'},
                topLeft: {cursor: 'nw-resize'},
                bottomRight: {cursor: 'se-resize'},
                bottomLeft: {cursor: 'sw-resize'},
              }}
              className="crt-bezel relative flex! flex-col!"
            >
              {/* Top bezel bar with title + power button */}
              <div className="drag-handle flex items-center justify-between px-3 py-1.5 bg-[#1a1720] border-b border-border cursor-grab active:cursor-grabbing">
                <div className="flex items-center gap-2">
                  <div className="crt-led" />
                  <span className=" text-dim uppercase tracking-widest">
                    ramen v1.0
                  </span>
                </div>
                <button
                  onClick={handlePowerToggle}
                  className="text-dim hover:text-green transition-colors"
                >
                  <Power className="size-3" />
                </button>
              </div>

              {/* Screen area */}
              <div
                className="relative crt-screen crt-scanlines crt-vignette crt-glitch-line crt-flicker flex-1"
                style={{height: 'calc(100% - 70px)'}}
              >
                {/* Scrollable messages */}
                <div
                  ref={scrollRef}
                  className="absolute inset-0 overflow-y-auto z-5 flex flex-col"
                >
                  {/* Empty state */}
                  {messages.length === 0 && (
                    <div className="px-3 py-3 crt-glow">
                      <div className="text-green  uppercase tracking-wider mb-1.5">
                        &gt; agent
                      </div>
                      <div className="text-purple  leading-relaxed">
                        hey. i can place bids, execute trades, and answer
                        anything about the platform. <br /> <br />
                        P.S. you can move this window around or resize it by
                        clicking and dragging the edges.
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  {messages.map(msg => (
                    <CRTMessage key={msg.id} message={msg} />
                  ))}

                  {/* Thinking indicator */}
                  {isStreaming &&
                    messages[messages.length - 1]?.role === 'user' && (
                      <div className="px-3 py-1.5 crt-glow">
                        <div className="flex items-center gap-1.5 text-dim ">
                          <Loader2 className="size-2.5 animate-spin" />
                          thinking<span className="blink">_</span>
                        </div>
                      </div>
                    )}

                  {/* Bottom spacer for scroll */}
                  <div className="h-2 shrink-0" />
                </div>
              </div>

              {/* Bottom bezel with input */}
              <div className="bg-[#1a1720] border-t border-border px-2 py-2">
                {/* Initial suggestions */}
                {messages.length === 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {['place a bid', 'show live tokens', 'swap tokens'].map(
                      s => (
                        <Button
                          key={s}
                          variant="outline"
                          size="xs"
                          className="text-dim hover:text-green hover:border-green "
                          onClick={() => void sendMessage({text: s})}
                        >
                          {s}
                        </Button>
                      ),
                    )}
                  </div>
                )}
                {/* Quick reply suggestions */}
                {!isStreaming &&
                  (() => {
                    const last = messages[messages.length - 1];
                    if (!last || last.role !== 'assistant') return null;

                    const replyPart = last.parts.find(
                      p =>
                        isToolUIPart(p) && getToolName(p) === 'suggestReplies',
                    );
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const replies = ((replyPart as any)?.output?.replies ??
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (replyPart as any)?.input?.replies) as
                      | SuggestReply[]
                      | undefined;

                    if (!replies?.length) return null;

                    return (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {replies.map((reply, idx) => (
                          <TimerReplyButton
                            key={getReplyText(reply) + idx}
                            reply={reply}
                            onSend={text => void sendMessage({text})}
                          />
                        ))}
                      </div>
                    );
                  })()}
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <div className="flex items-center gap-1 flex-1">
                    <span className="text-green  crt-glow select-none">$</span>
                    <Input
                      ref={inputRef}
                      type="text"
                      placeholder="ask agent..."
                      disabled={isStreaming}
                      className="flex-1 border-0 bg-transparent  h-7 px-1 focus:ring-0 focus-visible:ring-0"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isStreaming}
                    variant="default"
                    size="icon"
                    className="h-7 w-7"
                  >
                    {isStreaming ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Send className="size-3" />
                    )}
                  </Button>
                </form>
              </div>
            </Resizable>

            {/* Monitor stand */}
            <div className="w-16 h-3 bg-[#1a1720] border-x border-b border-border" />
            <div className="w-24 h-2 bg-[#1a1720] border-x border-b border-border" />
          </div>
        )}

        {/* ── Mascot ──────────────────────────────────────────────── */}
        <div
          className="drag-handle group relative shrink-0 self-end cursor-grab active:cursor-grabbing"
          onClick={handleMascotClick}
        >
          <div
            className="
              relative w-[280px] h-[280px]
              flex items-center justify-center select-none cursor-pointer
              transition-transform duration-200 hover:scale-105 active:scale-95
              -mb-10 -mr-10
            "
            title="Click to chat"
          >
            <img
              src="/mascot/mascot.gif"
              alt="Mascot"
              className="
                w-full h-full object-contain pointer-events-none
                drop-shadow-[0_0_2px_#4ade80]
                group-hover:drop-shadow-[0_0_4px_#4ade80]
                transition-all duration-300
              "
            />
          </div>
        </div>
      </div>
    </Draggable>
  );
}
