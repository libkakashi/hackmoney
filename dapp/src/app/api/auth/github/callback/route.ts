import {NextResponse} from 'next/server';
import {getIronSession} from 'iron-session';
import {cookies} from 'next/headers';
import {sessionOptions, type SessionData} from '~/lib/auth/session';
import {
  exchangeCodeForToken,
  fetchCurrentUser,
  GitHubApiError,
} from '~/lib/github';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/launch?error=no_code', req.url));
  }

  try {
    const tokenData = await exchangeCodeForToken(code);
    const user = await fetchCurrentUser(tokenData.access_token);

    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions,
    );
    session.githubAccessToken = tokenData.access_token;
    session.githubUsername = user.login;
    session.githubAvatarUrl = user.avatar_url;
    await session.save();

    return NextResponse.redirect(new URL('/launch', req.url));
  } catch (err) {
    const errorCode =
      err instanceof GitHubApiError
        ? 'github_auth_failed'
        : 'github_not_configured';
    return NextResponse.redirect(
      new URL(`/launch?error=${errorCode}`, req.url),
    );
  }
}
