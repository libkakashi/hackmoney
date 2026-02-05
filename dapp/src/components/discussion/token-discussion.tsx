'use client';

import {useState} from 'react';
import {
  ChevronUp,
  ChevronDown,
  MessageSquare,
  Share2,
  MoreHorizontal,
  Send,
} from 'lucide-react';
import {Button} from '~/components/ui/button';
import {Textarea} from '~/components/ui/textarea';
import {Badge} from '~/components/ui/badge';
import {cn} from '~/lib/utils';

// ── Placeholder data ──────────────────────────────────────────────────────────

type Comment = {
  id: string;
  author: string;
  authorAddress: string;
  content: string;
  timestamp: string;
  votes: number;
  userVote: 0 | 1 | -1;
  replies: Comment[];
  depth: number;
  flair?: string;
};

const PLACEHOLDER_COMMENTS: Comment[] = [
  {
    id: '1',
    author: 'vitalik_fan',
    authorAddress: '0x1234...abcd',
    content:
      'This token has a really interesting auction mechanism. The gradual dutch auction approach means price discovery happens naturally instead of the usual pump-and-dump we see with fair launches.',
    timestamp: '2h ago',
    votes: 42,
    userVote: 0,
    depth: 0,
    flair: 'OG bidder',
    replies: [
      {
        id: '1-1',
        author: 'defi_maxi',
        authorAddress: '0x5678...ef01',
        content:
          'Agreed. The commitment mechanism prevents sniping which is a huge improvement over traditional launches.',
        timestamp: '1h ago',
        votes: 18,
        userVote: 0,
        depth: 1,
        replies: [
          {
            id: '1-1-1',
            author: 'anon_trader',
            authorAddress: '0x9abc...2345',
            content:
              "Can someone explain how the exit mechanism works? If I bid and then want to pull out, what's the penalty?",
            timestamp: '45m ago',
            votes: 7,
            userVote: 0,
            depth: 2,
            replies: [
              {
                id: '1-1-1-1',
                author: 'vitalik_fan',
                authorAddress: '0x1234...abcd',
                content:
                  'You can exit anytime but your bid weight decays linearly. So earlier exit = more penalty. It incentivizes conviction.',
                timestamp: '30m ago',
                votes: 12,
                userVote: 0,
                depth: 3,
                flair: 'OG bidder',
                replies: [],
              },
            ],
          },
        ],
      },
      {
        id: '1-2',
        author: 'skeptic_69',
        authorAddress: '0xdef0...6789',
        content:
          "I'm not convinced. The tokenomics look standard and the team is anon. What's the actual utility here?",
        timestamp: '50m ago',
        votes: -3,
        userVote: 0,
        depth: 1,
        replies: [],
      },
    ],
  },
  {
    id: '2',
    author: 'whale_watcher',
    authorAddress: '0xaaaa...bbbb',
    content:
      "Just saw a 50k USDC bid come in. Someone's serious about this one. Whale watching thread below 👇",
    timestamp: '3h ago',
    votes: 28,
    userVote: 0,
    depth: 0,
    flair: 'whale',
    replies: [
      {
        id: '2-1',
        author: 'data_nerd',
        authorAddress: '0xcccc...dddd',
        content:
          "Tracked the wallet - it's been accumulating positions in similar CCA launches. They've been profitable on 4/5 of them.",
        timestamp: '2h ago',
        votes: 35,
        userVote: 0,
        depth: 1,
        flair: 'analyst',
        replies: [],
      },
    ],
  },
  {
    id: '3',
    author: 'newbie_2024',
    authorAddress: '0xeeee...ffff',
    content:
      "First time participating in a CCA. The UI makes it pretty straightforward. Is there a guide for optimal bidding strategy?",
    timestamp: '5h ago',
    votes: 15,
    userVote: 0,
    depth: 0,
    replies: [],
  },
];

type SortMode = 'best' | 'new' | 'controversial';

// ── Vote button ───────────────────────────────────────────────────────────────

function VoteControls({
  votes,
  userVote,
  onVote,
}: {
  votes: number;
  userVote: 0 | 1 | -1;
  onVote: (dir: 1 | -1) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-0 shrink-0 mr-3 select-none">
      <button
        onClick={() => onVote(1)}
        className={cn(
          'p-0.5 transition-colors',
          userVote === 1 ? 'text-green' : 'text-dim hover:text-green',
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
        className={cn(
          'p-0.5 transition-colors',
          userVote === -1 ? 'text-red' : 'text-dim hover:text-red',
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
  onVote,
  onReply,
}: {
  comment: Comment;
  onVote: (id: string, dir: 1 | -1) => void;
  onReply: (parentId: string, content: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');

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
  const borderColor = depthColors[comment.depth % depthColors.length];

  return (
    <div className={cn('group', comment.depth > 0 && 'mt-2')}>
      <div
        className={cn(
          'flex',
          comment.depth > 0 && `border-l-2 ${borderColor} pl-3`,
        )}
      >
        <VoteControls
          votes={comment.votes}
          userVote={comment.userVote}
          onVote={dir => onVote(comment.id, dir)}
        />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 text-xs mb-1 flex-wrap">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-dim hover:text-foreground transition-colors"
            >
              [{collapsed ? '+' : '−'}]
            </button>
            <span className="text-green">{comment.author}</span>
            <span className="text-dim">{comment.authorAddress}</span>
            {comment.flair && (
              <Badge
                variant={
                  comment.flair === 'whale'
                    ? 'warning'
                    : comment.flair === 'analyst'
                      ? 'purple'
                      : 'default'
                }
                className="text-[10px] px-1.5 py-0"
              >
                {comment.flair}
              </Badge>
            )}
            <span className="text-dim">·</span>
            <span className="text-dim">{comment.timestamp}</span>
          </div>

          {/* Body */}
          {!collapsed && (
            <>
              <div className="text-sm text-foreground leading-relaxed mb-2">
                {comment.content}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 text-xs mb-1">
                <button
                  onClick={() => setShowReplyBox(!showReplyBox)}
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

              {/* Reply box */}
              {showReplyBox && (
                <div className="mt-2 mb-2 space-y-2">
                  <Textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="// write your reply..."
                    className="min-h-[60px] text-xs"
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="xs"
                      onClick={handleSubmitReply}
                      disabled={!replyText.trim()}
                    >
                      <Send className="size-3" />
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
                      onVote={onVote}
                      onReply={onReply}
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

// ── Main discussion component ─────────────────────────────────────────────────

export function TokenDiscussion() {
  const [comments, setComments] = useState<Comment[]>(PLACEHOLDER_COMMENTS);
  const [sortMode, setSortMode] = useState<SortMode>('best');
  const [newComment, setNewComment] = useState('');

  // Placeholder vote handler — updates local state only
  const handleVote = (id: string, dir: 1 | -1) => {
    const updateVotes = (list: Comment[]): Comment[] =>
      list.map(c => {
        if (c.id === id) {
          const newUserVote = c.userVote === dir ? 0 : dir;
          const voteDelta = newUserVote - c.userVote;
          return {
            ...c,
            userVote: newUserVote as 0 | 1 | -1,
            votes: c.votes + voteDelta,
          };
        }
        return {...c, replies: updateVotes(c.replies)};
      });
    setComments(updateVotes(comments));
  };

  // Placeholder reply handler — adds to local state only
  const handleReply = (parentId: string, content: string) => {
    const addReply = (list: Comment[]): Comment[] =>
      list.map(c => {
        if (c.id === parentId) {
          const reply: Comment = {
            id: `${parentId}-${c.replies.length + 1}`,
            author: 'you',
            authorAddress: '0x????...????',
            content,
            timestamp: 'just now',
            votes: 1,
            userVote: 1,
            depth: c.depth + 1,
            replies: [],
          };
          return {...c, replies: [...c.replies, reply]};
        }
        return {...c, replies: addReply(c.replies)};
      });
    setComments(addReply(comments));
  };

  // Placeholder new top-level comment
  const handleNewComment = () => {
    if (!newComment.trim()) return;
    const comment: Comment = {
      id: `new-${Date.now()}`,
      author: 'you',
      authorAddress: '0x????...????',
      content: newComment.trim(),
      timestamp: 'just now',
      votes: 1,
      userVote: 1,
      depth: 0,
      replies: [],
    };
    setComments([comment, ...comments]);
    setNewComment('');
  };

  const totalComments = (list: Comment[]): number =>
    list.reduce((acc, c) => acc + 1 + totalComments(c.replies), 0);

  const sortedComments = [...comments].sort((a, b) => {
    if (sortMode === 'best') return b.votes - a.votes;
    if (sortMode === 'new') return 0; // placeholder — would sort by timestamp
    // controversial: most replies + low net votes
    return b.replies.length - a.replies.length;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-green" />
          <span className="text-sm text-foreground">discussion</span>
          <span className="text-[10px] px-1.5 py-0.5 border border-purple text-purple">
            {totalComments(comments)}
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
      <div className="space-y-2">
        <Textarea
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="// what are your thoughts?"
          className="min-h-[80px] text-sm"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-dim">
            posting as{' '}
            <span className="text-foreground">0x????...????</span>
          </span>
          <Button
            size="xs"
            onClick={handleNewComment}
            disabled={!newComment.trim()}
          >
            <Send className="size-3" />
            post
          </Button>
        </div>
      </div>

      {/* Comments list */}
      <div className="space-y-3">
        {sortedComments.map(comment => (
          <div key={comment.id} className="border border-border p-3">
            <CommentNode
              comment={comment}
              onVote={handleVote}
              onReply={handleReply}
            />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="text-xs text-dim text-center py-2 border-t border-border">
        // end of thread · {totalComments(comments)} comments loaded
      </div>
    </div>
  );
}
