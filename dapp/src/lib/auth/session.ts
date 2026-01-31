import {
  getIronSession,
  type SessionOptions,
  type IronSession,
} from 'iron-session';
import type {Address} from 'viem';
import {env} from '../env';

export interface SessionData {
  nonce?: string;
  address?: Address;
  chainId?: number;
  isLoggedIn: boolean;
}

if (!env.sessionSecret) {
  throw new Error('SESSION_SECRET is not set');
}
export const sessionOptions: SessionOptions = {
  password: env.sessionSecret,
  cookieName: 'launchpad-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
};

export const defaultSession: SessionData = {
  isLoggedIn: false,
};

export type Session = IronSession<SessionData>;

export async function getSession(
  req: Request,
  res: Response,
): Promise<Session> {
  const session = await getIronSession<SessionData>(req, res, sessionOptions);

  if (!session.isLoggedIn) {
    session.isLoggedIn = defaultSession.isLoggedIn;
  }
  return session;
}
