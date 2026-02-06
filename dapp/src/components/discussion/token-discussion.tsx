'use client';

import {useState, useEffect, useRef, useCallback} from 'react';
import {
  ChevronUp,
  ChevronDown,
  MessageSquare,
  Share2,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import {useConnectModal} from '@rainbow-me/rainbowkit';
import {useConnection} from 'wagmi';
import {Button} from '~/components/ui/button';
import {Textarea} from '~/components/ui/textarea';
import {Loader} from '~/components/ui/loader';
import {cn} from '~/lib/utils';
import {trpc} from '~/lib/trpc';
import {useSiweAuth} from '~/hooks/use-siwe-auth';
import {useQueryClient} from '@tanstack/react-query';
import {useEnsReverseName} from '~/hooks/ens/use-ens-reverse-name';
import {useCheckEnsAvailability} from '~/hooks/ens/use-check-ens-availability';
import {useRegisterEns} from '~/hooks/ens/use-register-ens';
import {useSetPrimaryEns} from '~/hooks/ens/use-set-primary-ens';
import {useDebounce} from '~/hooks/utils/use-debounce';
import {ENS_MIN_NAME_LENGTH} from '~/abi/ens-registrar';

// ── Types ─────────────────────────────────────────────────────────────────────

type Post = {
  id: string;
  tokenAddress: string;
  parentId: string | null;
  authorAddress: string;
  content: string;
  createdAt: Date;
  votes: number;
  userVote: -1 | 0 | 1;
  replies: Post[];
};

type OptimisticPost = Post & {optimistic?: true};

type SortMode = 'best' | 'new' | 'controversial';

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Vote button ───────────────────────────────────────────────────────────────

function VoteControls({
  votes,
  userVote,
  onVote,
  disabled,
}: {
  votes: number;
  userVote: 0 | 1 | -1;
  onVote: (dir: 1 | -1) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-0 shrink-0 mr-3 select-none">
      <button
        onClick={() => onVote(1)}
        disabled={disabled}
        className={cn(
          'p-0.5 transition-colors',
          userVote === 1 ? 'text-green' : 'text-dim hover:text-green',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <ChevronUp className="size-4" />
      </button>
      <span
        className={cn(
          'text-xs tabular-nums',
          votes > 0 && 'text-green',
          votes < 0 && 'text-red',
          votes === 0 && 'text-dim',
        )}
      >
        {votes}
      </span>
      <button
        onClick={() => onVote(-1)}
        disabled={disabled}
        className={cn(
          'p-0.5 transition-colors',
          userVote === -1 ? 'text-red' : 'text-dim hover:text-red',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <ChevronDown className="size-4" />
      </button>
    </div>
  );
}

// ── Single comment ────────────────────────────────────────────────────────────

function CommentNode({
  comment,
  depth,
  onVote,
  onReply,
  isAuthenticated,
  onAuthAction,
}: {
  comment: OptimisticPost;
  depth: number;
  onVote: (id: string, dir: 1 | -1) => void;
  onReply: (parentId: string, content: string) => void;
  isAuthenticated: boolean;
  onAuthAction: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const {data: ensName} = useEnsReverseName(comment.authorAddress);

  useEffect(() => {
    if (showReplyBox) {
      replyTextareaRef.current?.focus();
    }
  }, [showReplyBox]);

  const handleReplyClick = () => {
    if (!isAuthenticated) {
      onAuthAction();
      return;
    }
    setShowReplyBox(!showReplyBox);
  };

  const handleSubmitReply = () => {
    if (!replyText.trim()) return;
    onReply(comment.id, replyText.trim());
    setReplyText('');
    setShowReplyBox(false);
  };

  const depthColors = [
    'border-green/20',
    'border-purple/20',
    'border-yellow/20',
    'border-red/20',
  ];
  const borderColor = depthColors[depth % depthColors.length];

  return (
    <div
      className={cn(
        'group transition-opacity',
        depth > 0 && 'mt-2',
        comment.optimistic && 'opacity-50',
      )}
    >
      <div
        className={cn('flex', depth > 0 && `border-l-2 ${borderColor} pl-3`)}
      >
        <VoteControls
          votes={comment.votes}
          userVote={comment.userVote}
          onVote={dir => onVote(comment.id, dir)}
          disabled={!isAuthenticated || !!comment.optimistic}
        />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 text-xs mb-1 flex-wrap">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-dim hover:text-foreground transition-colors"
            >
              [{collapsed ? '+' : '\u2212'}]
            </button>
            <span className="text-green" title={comment.authorAddress}>
              {ensName ?? truncateAddress(comment.authorAddress)}
            </span>
            <span className="text-dim">&middot;</span>
            <span className="text-dim">
              {comment.optimistic ? (
                <span className="inline-flex items-center gap-1">
                  <Loader type="dots" className="text-[10px]" /> posting...
                </span>
              ) : (
                timeAgo(comment.createdAt)
              )}
            </span>
          </div>

          {/* Body */}
          {!collapsed && (
            <>
              <div className="text-sm text-foreground leading-relaxed mb-2">
                {comment.content}
              </div>

              {/* Actions */}
              {!comment.optimistic && (
                <div className="flex items-center gap-3 text-xs mb-1">
                  <button
                    onClick={handleReplyClick}
                    className="text-dim hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <MessageSquare className="size-3" />
                    reply
                  </button>
                  <button className="text-dim hover:text-foreground transition-colors flex items-center gap-1">
                    <Share2 className="size-3" />
                    share
                  </button>
                  <button className="text-dim hover:text-foreground transition-colors">
                    <MoreHorizontal className="size-3" />
                  </button>
                </div>
              )}

              {/* Reply box */}
              {showReplyBox && (
                <div className="mt-2 mb-2 space-y-2">
                  <Textarea
                    ref={replyTextareaRef}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="// write your reply..."
                    className="min-h-15 text-xs"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="xs"
                      showPrefix
                      onClick={handleSubmitReply}
                      disabled={!replyText.trim()}
                    >
                      submit
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        setShowReplyBox(false);
                        setReplyText('');
                      }}
                    >
                      cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Nested replies */}
              {comment.replies.length > 0 && (
                <div className="space-y-0">
                  {comment.replies.map(reply => (
                    <CommentNode
                      key={reply.id}
                      comment={reply}
                      depth={depth + 1}
                      onVote={onVote}
                      onReply={onReply}
                      isAuthenticated={isAuthenticated}
                      onAuthAction={onAuthAction}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Compose box ───────────────────────────────────────────────────────────────

function ComposeBox({
  isAuthenticated,
  session,
  onPost,
}: {
  isAuthenticated: boolean;
  session: {address?: string | null} | undefined;
  onPost: (content: string) => void;
}) {
  const [newComment, setNewComment] = useState('');
  const {isConnected} = useConnection();
  const {openConnectModal} = useConnectModal();
  const {signIn, isSigning, needsSignIn} = useSiweAuth();

  const queryClient = useQueryClient();
  const {data: ensName, isLoading: ensLoading} = useEnsReverseName(
    session?.address,
  );

  const [showEnsFlow, setShowEnsFlow] = useState(false);

  const handlePost = () => {
    if (!newComment.trim()) return;
    onPost(newComment.trim());
    setNewComment('');
  };

  const handleEnsComplete = useCallback(() => {
    // Invalidate the cached reverse lookup so the new name shows up
    void queryClient.invalidateQueries({
      queryKey: ['ens', 'reverse', session?.address?.toLowerCase()],
    });
    setShowEnsFlow(false);
  }, [queryClient, session?.address]);

  const hasEns = !!ensName;

  return (
    <div className="space-y-2">
      <Textarea
        value={newComment}
        onChange={e => setNewComment(e.target.value)}
        placeholder="// what are your thoughts?"
        className="min-h-20 text-sm"
        disabled={!isAuthenticated}
      />
      <div className="flex items-center justify-between">
        {isAuthenticated ? (
          <>
            <span className="text-xs text-dim">
              posting as{' '}
              {ensLoading ? (
                <Loader type="dots" className="text-[10px] inline" />
              ) : hasEns ? (
                <>
                  <span className="text-green">{ensName}</span>
                  {!showEnsFlow && (
                    <button
                      onClick={() => setShowEnsFlow(true)}
                      className="text-cyan-500 hover:text-cyan-400 ml-1.5 transition-colors"
                    >
                      [edit]
                    </button>
                  )}
                </>
              ) : (
                <>
                  <span className="text-foreground">
                    {session?.address ? truncateAddress(session.address) : ''}
                  </span>
                  {!showEnsFlow && (
                    <button
                      onClick={() => setShowEnsFlow(true)}
                      className="text-cyan-500 hover:text-cyan-400 ml-1.5 transition-colors"
                    >
                      [claim ens name]
                    </button>
                  )}
                </>
              )}
            </span>
            <Button
              size="xs"
              showPrefix
              onClick={handlePost}
              disabled={!newComment.trim()}
            >
              post
            </Button>
          </>
        ) : !isConnected ? (
          <>
            <span className="text-xs text-dim">
              // connect wallet to join the discussion
            </span>
            <Button
              size="xs"
              variant="outline"
              showPrefix
              onClick={openConnectModal}
            >
              connect
            </Button>
          </>
        ) : needsSignIn || !isAuthenticated ? (
          <>
            <span className="text-xs text-dim">
              // sign in to join the discussion
            </span>
            <Button size="xs" showPrefix onClick={signIn} disabled={isSigning}>
              {isSigning ? <Loader type="dots" className="text-xs" /> : null}
              {isSigning ? 'signing...' : 'sign in'}
            </Button>
          </>
        ) : null}
      </div>

      {/* Inline ENS editor / registration flow */}
      {isAuthenticated && showEnsFlow && (
        <InlineEnsEditor
          currentEnsName={ensName ?? null}
          onComplete={handleEnsComplete}
          onCancel={() => setShowEnsFlow(false)}
        />
      )}
    </div>
  );
}

// ── Inline ENS editor (switch primary name or buy new) ────────────────────────

function InlineEnsEditor({
  currentEnsName,
  onComplete,
  onCancel,
}: {
  currentEnsName: string | null;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const [inputName, setInputName] = useState('');
  const debouncedName = useDebounce(inputName, 500);

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
    isPending: regPending,
    isCommitting,
    isRegistering,
    error: regError,
  } = useRegisterEns(debouncedName, rentPrice);

  const setPrimary = useSetPrimaryEns();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setInputName(sanitized);
  };

  const isRegistered = registrationState === 'complete';

  // After registration completes, auto-close
  useEffect(() => {
    if (registrationState === 'complete') {
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [registrationState, onComplete]);

  // After setPrimary succeeds, close
  useEffect(() => {
    if (setPrimary.isSuccess) {
      const timer = setTimeout(onComplete, 1500);
      return () => clearTimeout(timer);
    }
  }, [setPrimary.isSuccess, onComplete]);

  const handleSetPrimary = () => {
    if (!debouncedName) return;
    setPrimary.mutate(debouncedName);
  };

  const showStatus =
    debouncedName &&
    debouncedName.length >= ENS_MIN_NAME_LENGTH &&
    !isCheckingAvailability;

  // The name they typed is the one already set as primary
  const isSameAsCurrent =
    currentEnsName &&
    debouncedName &&
    `${debouncedName}.eth` === currentEnsName;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Success states
  if (isRegistered) {
    return (
      <div className="border border-green/30 bg-green/5 p-3 text-sm">
        <div className="flex items-center gap-2 text-green">
          <CheckCircle className="size-3.5" />
          <span>{debouncedName}.eth registered!</span>
        </div>
      </div>
    );
  }

  if (setPrimary.isSuccess) {
    return (
      <div className="border border-green/30 bg-green/5 p-3 text-sm">
        <div className="flex items-center gap-2 text-green">
          <CheckCircle className="size-3.5" />
          <span>switched to {debouncedName}.eth!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-dim">
          {currentEnsName
            ? '// switch ens name or claim a new one'
            : '// claim an ens name'}
        </span>
        <button
          onClick={onCancel}
          className="text-xs text-dim hover:text-foreground transition-colors"
        >
          [close]
        </button>
      </div>

      {/* Name input */}
      <div className="flex items-center border border-border bg-background">
        <input
          type="text"
          placeholder="yourname"
          value={inputName}
          onChange={handleNameChange}
          disabled={
            setPrimary.isPending ||
            registrationState === 'committing' ||
            registrationState === 'waiting' ||
            registrationState === 'ready' ||
            registrationState === 'registering'
          }
          className="h-9 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-dim disabled:opacity-50"
        />
        <span className="text-dim pr-3 text-sm select-none">.eth</span>
      </div>

      {/* Status line */}
      {debouncedName && (
        <div className="flex items-center gap-2 text-xs">
          {isCheckingAvailability ? (
            <>
              <Loader type="dots" className="text-[10px]" />
              <span className="text-dim">checking...</span>
            </>
          ) : debouncedName.length < ENS_MIN_NAME_LENGTH ? (
            <span className="text-dim">
              minimum {ENS_MIN_NAME_LENGTH} characters
            </span>
          ) : isSameAsCurrent ? (
            <span className="text-dim">already your primary name</span>
          ) : showStatus && isOwnedByUser ? (
            <span className="text-green">owned by you</span>
          ) : showStatus && isAvailable ? (
            <>
              <CheckCircle className="size-3 text-green" />
              <span className="text-green">available</span>
              {rentPriceFormatted && (
                <span className="text-dim tabular-nums">
                  ~{Number(rentPriceFormatted).toFixed(4)} ETH/year
                </span>
              )}
            </>
          ) : showStatus && isAvailable === false ? (
            <>
              <XCircle className="size-3 text-red" />
              <span className="text-red">taken by someone else</span>
            </>
          ) : null}
        </div>
      )}

      {/* Action: set as primary (owned by user, not currently primary) */}
      {showStatus &&
        isOwnedByUser &&
        !isSameAsCurrent &&
        registrationState === 'idle' && (
          <Button
            onClick={handleSetPrimary}
            disabled={setPrimary.isPending}
            size="xs"
            showPrefix
          >
            {setPrimary.isPending ? (
              <>
                <Loader type="dots" />
                setting primary...
              </>
            ) : (
              <>set {debouncedName}.eth as primary</>
            )}
          </Button>
        )}

      {/* Action: buy new name (available) */}
      {showStatus && isAvailable && registrationState === 'idle' && (
        <Button
          onClick={commit}
          disabled={
            regPending ||
            !rentPrice ||
            !debouncedName ||
            debouncedName.length < ENS_MIN_NAME_LENGTH
          }
          size="xs"
          showPrefix
        >
          {isCommitting ? (
            <>
              <Loader type="dots" />
              claiming...
            </>
          ) : (
            <>claim {debouncedName}.eth</>
          )}
        </Button>
      )}

      {/* Registration steps (post-commit) */}
      {registrationState !== 'idle' && (
        <div className="space-y-2">
          {registrationState === 'committing' && (
            <div className="flex items-center gap-2 text-xs text-yellow">
              <Loader type="dots" className="text-[10px]" />
              submitting commitment... confirm in wallet
            </div>
          )}

          {registrationState === 'waiting' && (
            <div className="flex items-center gap-2 text-xs text-yellow">
              <Clock className="size-3" />
              waiting {formatTime(timeUntilReveal)} before registration to
              prevent front-running...
            </div>
          )}

          {registrationState === 'ready' && canReveal && (
            <Button
              onClick={register}
              disabled={regPending}
              size="xs"
              showPrefix
            >
              {isRegistering ? (
                <>
                  <Loader type="dots" />
                  registering...
                </>
              ) : (
                <>register {debouncedName}.eth</>
              )}
            </Button>
          )}

          {registrationState === 'registering' && (
            <div className="flex items-center gap-2 text-xs text-yellow">
              <Loader type="dots" className="text-[10px]" />
              registering {debouncedName}.eth... confirm in wallet
            </div>
          )}

          {regError && (
            <div className="text-xs text-red">{regError.message}</div>
          )}
        </div>
      )}

      {/* setPrimary error */}
      {setPrimary.error && (
        <div className="text-xs text-red">{setPrimary.error.message}</div>
      )}
    </div>
  );
}

// ── Helpers for optimistic tree insertion ──────────────────────────────────────

function insertOptimisticReply(
  tree: OptimisticPost[],
  parentId: string,
  newPost: OptimisticPost,
): OptimisticPost[] {
  return tree.map(node => {
    if (node.id === parentId) {
      return {...node, replies: [...node.replies, newPost]};
    }
    if (node.replies.length > 0) {
      return {
        ...node,
        replies: insertOptimisticReply(node.replies, parentId, newPost),
      };
    }
    return node;
  });
}

// ── Main discussion component ─────────────────────────────────────────────────

export function TokenDiscussion({tokenAddress}: {tokenAddress: string}) {
  const [sortMode, setSortMode] = useState<SortMode>('best');
  const [optimisticPosts, setOptimisticPosts] = useState<OptimisticPost[]>([]);
  const {isAuthenticated, session, signIn, needsSignIn} = useSiweAuth();
  const {isConnected} = useConnection();
  const {openConnectModal} = useConnectModal();

  const handleAuthAction = () => {
    if (!isConnected) {
      openConnectModal?.();
    } else if (needsSignIn || !isAuthenticated) {
      void signIn();
    }
  };

  const utils = trpc.useUtils();

  const {
    data: posts,
    isLoading,
    dataUpdatedAt,
  } = trpc.discussion.getPosts.useQuery(
    {tokenAddress, sort: sortMode},
    {refetchInterval: 30_000},
  );

  // Clear optimistic posts when real data arrives from the server
  useEffect(() => {
    if (dataUpdatedAt) {
      setOptimisticPosts([]);
    }
  }, [dataUpdatedAt]);

  const createPost = trpc.discussion.createPost.useMutation({
    onSuccess: () => {
      void utils.discussion.getPosts.invalidate({tokenAddress});
    },
    onError: () => {
      // Remove optimistic posts on failure, refetch to get true state
      setOptimisticPosts([]);
      void utils.discussion.getPosts.invalidate({tokenAddress});
    },
  });

  const vote = trpc.discussion.vote.useMutation({
    onSuccess: () => {
      void utils.discussion.getPosts.invalidate({tokenAddress});
    },
  });

  const handleVote = (postId: string, dir: 1 | -1) => {
    if (!isAuthenticated) return;
    vote.mutate({postId, value: dir});
  };

  const makeOptimisticPost = (
    content: string,
    parentId?: string,
  ): OptimisticPost => ({
    id: `optimistic-${Date.now()}`,
    tokenAddress,
    parentId: parentId ?? null,
    authorAddress: session?.address ?? '',
    content,
    createdAt: new Date(),
    votes: 0,
    userVote: 0,
    replies: [],
    optimistic: true,
  });

  const handleReply = (parentId: string, content: string) => {
    if (!isAuthenticated) return;
    const optimistic = makeOptimisticPost(content, parentId);
    setOptimisticPosts(prev => [...prev, optimistic]);
    createPost.mutate({tokenAddress, parentId, content});
  };

  const handleNewComment = (content: string) => {
    if (!isAuthenticated) return;
    const optimistic = makeOptimisticPost(content);
    setOptimisticPosts(prev => [...prev, optimistic]);
    createPost.mutate({tokenAddress, content});
  };

  // Merge optimistic posts into the real tree
  const mergedPosts = (() => {
    if (!posts) return [];
    let tree: OptimisticPost[] = [...posts];

    const topLevel: OptimisticPost[] = [];
    for (const op of optimisticPosts) {
      if (op.parentId) {
        tree = insertOptimisticReply(tree, op.parentId, op);
      } else {
        topLevel.push(op);
      }
    }

    // Optimistic top-level posts go first
    return [...topLevel, ...tree];
  })();

  const totalComments = (list: OptimisticPost[]): number =>
    list.reduce((acc, c) => acc + 1 + totalComments(c.replies), 0);

  const total = mergedPosts.length > 0 ? totalComments(mergedPosts) : 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-green" />
          <span className="text-sm text-foreground">discussion</span>
          <span className="text-[10px] px-1.5 py-0.5 border border-purple text-purple">
            {total}
          </span>
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-1">
          {(['best', 'new', 'controversial'] as const).map(mode => (
            <Button
              key={mode}
              variant="ghost"
              size="xs"
              onClick={() => setSortMode(mode)}
              className={cn(
                sortMode === mode
                  ? 'text-green'
                  : 'text-dim hover:text-foreground',
              )}
            >
              {mode}
            </Button>
          ))}
        </div>
      </div>

      {/* New comment box */}
      <div className="mt-4">
        <ComposeBox
          isAuthenticated={isAuthenticated}
          session={session}
          onPost={handleNewComment}
        />
      </div>

      {/* Comments list */}
      <div className="flex-1 mt-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-dim text-sm gap-2">
            <Loader type="dots" />
            loading discussion...
          </div>
        ) : mergedPosts.length > 0 ? (
          <div className="space-y-3">
            {mergedPosts.map(post => (
              <div key={post.id} className="border border-border p-3">
                <CommentNode
                  comment={post}
                  depth={0}
                  onVote={handleVote}
                  onReply={handleReply}
                  isAuthenticated={isAuthenticated}
                  onAuthAction={handleAuthAction}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full min-h-20 text-xs text-dim">
            // no comments yet &mdash; be the first to post
          </div>
        )}
      </div>

      {/* Footer — always at bottom */}
      <div className="text-xs text-dim text-center py-2 border-t border-border mt-4">
        // end of thread &middot; {total} comments loaded
      </div>
    </div>
  );
}
