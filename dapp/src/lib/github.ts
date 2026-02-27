import {env} from './env';

const GITHUB_API = 'https://api.github.com';
const GITHUB_OAUTH = 'https://github.com/login/oauth';

// ── Types ──────────────────────────────────────────────────────────────

export interface GitHubRepo {
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
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  language: string | null;
  html_url: string;
  homepage: string | null;
  topics: string[];
  license: {spdx_id: string; name: string} | null;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  default_branch: string;
  archived: boolean;
  fork: boolean;
}

export interface GitHubOrg {
  login: string;
  avatar_url: string;
  description: string | null;
}

export interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
  bio: string | null;
  html_url: string;
}

export interface GitHubContributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
}

export interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  author: {login: string; avatar_url: string} | null;
  html_url: string;
}

export interface GitHubLanguages {
  [language: string]: number;
}

export interface GitHubReadme {
  content: string;
  encoding: string;
  html_url: string;
}

export interface GitHubRelease {
  tag_name: string;
  name: string | null;
  published_at: string;
  html_url: string;
}

export interface GitHubSearchResult {
  total_count: number;
  items: GitHubRepo[];
}

export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
  description: string | null;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  html_url: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  comments: number;
  user: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  labels: GitHubLabel[];
  assignees: {
    login: string;
    avatar_url: string;
  }[];
  pull_request?: {url: string};
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
}

export class GitHubApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message?: string,
  ) {
    super(message || `GitHub API error: ${status} ${statusText}`);
    this.name = 'GitHubApiError';
  }
}

// ── Internal helpers ───────────────────────────────────────────────────

const buildHeaders = (token?: string): HeadersInit => ({
  Accept: 'application/vnd.github+json',
  ...(token ? {Authorization: `Bearer ${token}`} : {}),
});

const githubFetch = async <T>(
  path: string,
  token?: string,
  options?: RequestInit,
): Promise<T> => {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      ...buildHeaders(token),
      ...options?.headers,
    },
  });

  if (res.status === 404) {
    throw new GitHubApiError(404, 'Not Found', `Resource not found: ${path}`);
  }

  if (res.status === 403) {
    throw new GitHubApiError(403, 'Forbidden', 'GitHub API rate limit exceeded or insufficient permissions');
  }

  if (res.status === 401) {
    throw new GitHubApiError(401, 'Unauthorized', 'Invalid or expired GitHub token');
  }

  if (!res.ok) {
    throw new GitHubApiError(res.status, res.statusText);
  }

  return res.json() as Promise<T>;
};

// ── OAuth ──────────────────────────────────────────────────────────────

export const getAuthUrl = (): string => {
  if (!env.githubClientId) {
    throw new Error('GitHub OAuth not configured');
  }

  const params = new URLSearchParams({
    client_id: env.githubClientId,
    scope: 'read:user read:org',
  });

  return `${GITHUB_OAUTH}/authorize?${params}`;
};

export const exchangeCodeForToken = async (
  code: string,
): Promise<OAuthTokenResponse> => {
  if (!env.githubClientId || !env.githubClientSecret) {
    throw new Error('GitHub OAuth not configured');
  }

  const res = await fetch(`${GITHUB_OAUTH}/access_token`, {
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

  if (!res.ok) {
    throw new GitHubApiError(res.status, res.statusText, 'Failed to exchange OAuth code');
  }

  const data = (await res.json()) as OAuthTokenResponse;

  if (data.error || !data.access_token) {
    throw new GitHubApiError(400, 'Bad Request', data.error_description || 'GitHub OAuth token exchange failed');
  }

  return data;
};

// ── User ───────────────────────────────────────────────────────────────

export const fetchCurrentUser = async (
  token: string,
): Promise<GitHubUser> => {
  return githubFetch<GitHubUser>('/user', token);
};

// ── Repos ──────────────────────────────────────────────────────────────

export const fetchUserRepos = async (
  username: string,
  token: string,
): Promise<GitHubRepo[]> => {
  return githubFetch<GitHubRepo[]>(
    `/users/${username}/repos?per_page=100&sort=updated&type=owner`,
    token,
  );
};

export const fetchRepo = async (
  owner: string,
  repo: string,
  token?: string,
): Promise<GitHubRepo> => {
  return githubFetch<GitHubRepo>(`/repos/${owner}/${repo}`, token);
};

// ── Orgs ───────────────────────────────────────────────────────────────

export const fetchUserOrgs = async (
  token: string,
): Promise<GitHubOrg[]> => {
  return githubFetch<GitHubOrg[]>('/user/orgs?per_page=100', token);
};

// ── Repo metadata ──────────────────────────────────────────────────────

export const fetchContributors = async (
  owner: string,
  repo: string,
  token?: string,
): Promise<GitHubContributor[]> => {
  return githubFetch<GitHubContributor[]>(
    `/repos/${owner}/${repo}/contributors?per_page=10`,
    token,
  );
};

export const fetchLanguages = async (
  owner: string,
  repo: string,
  token?: string,
): Promise<GitHubLanguages> => {
  return githubFetch<GitHubLanguages>(
    `/repos/${owner}/${repo}/languages`,
    token,
  );
};

export const fetchRecentCommits = async (
  owner: string,
  repo: string,
  token?: string,
): Promise<GitHubCommit[]> => {
  return githubFetch<GitHubCommit[]>(
    `/repos/${owner}/${repo}/commits?per_page=5`,
    token,
  );
};

export const fetchReadme = async (
  owner: string,
  repo: string,
  token?: string,
): Promise<string | null> => {
  try {
    const data = await githubFetch<GitHubReadme>(
      `/repos/${owner}/${repo}/readme`,
      token,
    );
    return Buffer.from(data.content, 'base64').toString('utf-8');
  } catch (err) {
    if (err instanceof GitHubApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
};

export const fetchLatestRelease = async (
  owner: string,
  repo: string,
  token?: string,
): Promise<GitHubRelease | null> => {
  try {
    return await githubFetch<GitHubRelease>(
      `/repos/${owner}/${repo}/releases/latest`,
      token,
    );
  } catch (err) {
    if (err instanceof GitHubApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
};

// ── Search ─────────────────────────────────────────────────────────────

export const searchRepos = async (
  query: string,
  token?: string,
): Promise<GitHubRepo[]> => {
  const result = await githubFetch<GitHubSearchResult>(
    `/search/repositories?q=${encodeURIComponent(query)}&per_page=5&sort=stars&order=desc`,
    token,
  );
  return result.items;
};

// ── Issues ─────────────────────────────────────────────────────────────

export const fetchIssues = async (
  owner: string,
  repo: string,
  params?: {state?: 'open' | 'closed' | 'all'; per_page?: number; page?: number; labels?: string},
  token?: string,
): Promise<GitHubIssue[]> => {
  const query = new URLSearchParams({
    state: params?.state ?? 'open',
    per_page: String(params?.per_page ?? 30),
    page: String(params?.page ?? 1),
    sort: 'created',
    direction: 'desc',
    ...(params?.labels ? {labels: params.labels} : {}),
  });
  const issues = await githubFetch<GitHubIssue[]>(
    `/repos/${owner}/${repo}/issues?${query}`,
    token,
  );
  return issues.filter(i => !i.pull_request);
};

export const fetchIssue = async (
  owner: string,
  repo: string,
  issueNumber: number,
  token?: string,
): Promise<GitHubIssue> => {
  return githubFetch<GitHubIssue>(
    `/repos/${owner}/${repo}/issues/${issueNumber}`,
    token,
  );
};

export const fetchRepoLabels = async (
  owner: string,
  repo: string,
  token?: string,
): Promise<GitHubLabel[]> => {
  return githubFetch<GitHubLabel[]>(
    `/repos/${owner}/${repo}/labels?per_page=100`,
    token,
  );
};
