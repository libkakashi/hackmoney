'use client';

import {trpc} from '~/lib/trpc';

export const useRepoMetadata = (owner?: string, repo?: string) => {
  const enabled = !!owner && !!repo;

  const details = trpc.github.getRepoDetails.useQuery(
    {owner: owner!, repo: repo!},
    {enabled, staleTime: 5 * 60 * 1000, retry: false},
  );

  const contributors = trpc.github.getContributors.useQuery(
    {owner: owner!, repo: repo!},
    {enabled, staleTime: 5 * 60 * 1000, retry: false},
  );

  const languages = trpc.github.getLanguages.useQuery(
    {owner: owner!, repo: repo!},
    {enabled, staleTime: 5 * 60 * 1000, retry: false},
  );

  const latestCommit = trpc.github.getRecentCommits.useQuery(
    {owner: owner!, repo: repo!},
    {enabled, staleTime: 2 * 60 * 1000, retry: false},
  );

  return {
    details: details.data,
    contributors: contributors.data,
    languages: languages.data,
    lastCommitDate: latestCommit.data?.[0]?.date ?? null,
    isLoading: details.isLoading,
    isError: details.isError,
  };
};
