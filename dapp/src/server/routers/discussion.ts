import {z} from 'zod';
import {sql} from 'kysely';
import {TRPCError} from '@trpc/server';
import {router, publicProcedure, protectedProcedure} from '../trpc';
import {db} from '~/db/client';

const ZEthAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/)
  .transform(v => v.toLowerCase());

export const discussionRouter = router({
  /** Get all posts for a token, with vote counts and the caller's vote. */
  getPosts: publicProcedure
    .input(
      z.object({
        tokenAddress: ZEthAddress,
        sort: z.enum(['best', 'new', 'controversial']).default('best'),
      }),
    )
    .query(async ({input, ctx}) => {
      const viewerAddress = ctx.session?.address?.toLowerCase() ?? null;

      // Fetch all posts for this token in one query
      let query = db
        .selectFrom('posts as p')
        .leftJoin('post_votes as pv', 'pv.post_id', 'p.id')
        .select([
          'p.id',
          'p.token_address',
          'p.parent_id',
          'p.author_address',
          'p.content',
          'p.created_at',
          sql<number>`coalesce(sum(pv.value), 0)`.as('votes'),
        ])
        .where('p.token_address', '=', input.tokenAddress)
        .groupBy('p.id');

      if (input.sort === 'new') {
        query = query.orderBy('p.created_at', 'desc');
      }

      const rows = await query.execute();

      // Fetch viewer's votes in a separate query if authenticated
      let viewerVotes: Record<string, number> = {};
      if (viewerAddress) {
        const postIds = rows.map(r => r.id);
        if (postIds.length > 0) {
          const votes = await db
            .selectFrom('post_votes')
            .select(['post_id', 'value'])
            .where('voter_address', '=', viewerAddress)
            .where('post_id', 'in', postIds)
            .execute();
          viewerVotes = Object.fromEntries(
            votes.map(v => [v.post_id, Number(v.value)]),
          );
        }
      }

      // Build flat list with viewer vote included
      const posts = rows.map(r => ({
        id: r.id,
        tokenAddress: r.token_address,
        parentId: r.parent_id,
        authorAddress: r.author_address,
        content: r.content,
        createdAt: r.created_at,
        votes: Number(r.votes),
        userVote: (viewerVotes[r.id] ?? 0) as -1 | 0 | 1,
      }));

      // Assemble into a tree
      type Post = (typeof posts)[number] & {replies: Post[]};
      const byId = new Map<string, Post>();
      const roots: Post[] = [];

      for (const p of posts) {
        byId.set(p.id, {...p, replies: []});
      }

      for (const p of posts) {
        const node = byId.get(p.id)!;
        if (p.parentId) {
          byId.get(p.parentId)?.replies.push(node);
        } else {
          roots.push(node);
        }
      }

      // Sort roots and replies
      const sortFn = (a: Post, b: Post) => {
        if (input.sort === 'best') return b.votes - a.votes;
        if (input.sort === 'new')
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        // controversial: most replies with low net votes
        return b.replies.length - a.replies.length;
      };

      const sortTree = (nodes: Post[]) => {
        nodes.sort(sortFn);
        for (const n of nodes) sortTree(n.replies);
      };
      sortTree(roots);

      return roots;
    }),

  /** Create a new post or reply. */
  createPost: protectedProcedure
    .input(
      z.object({
        tokenAddress: ZEthAddress,
        content: z.string().min(1).max(4000),
        parentId: z.uuid().optional(),
      }),
    )
    .mutation(async ({input, ctx}) => {
      // If replying, validate the parent exists and belongs to the same token
      if (input.parentId) {
        const parent = await db
          .selectFrom('posts')
          .select(['id', 'token_address'])
          .where('id', '=', input.parentId)
          .executeTakeFirst();

        if (!parent) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Parent post not found',
          });
        }
        if (parent.token_address !== input.tokenAddress) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Parent post belongs to a different token thread',
          });
        }
      }

      const post = await db
        .insertInto('posts')
        .values({
          token_address: input.tokenAddress,
          parent_id: input.parentId ?? null,
          author_address: ctx.address.toLowerCase(),
          content: input.content,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return {
        id: post.id,
        tokenAddress: post.token_address,
        parentId: post.parent_id,
        authorAddress: post.author_address,
        content: post.content,
        createdAt: post.created_at,
        votes: 0,
        userVote: 0 as const,
        replies: [],
      };
    }),

  /** Vote on a post. Toggling the same direction removes the vote. */
  vote: protectedProcedure
    .input(
      z.object({
        postId: z.uuid(),
        value: z.union([z.literal(1), z.literal(-1)]),
      }),
    )
    .mutation(async ({input, ctx}) => {
      const voterAddress = ctx.address.toLowerCase();

      // Validate the post exists
      const post = await db
        .selectFrom('posts')
        .select('id')
        .where('id', '=', input.postId)
        .executeTakeFirst();

      if (!post) {
        throw new TRPCError({code: 'NOT_FOUND', message: 'Post not found'});
      }

      const existing = await db
        .selectFrom('post_votes')
        .select('value')
        .where('post_id', '=', input.postId)
        .where('voter_address', '=', voterAddress)
        .executeTakeFirst();

      if (existing && Number(existing.value) === input.value) {
        // Same vote again — remove it (toggle off)
        await db
          .deleteFrom('post_votes')
          .where('post_id', '=', input.postId)
          .where('voter_address', '=', voterAddress)
          .execute();
        return {userVote: 0 as const};
      }

      // Upsert the vote
      await db
        .insertInto('post_votes')
        .values({
          post_id: input.postId,
          voter_address: voterAddress,
          value: input.value,
        })
        .onConflict(oc =>
          oc.columns(['post_id', 'voter_address']).doUpdateSet({
            value: input.value,
          }),
        )
        .execute();

      return {userVote: input.value};
    }),

  /** Delete own post. */
  deletePost: protectedProcedure
    .input(z.object({postId: z.uuid()}))
    .mutation(async ({input, ctx}) => {
      const post = await db
        .selectFrom('posts')
        .select(['id', 'author_address'])
        .where('id', '=', input.postId)
        .executeTakeFirst();

      if (!post) {
        throw new TRPCError({code: 'NOT_FOUND', message: 'Post not found'});
      }
      if (post.author_address !== ctx.address.toLowerCase()) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only delete your own posts',
        });
      }

      await db.deleteFrom('posts').where('id', '=', input.postId).execute();
      return {success: true};
    }),
});
