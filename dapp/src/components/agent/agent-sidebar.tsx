'use client';

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type FormEvent,
} from 'react';
import {useChat} from '@ai-sdk/react';
import {
  type UIMessage,
  type UIMessagePart,
  isToolUIPart,
  getToolName,
  DefaultChatTransport,
} from 'ai';
import Link from 'next/link';
import {Send, Loader2, Bot} from 'lucide-react';
import {useAgent, usePageContext} from './agent-context';
import {useAgentTools} from './use-agent-tools';
import {MarkdownRenderer} from './markdown-renderer';

type AnyPart = UIMessagePart<any, any>;

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
    <div className="space-y-1.5">
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
            className="block border border-border p-2 hover:border-green transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-green text-xs">$</span>
              <span className="text-sm font-bold">{token.symbol}</span>
              <span className="text-dim text-xs truncate">{token.name}</span>
            </div>
            {token.description && (
              <div className="text-dim text-xs mt-1 line-clamp-1">
                {token.description}
              </div>
            )}
            <div className="text-dim text-[10px] mt-1 truncate">
              {token.address}
            </div>
          </Link>
        ),
      )}
    </div>
  );
}

function MessageContent({message}: {message: UIMessage}) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : ''}`}>
      <div className="text-[10px] text-dim">{isUser ? 'you' : 'agent'}</div>
      <div
        className={`text-sm leading-relaxed ${
          isUser ? 'text-foreground' : 'text-purple'
        }`}
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
                <div key={i} className="my-2">
                  <div className="text-dim text-[10px] mb-1">
                    &gt; {toolName}()
                  </div>
                  <ToolResultCard result={p.output} />
                </div>
              );
            }
            if (p.state === 'output-error') {
              return (
                <div key={i} className="my-1 text-red text-xs">
                  err: {toolName}() failed
                </div>
              );
            }
            return (
              <div
                key={i}
                className="flex items-center gap-1.5 my-1 text-dim text-xs"
              >
                <Loader2 className="size-3 animate-spin" />
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

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 360;

export function AgentSidebar() {
  const {open} = useAgent();
  const {placeBid, claimTokens, swapTokens} = useAgentTools();
  const pageContext = usePageContext();
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(DEFAULT_WIDTH);

  const transport = useMemo(
    () => new DefaultChatTransport({body: () => ({pageContext})}),
    [pageContext],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      startX.current = e.clientX;
      startWidth.current = width;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [width],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = startX.current - e.clientX;
      const newWidth = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, startWidth.current + delta),
      );
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const {messages, sendMessage, addToolOutput, status, setMessages} = useChat({
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const input = inputRef.current;
    if (!input || !input.value.trim() || isStreaming) return;
    const text = input.value.trim();
    input.value = '';
    sendMessage({text});
  };

  if (!open) return null;

  return (
    <div
      className="h-full shrink-0 border-l border-border bg-card flex flex-col relative"
      style={{width}}
    >
      {/* Drag handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-green/30 active:bg-green/50 transition-colors z-10"
      />
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="size-6 text-dim mb-3" />
            <div className="text-dim text-xs mb-4">
              ask about tokens, auctions, or the platform
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                'show live tokens',
                'what is timelock?',
                'list new launches',
              ].map(suggestion => (
                <button
                  key={suggestion}
                  className="text-xs border border-border px-2 py-1 text-dim hover:text-green hover:border-green transition-colors"
                  onClick={() => {
                    if (inputRef.current) {
                      inputRef.current.value = suggestion;
                      inputRef.current.focus();
                    }
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map(message => (
          <MessageContent key={message.id} message={message} />
        ))}
        {isStreaming && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex items-center gap-1.5 text-dim text-xs">
            <Loader2 className="size-3 animate-spin" />
            thinking...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-[10px] text-dim hover:text-red transition-colors mb-2"
          >
            clear
          </button>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 flex items-center border border-border bg-background px-3 focus-within:border-green transition-colors">
            <span className="text-green text-sm mr-2">$</span>
            <input
              ref={inputRef}
              type="text"
              placeholder="ask agent..."
              disabled={isStreaming}
              className="flex-1 bg-transparent text-sm py-2 outline-none placeholder:text-dim disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={isStreaming}
            className="border border-green text-green px-3 hover:bg-green hover:text-background transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            {isStreaming ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
