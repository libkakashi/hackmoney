import {z} from 'zod';
import {TRPCError} from '@trpc/server';
import {router, publicProcedure} from '../trpc';
import {generateNonce, verifyMessage} from '~/lib/auth/siwe';

export const authRouter = router({
  getNonce: publicProcedure.mutation(async ({ctx}) => {
    if (!ctx.session) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Session not available',
      });
    }

    const nonce = generateNonce();
    ctx.session.nonce = nonce;
    await ctx.session.save();

    return {nonce};
  }),

  verify: publicProcedure
    .input(
      z.object({
        message: z.string(),
        signature: z
          .string()
          .regex(/^0x[a-fA-F0-9]+$/) as z.ZodType<`0x${string}`>,
      }),
    )
    .mutation(async ({ctx, input}) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Session not available',
        });
      }

      if (!ctx.session.nonce) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No nonce found. Please request a nonce first.',
        });
      }

      const result = await verifyMessage({
        message: input.message,
        signature: input.signature,
      });

      if (!result.success) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: result.error,
        });
      }

      // Clear nonce and set authenticated session
      ctx.session.nonce = undefined;
      ctx.session.address = result.address;
      ctx.session.isLoggedIn = true;
      await ctx.session.save();

      return {
        address: result.address,
        isLoggedIn: true,
      };
    }),

  getSession: publicProcedure.query(({ctx}) => {
    return {
      address: ctx.session?.address ?? null,
      isLoggedIn: ctx.session?.isLoggedIn ?? false,
    };
  }),

  logout: publicProcedure.mutation(async ({ctx}) => {
    if (!ctx.session) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Session not available',
      });
    }

    ctx.session.destroy();

    return {success: true};
  }),
});
