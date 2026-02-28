import {z} from 'zod';
import {router, publicProcedure, protectedProcedure} from '../trpc';

const ZEthAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/)
  .transform(v => v.toLowerCase());

export const bountyRouter = router({
  /** Get all bounty pledges for a specific issue (placeholder). */
  getByIssue: publicProcedure
    .input(
      z.object({
        tokenAddress: ZEthAddress,
        issueNumber: z.number(),
      }),
    )
    .query(() => {
      return [] as {
        id: string;
        offererAddress: string;
        amount: string;
        status: string;
        createdAt: Date;
      }[];
    }),

  /** Get total pledged amount per issue for a token (placeholder). */
  getTotals: publicProcedure
    .input(z.object({tokenAddress: ZEthAddress}))
    .query(() => {
      return {} as Record<number, string>;
    }),

  /** Create a new bounty pledge (placeholder — contracts not yet implemented). */
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
    .mutation(() => {
      return {
        id: 'placeholder',
        amount: '0',
        status: 'pending',
      };
    }),
});
