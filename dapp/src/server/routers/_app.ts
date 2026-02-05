import {publicProcedure, router} from '../trpc';
import {authRouter} from './auth';
import {discussionRouter} from './discussion';

export const appRouter = router({
  hello: publicProcedure.query(() => 'Hello World!'),
  auth: authRouter,
  discussion: discussionRouter,
});

export type AppRouter = typeof appRouter;
