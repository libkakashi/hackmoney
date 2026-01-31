import {publicProcedure, router} from '../trpc';
import {authRouter} from './auth';

export const appRouter = router({
  hello: publicProcedure.query(() => 'Hello World!'),
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
