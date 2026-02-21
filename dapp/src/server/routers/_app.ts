import {publicProcedure, router} from '../trpc';
import {authRouter} from './auth';
import {discussionRouter} from './discussion';
import {githubRouter} from './github';

export const appRouter = router({
  hello: publicProcedure.query(() => 'Hello World!'),
  auth: authRouter,
  discussion: discussionRouter,
  github: githubRouter,
});

export type AppRouter = typeof appRouter;
