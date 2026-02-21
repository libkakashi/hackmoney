'use client';

import {useMemo, useState} from 'react';
import {trpc} from '~/lib/trpc';

export type RepoSelection =
  | {type: 'repo'; fullName: string; name: string; owner: string; ownerAvatar: string; description: string | null; stars: number; language: string | null; url: string}
  | {type: 'org'; login: string; avatarUrl: string; description: string | null};

export function useGithubRepos(isConnected: boolean) {
  const [search, setSearch] = useState('');

  const {data: repos, isLoading: isLoadingRepos} =
    trpc.github.getRepos.useQuery(undefined, {
      enabled: isConnected,
    });

  const {data: orgs, isLoading: isLoadingOrgs} =
    trpc.github.getOrgs.useQuery(undefined, {
      enabled: isConnected,
    });

  const filteredRepos = useMemo(() => {
    if (!repos) return [];
    if (!search) return repos;
    const q = search.toLowerCase();
    return repos.filter(
      r =>
        r.fullName.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q),
    );
  }, [repos, search]);

  const filteredOrgs = useMemo(() => {
    if (!orgs) return [];
    if (!search) return orgs;
    const q = search.toLowerCase();
    return orgs.filter(
      o =>
        o.login.toLowerCase().includes(q) ||
        o.description?.toLowerCase().includes(q),
    );
  }, [orgs, search]);

  return {
    repos: filteredRepos,
    orgs: filteredOrgs,
    search,
    setSearch,
    isLoading: isLoadingRepos || isLoadingOrgs,
  };
}
