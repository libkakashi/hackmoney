'use client';

import {useState} from 'react';
import {GitBranch, Search, Star, Zap, Calendar, Clock} from 'lucide-react';
import {Button} from '~/components/ui/button';
import {Input} from '~/components/ui/input';
import {Loader} from '~/components/ui/loader';
import {useGithubAuth} from '~/hooks/use-github-auth';
import {useGithubRepos, type RepoSelection} from '~/hooks/use-github-repos';

export type LaunchMode = 'now' | 'scheduled';

export interface FormData {
  repoFullName: string;
  repoName: string;
  repoOwner: string;
  repoOwnerAvatar: string;
  repoDescription: string;
  repoUrl: string;
  repoStars: number;
  repoLanguage: string;
  selectionType: 'repo' | 'org';
}

interface ConfigStepProps {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  mode: LaunchMode;
  setMode: (mode: LaunchMode) => void;
  scheduledTime: string;
  setScheduledTime: (time: string) => void;
  onContinue: () => void;
  disabled?: boolean;
}

const GitHubIcon = ({className}: {className?: string}) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

export const ConfigStep = ({
  form,
  setForm,
  mode,
  setMode,
  scheduledTime,
  setScheduledTime,
  onContinue,
  disabled,
}: ConfigStepProps) => {
  const {signIn, disconnect, isConnected, username, avatarUrl, isLoading} =
    useGithubAuth();
  const {repos, orgs, search, setSearch, isLoading: isLoadingRepos} =
    useGithubRepos(isConnected);

  const [tab, setTab] = useState<'repos' | 'orgs'>('repos');

  const handleSelect = (selection: RepoSelection) => {
    if (selection.type === 'repo') {
      setForm({
        repoFullName: selection.fullName,
        repoName: selection.name,
        repoOwner: selection.owner,
        repoOwnerAvatar: selection.ownerAvatar,
        repoDescription: selection.description || '',
        repoUrl: selection.url,
        repoStars: selection.stars,
        repoLanguage: selection.language || '',
        selectionType: 'repo',
      });
    } else {
      setForm({
        repoFullName: selection.login,
        repoName: selection.login,
        repoOwner: selection.login,
        repoOwnerAvatar: selection.avatarUrl,
        repoDescription: selection.description || '',
        repoUrl: `https://github.com/${selection.login}`,
        repoStars: 0,
        repoLanguage: '',
        selectionType: 'org',
      });
    }
  };

  const canProceed = !!form.repoFullName;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-dim text-sm">
        <Loader />
        <span className="ml-2">loading...</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="space-y-8">
        <div className="border border-border p-8 text-center space-y-4">
          <GitHubIcon className="h-12 w-12 mx-auto text-dim" />
          <div>
            <h2 className="text-lg mb-1">connect your github</h2>
            <p className="text-dim text-sm">
              sign in with github to pick a repo or org for your project token
            </p>
          </div>
          <Button
            onClick={signIn}
            size="lg"
            className="h-12 gap-2"
            showPrefix
          >
            <GitHubIcon className="h-4 w-4" />
            sign in with github
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* GitHub connection status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {avatarUrl && (
            <img
              src={avatarUrl}
              alt={username || ''}
              className="w-8 h-8 rounded-full border border-border"
            />
          )}
          <div className="text-sm">
            <span className="text-dim">signed in as </span>
            <span className="text-green">{username}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={disconnect}
          className="text-dim hover:text-red"
        >
          disconnect
        </Button>
      </div>

      {/* Repo/Org selection */}
      <div>
        <div className="text-sm mb-4">
          <span className="text-dim">01</span>{' '}
          <span>select repo or org</span>
        </div>
        <div className="border-b border-border mb-4" />

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab('repos')}
            className={`px-3 py-1.5 text-xs border transition-colors ${
              tab === 'repos'
                ? 'border-green text-green bg-green/5'
                : 'border-border text-dim hover:text-foreground'
            }`}
          >
            repositories
          </button>
          <button
            onClick={() => setTab('orgs')}
            className={`px-3 py-1.5 text-xs border transition-colors ${
              tab === 'orgs'
                ? 'border-purple text-purple bg-purple/5'
                : 'border-border text-dim hover:text-foreground'
            }`}
          >
            organizations
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dim" />
          <Input
            type="text"
            placeholder="search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            disabled={disabled}
            className="h-10 pl-10 pr-4"
          />
        </div>

        {/* List */}
        <div className="border border-border max-h-80 overflow-y-auto">
          {isLoadingRepos ? (
            <div className="flex items-center justify-center py-12 text-dim text-sm">
              <Loader />
              <span className="ml-2">loading repositories...</span>
            </div>
          ) : tab === 'repos' ? (
            repos.length === 0 ? (
              <div className="p-6 text-center text-dim text-sm">
                {search
                  ? 'no repos match your search'
                  : 'no repos found where you have owner permissions'}
              </div>
            ) : (
              repos.map(repo => (
                <button
                  key={repo.id}
                  onClick={() =>
                    handleSelect({
                      type: 'repo',
                      fullName: repo.fullName,
                      name: repo.name,
                      owner: repo.owner,
                      ownerAvatar: repo.ownerAvatar,
                      description: repo.description,
                      stars: repo.stars,
                      language: repo.language,
                      url: repo.url,
                    })
                  }
                  disabled={disabled}
                  className={`w-full text-left px-4 py-3 border-b border-border last:border-b-0 transition-colors hover:bg-green/5 ${
                    form.repoFullName === repo.fullName &&
                    form.selectionType === 'repo'
                      ? 'bg-green/10 border-l-2 border-l-green'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={repo.ownerAvatar}
                        alt={repo.owner}
                        className="w-5 h-5 rounded-full shrink-0"
                      />
                      <span className="text-sm truncate">{repo.fullName}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      {repo.language && (
                        <span className="text-xs text-dim">
                          {repo.language}
                        </span>
                      )}
                      {repo.stars > 0 && (
                        <span className="text-xs text-dim flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {repo.stars}
                        </span>
                      )}
                    </div>
                  </div>
                  {repo.description && (
                    <p className="text-xs text-dim mt-1 truncate">
                      {repo.description}
                    </p>
                  )}
                </button>
              ))
            )
          ) : orgs.length === 0 ? (
            <div className="p-6 text-center text-dim text-sm">
              {search
                ? 'no orgs match your search'
                : 'no organizations found'}
            </div>
          ) : (
            orgs.map(org => (
              <button
                key={org.login}
                onClick={() =>
                  handleSelect({
                    type: 'org',
                    login: org.login,
                    avatarUrl: org.avatarUrl,
                    description: org.description,
                  })
                }
                disabled={disabled}
                className={`w-full text-left px-4 py-3 border-b border-border last:border-b-0 transition-colors hover:bg-purple/5 ${
                  form.repoFullName === org.login &&
                  form.selectionType === 'org'
                    ? 'bg-purple/10 border-l-2 border-l-purple'
                    : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <img
                    src={org.avatarUrl}
                    alt={org.login}
                    className="w-5 h-5 rounded-full shrink-0"
                  />
                  <span className="text-sm">{org.login}</span>
                </div>
                {org.description && (
                  <p className="text-xs text-dim mt-1 truncate">
                    {org.description}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Selected item preview */}
      {form.repoFullName && (
        <div className="border border-green/30 bg-green/5 p-4">
          <div className="flex items-center gap-3">
            <img
              src={form.repoOwnerAvatar}
              alt={form.repoOwner}
              className="w-10 h-10 rounded-full border border-border"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <GitBranch className="h-3.5 w-3.5 text-green shrink-0" />
                <span className="text-sm font-medium truncate">
                  {form.repoFullName}
                </span>
              </div>
              {form.repoDescription && (
                <p className="text-xs text-dim mt-0.5 truncate">
                  {form.repoDescription}
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-green/20 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-dim">token name: </span>
              <span>{form.repoName}</span>
            </div>
            <div>
              <span className="text-dim">symbol: </span>
              <span className="uppercase">
                {form.repoName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Launch timing section */}
      <div>
        <div className="flex items-center gap-2 text-sm text-yellow mb-4">
          <Clock className="h-4 w-4" />
          <span>launch timing</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => setMode('now')}
            variant="outline"
            disabled={disabled}
            className={`p-4 h-auto text-left justify-start ${
              mode === 'now' ? 'border-green bg-green/5' : ''
            }`}
          >
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2 mb-1">
                <Zap
                  className={`h-4 w-4 ${mode === 'now' ? 'text-green' : 'text-dim'}`}
                />
                <span className={mode === 'now' ? 'text-green' : ''}>
                  launch now
                </span>
              </div>
              <p className="text-dim text-xs">start auction immediately</p>
            </div>
          </Button>
          <Button
            onClick={() => setMode('scheduled')}
            variant="outline"
            disabled={disabled}
            className={`p-4 h-auto text-left justify-start ${
              mode === 'scheduled' ? 'border-purple bg-purple/5' : ''
            }`}
          >
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2 mb-1">
                <Calendar
                  className={`h-4 w-4 ${mode === 'scheduled' ? 'text-purple' : 'text-dim'}`}
                />
                <span className={mode === 'scheduled' ? 'text-purple' : ''}>
                  schedule
                </span>
              </div>
              <p className="text-dim text-xs">set a future launch time</p>
            </div>
          </Button>
        </div>

        {mode === 'scheduled' && (
          <Input
            type="datetime-local"
            value={scheduledTime}
            onChange={e => setScheduledTime(e.target.value)}
            disabled={disabled}
            className="h-11 px-4 mt-4 focus:border-purple"
          />
        )}
      </div>

      {/* Continue */}
      <Button
        onClick={onContinue}
        disabled={!canProceed || disabled}
        size="lg"
        className="w-full h-12"
        showPrefix
      >
        continue
      </Button>
    </div>
  );
};
