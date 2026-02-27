import {z} from 'zod';
import {sql} from 'kysely';
import {router, publicProcedure, protectedProcedure} from '../trpc';
import {db} from '~/db/client';

const ZEthAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/)
  .transform(v => v.toLowerCase());

export const bountyRouter = router({
  /** Get all bounty pledges for a specific issue. */
  getByIssue: publicProcedure
    .input(
      z.object({
        tokenAddress: ZEthAddress,
        issueNumber: z.number(),
      }),
    )
    .query(async ({input}) => {
      const rows = await db
        .selectFrom('issue_bounties')
        .selectAll()
        .where('token_address', '=', input.tokenAddress)
        .where('issue_number', '=', input.issueNumber)
        .orderBy('created_at', 'desc')
        .execute();

      return rows.map(r => ({
        id: r.id,
        offererAddress: r.offerer_address,
        amount: r.amount.toString(),
        status: r.status,
        createdAt: r.created_at,
      }));
    }),

  /** Get total pledged amount per issue for a token (for list badges). */
  getTotals: publicProcedure
    .input(z.object({tokenAddress: ZEthAddress}))
    .query(async ({input}) => {
      const rows = await db
        .selectFrom('issue_bounties')
        .select([
          'issue_number',
          sql<string>`coalesce(sum(amount), 0)`.as('total'),
        ])
        .where('token_address', '=', input.tokenAddress)
        .where('status', '=', 'pledged')
        .groupBy('issue_number')
        .execute();

      return Object.fromEntries(
        rows.map(r => [r.issue_number, r.total]),
      ) as Record<number, string>;
    }),

  /** Create a new bounty pledge (MVP: DB record only, no on-chain escrow). */
  create: protectedProcedure
    .input(
      z.object({
        tokenAddress: ZEthAddress,
        repoOwner: z.string().min(1),
        repoName: z.string().min(1),
        issueNumber: z.number(),
        amount: z.string().regex(/^\d+$/),
      }),
    )
    .mutation(async ({input, ctx}) => {
      const bounty = await db
        .insertInto('issue_bounties')
        .values({
          token_address: input.tokenAddress,
          repo_owner: input.repoOwner,
          repo_name: input.repoName,
          issue_number: input.issueNumber,
          offerer_address: ctx.address.toLowerCase(),
          amount: input.amount,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      return {
        id: bounty.id,
        amount: bounty.amount.toString(),
        status: bounty.status,
      };
    }),
});
