import {NextResponse} from 'next/server';
import {getIronSession} from 'iron-session';
import {cookies} from 'next/headers';
import {sessionOptions, type SessionData} from '~/lib/auth/session';
import {env} from '~/lib/env';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/launch?error=no_code', req.url));
  }

  if (!env.githubClientId || !env.githubClientSecret) {
    return NextResponse.redirect(
      new URL('/launch?error=github_not_configured', req.url),
    );
  }

  // Exchange code for access token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: env.githubClientId,
      client_secret: env.githubClientSecret,
      code,
    }),
  });

  const tokenData = await tokenRes.json();

  if (tokenData.error || !tokenData.access_token) {
    return NextResponse.redirect(
      new URL('/launch?error=github_auth_failed', req.url),
    );
  }

  // Fetch GitHub user info
  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/vnd.github+json',
    },
  });

  const user = await userRes.json();

  // Save to session
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  session.githubAccessToken = tokenData.access_token;
  session.githubUsername = user.login;
  session.githubAvatarUrl = user.avatar_url;
  await session.save();

  return NextResponse.redirect(new URL('/launch', req.url));
}
