import {TRPCError} from '@trpc/server';
import {router, publicProcedure} from '../trpc';
import {env} from '~/lib/env';

interface GitHubRepo {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  owner: {
    login: string;
    avatar_url: string;
    type: string;
  };
  stargazers_count: number;
  language: string | null;
  html_url: string;
}

interface GitHubOrg {
  login: string;
  avatar_url: string;
  description: string | null;
}

interface GitHubOrgMembership {
  role: 'admin' | 'member';
  state: string;
}

async function githubFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!res.ok) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `GitHub API error: ${res.status}`,
    });
  }

  return res.json() as Promise<T>;
}

export const githubRouter = router({
  getSession: publicProcedure.query(({ctx}) => {
    return {
      username: ctx.session?.githubUsername ?? null,
      avatarUrl: ctx.session?.githubAvatarUrl ?? null,
      isConnected: !!ctx.session?.githubAccessToken,
    };
  }),

  getAuthUrl: publicProcedure.query(() => {
    if (!env.githubClientId) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'GitHub OAuth not configured',
      });
    }

    const params = new URLSearchParams({
      client_id: env.githubClientId,
      scope: 'read:user read:org',
    });

    return {url: `https://github.com/login/oauth/authorize?${params}`};
  }),

  getRepos: publicProcedure.query(async ({ctx}) => {
    const token = ctx.session?.githubAccessToken;
    const username = ctx.session?.githubUsername;
    if (!token || !username) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Not connected to GitHub',
      });
    }

    // Fetch public repos owned by the authenticated user
    const repos = await githubFetch<GitHubRepo[]>(
      '/user/repos?per_page=100&sort=updated&type=owner&visibility=public',
      token,
    );

    return repos
      .filter(r => r.owner.login.toLowerCase() === username.toLowerCase())
      .map(r => ({
        id: r.id,
        fullName: r.full_name,
        name: r.name,
        description: r.description,
        owner: r.owner.login,
        ownerAvatar: r.owner.avatar_url,
        ownerType: r.owner.type,
        stars: r.stargazers_count,
        language: r.language,
        url: r.html_url,
      }));
  }),

  getOrgs: publicProcedure.query(async ({ctx}) => {
    const token = ctx.session?.githubAccessToken;
    const username = ctx.session?.githubUsername;
    if (!token || !username) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Not connected to GitHub',
      });
    }

    const orgs = await githubFetch<GitHubOrg[]>('/user/orgs', token);

    // Check membership role for each org, only keep ones where user is owner
    const withRoles = await Promise.all(
      orgs.map(async o => {
        try {
          const membership = await githubFetch<GitHubOrgMembership>(
            `/orgs/${o.login}/memberships/${username}`,
            token,
          );
          return {org: o, role: membership.role};
        } catch {
          return {org: o, role: 'member' as const};
        }
      }),
    );

    return withRoles
      .filter(({role}) => role === 'admin')
      .map(({org}) => ({
        login: org.login,
        avatarUrl: org.avatar_url,
        description: org.description,
      }));
  }),

  disconnect: publicProcedure.mutation(async ({ctx}) => {
    if (!ctx.session) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Session not available',
      });
    }

    ctx.session.githubAccessToken = undefined;
    ctx.session.githubUsername = undefined;
    ctx.session.githubAvatarUrl = undefined;
    await ctx.session.save();

    return {success: true};
  }),
});
