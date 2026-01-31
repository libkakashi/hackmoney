import {initTRPC, TRPCError} from '@trpc/server';
import superjson from 'superjson';
import type {Address} from 'viem';
import type {Session} from '~/lib/auth/session';

export interface Context {
  session: Session | null;
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const isAuthed = t.middleware(({ctx, next}) => {
  if (!ctx.session?.isLoggedIn || !ctx.session.address) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be signed in to perform this action',
    });
  }

  return next({
    ctx: {
      session: ctx.session,
      address: ctx.session.address as Address,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);
