import {publicProcedure, router} from '../trpc';
import {authRouter} from './auth';
import {bountyRouter} from './bounty';
import {discussionRouter} from './discussion';
import {githubRouter} from './github';

export const appRouter = router({
  hello: publicProcedure.query(() => 'Hello World!'),
  auth: authRouter,
  bounty: bountyRouter,
  discussion: discussionRouter,
  github: githubRouter,
});

export type AppRouter = typeof appRouter;
