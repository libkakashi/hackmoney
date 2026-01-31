import {fetchRequestHandler} from '@trpc/server/adapters/fetch';
import {getIronSession} from 'iron-session';
import {cookies} from 'next/headers';
import {appRouter} from '~/server/routers/_app';
import {sessionOptions, type SessionData} from '~/lib/auth/session';
import type {Context} from '~/server/trpc';

const handler = async (req: Request) => {
  // Get the cookies store from Next.js - this properly handles Set-Cookie
  const cookieStore = await cookies();

  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: async (): Promise<Context> => {
      const session = await getIronSession<SessionData>(
        cookieStore,
        sessionOptions,
      );
      return {session};
    },
    onError: ({path, error, type, input}) => {
      console.error(`[tRPC Error] ${type} ${path ?? 'unknown'}:`);
      console.error('  Message:', error.message);
      console.error('  Code:', error.code);
      if (error.cause) {
        console.error('  Cause:', error.cause);
      }
      if (input) {
        console.error('  Input:', JSON.stringify(input, null, 2));
      }
      if (error.stack) {
        console.error('  Stack:', error.stack);
      }
    },
  });
};

export {handler as GET, handler as POST};
