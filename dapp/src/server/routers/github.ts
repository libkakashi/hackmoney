import {TRPCError} from '@trpc/server';
import {z} from 'zod';
import {router, publicProcedure} from '../trpc';
import {
  getAuthUrl,
  fetchUserRepos,
  fetchUserOrgs,
  fetchRepo,
  fetchContributors,
  fetchLanguages,
  fetchRecentCommits,
  fetchReadme,
  fetchLatestRelease,
  searchRepos,
  fetchIssues,
  fetchIssue,
  fetchRepoLabels,
  GitHubApiError,
} from '~/lib/github';

const wrapGitHubError = (err: unknown): never => {
  if (err instanceof GitHubApiError) {
    const code =
      err.status === 401
        ? 'UNAUTHORIZED'
        : err.status === 404
          ? 'NOT_FOUND'
          : err.status === 403
            ? 'FORBIDDEN'
            : 'BAD_REQUEST';
    throw new TRPCError({code, message: err.message});
  }
  throw err;
};

const requireGitHubToken = (ctx: {
  session?: {githubAccessToken?: string} | null;
}): string => {
  const token = ctx.session?.githubAccessToken;
  if (!token) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Not connected to GitHub',
    });
  }
  return token;
};

export const githubRouter = router({
  getSession: publicProcedure.query(({ctx}) => ({
    username: ctx.session?.githubUsername ?? null,
    avatarUrl: ctx.session?.githubAvatarUrl ?? null,
    isConnected: !!ctx.session?.githubAccessToken,
  })),

  getAuthUrl: publicProcedure.query(() => {
    try {
      return {url: getAuthUrl()};
    } catch {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'GitHub OAuth not configured',
      });
    }
  }),

  getRepos: publicProcedure.query(async ({ctx}) => {
    const token = requireGitHubToken(ctx);
    const username = ctx.session?.githubUsername;
    if (!username) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Not connected to GitHub',
      });
    }

    try {
      const repos = await fetchUserRepos(username, token);
      return repos.map(r => ({
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
    } catch (err) {
      wrapGitHubError(err);
    }
  }),

  getOrgs: publicProcedure.query(async ({ctx}) => {
    const token = requireGitHubToken(ctx);

    try {
      const orgs = await fetchUserOrgs(token);
      return orgs.map(o => ({
        login: o.login,
        avatarUrl: o.avatar_url,
        description: o.description,
      }));
    } catch (err) {
      wrapGitHubError(err);
    }
  }),

  getRepoDetails: publicProcedure
    .input(z.object({owner: z.string(), repo: z.string()}))
    .query(async ({input, ctx}) => {
      const token = ctx.session?.githubAccessToken;

      try {
        const repo = await fetchRepo(input.owner, input.repo, token);
        return {
          id: repo.id,
          fullName: repo.full_name,
          name: repo.name,
          description: repo.description,
          owner: repo.owner.login,
          ownerAvatar: repo.owner.avatar_url,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          openIssues: repo.open_issues_count,
          watchers: repo.watchers_count,
          language: repo.language,
          url: repo.html_url,
          homepage: repo.homepage,
          topics: repo.topics,
          license: repo.license?.spdx_id ?? null,
          createdAt: repo.created_at,
          updatedAt: repo.updated_at,
          pushedAt: repo.pushed_at,
          defaultBranch: repo.default_branch,
          archived: repo.archived,
          fork: repo.fork,
        };
      } catch (err) {
        wrapGitHubError(err);
      }
    }),

  getContributors: publicProcedure
    .input(z.object({owner: z.string(), repo: z.string()}))
    .query(async ({input, ctx}) => {
      const token = ctx.session?.githubAccessToken;

      try {
        const contributors = await fetchContributors(
          input.owner,
          input.repo,
          token,
        );
        return contributors.map(c => ({
          login: c.login,
          avatarUrl: c.avatar_url,
          url: c.html_url,
          contributions: c.contributions,
        }));
      } catch (err) {
        wrapGitHubError(err);
      }
    }),

  getLanguages: publicProcedure
    .input(z.object({owner: z.string(), repo: z.string()}))
    .query(async ({input, ctx}) => {
      const token = ctx.session?.githubAccessToken;

      try {
        const languages = await fetchLanguages(input.owner, input.repo, token);
        const total = Object.values(languages).reduce(
          (sum, bytes) => sum + bytes,
          0,
        );
        return Object.entries(languages).map(([name, bytes]) => ({
          name,
          bytes,
          percentage: total > 0 ? Math.round((bytes / total) * 1000) / 10 : 0,
        }));
      } catch (err) {
        wrapGitHubError(err);
      }
    }),

  getRecentCommits: publicProcedure
    .input(z.object({owner: z.string(), repo: z.string()}))
    .query(async ({input, ctx}) => {
      const token = ctx.session?.githubAccessToken;

      try {
        const commits = await fetchRecentCommits(
          input.owner,
          input.repo,
          token,
        );
        return commits.map(c => ({
          sha: c.sha.slice(0, 7),
          message: c.commit.message.split('\n')[0],
          authorName: c.commit.author.name,
          authorLogin: c.author?.login ?? null,
          authorAvatar: c.author?.avatar_url ?? null,
          date: c.commit.author.date,
          url: c.html_url,
        }));
      } catch (err) {
        wrapGitHubError(err);
      }
    }),

  getReadme: publicProcedure
    .input(z.object({owner: z.string(), repo: z.string()}))
    .query(async ({input, ctx}) => {
      const token = ctx.session?.githubAccessToken;

      try {
        const content = await fetchReadme(input.owner, input.repo, token);
        return {content};
      } catch (err) {
        wrapGitHubError(err);
      }
    }),

  getLatestRelease: publicProcedure
    .input(z.object({owner: z.string(), repo: z.string()}))
    .query(async ({input, ctx}) => {
      const token = ctx.session?.githubAccessToken;

      try {
        const release = await fetchLatestRelease(
          input.owner,
          input.repo,
          token,
        );
        if (!release) return null;
        return {
          tag: release.tag_name,
          name: release.name,
          publishedAt: release.published_at,
          url: release.html_url,
        };
      } catch (err) {
        wrapGitHubError(err);
      }
    }),

  searchRepos: publicProcedure
    .input(z.object({query: z.string().min(1)}))
    .query(async ({input, ctx}) => {
      const token = ctx.session?.githubAccessToken;

      try {
        const repos = await searchRepos(input.query, token);
        return repos.map(r => ({
          id: r.id,
          fullName: r.full_name,
          name: r.name,
          description: r.description,
          owner: r.owner.login,
          ownerAvatar: r.owner.avatar_url,
          stars: r.stargazers_count,
          forks: r.forks_count,
          language: r.language,
          url: r.html_url,
        }));
      } catch (err) {
        wrapGitHubError(err);
      }
    }),

  getIssues: publicProcedure
    .input(
      z.object({
        owner: z.string(),
        repo: z.string(),
        state: z.enum(['open', 'closed', 'all']).default('open'),
        page: z.number().default(1),
        labels: z.string().optional(),
      }),
    )
    .query(async ({input, ctx}) => {
      const token = ctx.session?.githubAccessToken;

      try {
        const issues = await fetchIssues(
          input.owner,
          input.repo,
          {state: input.state, page: input.page, labels: input.labels},
          token,
        );
        return issues.map(i => ({
          number: i.number,
          title: i.title,
          state: i.state,
          createdAt: i.created_at,
          updatedAt: i.updated_at,
          closedAt: i.closed_at,
          commentsCount: i.comments,
          url: i.html_url,
          author: {
            login: i.user.login,
            avatarUrl: i.user.avatar_url,
          },
          labels: i.labels.map(l => ({
            name: l.name,
            color: l.color,
          })),
          assignees: i.assignees.map(a => ({
            login: a.login,
            avatarUrl: a.avatar_url,
          })),
        }));
      } catch (err) {
        wrapGitHubError(err);
      }
    }),

  getIssue: publicProcedure
    .input(z.object({owner: z.string(), repo: z.string(), issueNumber: z.number()}))
    .query(async ({input, ctx}) => {
      const token = ctx.session?.githubAccessToken;

      try {
        const i = await fetchIssue(input.owner, input.repo, input.issueNumber, token);
        return {
          number: i.number,
          title: i.title,
          body: i.body,
          state: i.state,
          createdAt: i.created_at,
          updatedAt: i.updated_at,
          closedAt: i.closed_at,
          commentsCount: i.comments,
          url: i.html_url,
          author: {
            login: i.user.login,
            avatarUrl: i.user.avatar_url,
            url: i.user.html_url,
          },
          labels: i.labels.map(l => ({
            name: l.name,
            color: l.color,
          })),
          assignees: i.assignees.map(a => ({
            login: a.login,
            avatarUrl: a.avatar_url,
          })),
        };
      } catch (err) {
        wrapGitHubError(err);
      }
    }),

  getLabels: publicProcedure
    .input(z.object({owner: z.string(), repo: z.string()}))
    .query(async ({input, ctx}) => {
      const token = ctx.session?.githubAccessToken;

      try {
        const labels = await fetchRepoLabels(input.owner, input.repo, token);
        return labels.map(l => ({
          name: l.name,
          color: l.color,
          description: l.description,
        }));
      } catch (err) {
        wrapGitHubError(err);
      }
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
