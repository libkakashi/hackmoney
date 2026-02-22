'use client';

import {useState, useEffect, useRef} from 'react';
import {useRouter} from 'next/navigation';
import {useConnection} from 'wagmi';
import {
  GitBranch,
  Building2,
  ChevronDown,
  Star,
  Search,
  Zap,
  Calendar,
} from 'lucide-react';
import {Container} from '~/components/layout/container';
import {Button} from '~/components/ui/button';
import {DateTimePicker} from '~/components/ui/date-time-picker';
import {Loader} from '~/components/ui/loader';
import {useLaunch} from '~/hooks/use-launch';
import {useMineSalt} from '~/hooks/use-mine-salt';
import {useGithubAuth} from '~/hooks/use-github-auth';
import {useGithubRepos, type RepoSelection} from '~/hooks/use-github-repos';

// ── Types ──────────────────────────────────────────────────────────────

interface FormData {
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

type LaunchMode = 'now' | 'scheduled';

// ── Constants ──────────────────────────────────────────────────────────

const TOTAL_SUPPLY = 1_000_000;
const FLOOR_PRICE = 0.1;
const AUCTION_AMOUNT = 100_000;

const EMPTY_FORM: FormData = {
  repoFullName: '',
  repoName: '',
  repoOwner: '',
  repoOwnerAvatar: '',
  repoDescription: '',
  repoUrl: '',
  repoStars: 0,
  repoLanguage: '',
  selectionType: 'repo',
};

// ── Helpers ────────────────────────────────────────────────────────────

function deriveSymbol(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 10);
}

const GitHubIcon = ({className}: {className?: string}) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

// ── Dropdowns ──────────────────────────────────────────────────────────

function RepoDropdown({
  repos,
  selectedFullName,
  onSelect,
  disabled,
  isLoading,
}: {
  repos: {
    id: number;
    fullName: string;
    name: string;
    owner: string;
    ownerAvatar: string;
    description: string | null;
    stars: number;
    language: string | null;
    url: string;
  }[];
  selectedFullName: string;
  onSelect: (selection: RepoSelection) => void;
  disabled?: boolean;
  isLoading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  const filtered = search
    ? repos.filter(
        r =>
          r.fullName.toLowerCase().includes(search.toLowerCase()) ||
          r.description?.toLowerCase().includes(search.toLowerCase()),
      )
    : repos;

  const selected = repos.find(r => r.fullName === selectedFullName);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-4 py-3 border text-sm text-left transition-colors ${
          open
            ? 'border-green bg-green/5'
            : selected
              ? 'border-green/40'
              : 'border-border hover:border-dim'
        }`}
      >
        {selected ? (
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={selected.ownerAvatar}
              alt={selected.owner}
              className="w-5 h-5 rounded-full shrink-0"
            />
            <span className="truncate">{selected.fullName}</span>
          </div>
        ) : (
          <span className="text-dim">select a repository...</span>
        )}
        <ChevronDown
          className={`h-4 w-4 text-dim shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 border border-border bg-background shadow-lg">
          <div className="relative border-b border-border">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-dim" />
            <input
              ref={searchRef}
              type="text"
              placeholder="search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-sm bg-transparent outline-none placeholder:text-dim"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-dim text-sm">
                <Loader />
                <span className="ml-2">loading...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center text-dim text-xs">
                {search ? 'no matches' : 'no repos found'}
              </div>
            ) : (
              filtered.map(repo => (
                <button
                  key={repo.id}
                  onClick={() => {
                    onSelect({
                      type: 'repo',
                      fullName: repo.fullName,
                      name: repo.name,
                      owner: repo.owner,
                      ownerAvatar: repo.ownerAvatar,
                      description: repo.description,
                      stars: repo.stars,
                      language: repo.language,
                      url: repo.url,
                    });
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-green/5 ${selectedFullName === repo.fullName ? 'bg-green/10 text-green' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={repo.ownerAvatar}
                        alt={repo.owner}
                        className="w-4 h-4 rounded-full shrink-0"
                      />
                      <span className="truncate">{repo.fullName}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2 text-xs text-dim">
                      {repo.language && <span>{repo.language}</span>}
                      {repo.stars > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3" />
                          {repo.stars.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OrgDropdown({
  orgs,
  selectedLogin,
  onSelect,
  disabled,
  isLoading,
}: {
  orgs: {login: string; avatarUrl: string; description: string | null}[];
  selectedLogin: string;
  onSelect: (selection: RepoSelection) => void;
  disabled?: boolean;
  isLoading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  const filtered = search
    ? orgs.filter(
        o =>
          o.login.toLowerCase().includes(search.toLowerCase()) ||
          o.description?.toLowerCase().includes(search.toLowerCase()),
      )
    : orgs;

  const selected = orgs.find(o => o.login === selectedLogin);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-4 py-3 border text-sm text-left transition-colors ${
          open
            ? 'border-purple bg-purple/5'
            : selected
              ? 'border-purple/40'
              : 'border-border hover:border-dim'
        }`}
      >
        {selected ? (
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={selected.avatarUrl}
              alt={selected.login}
              className="w-5 h-5 rounded-full shrink-0"
            />
            <span className="truncate">{selected.login}</span>
          </div>
        ) : (
          <span className="text-dim">select an organization...</span>
        )}
        <ChevronDown
          className={`h-4 w-4 text-dim shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 border border-border bg-background shadow-lg">
          <div className="relative border-b border-border">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-dim" />
            <input
              ref={searchRef}
              type="text"
              placeholder="search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-sm bg-transparent outline-none placeholder:text-dim"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-dim text-sm">
                <Loader />
                <span className="ml-2">loading...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center text-dim text-xs">
                {search ? 'no matches' : 'no organizations found'}
              </div>
            ) : (
              filtered.map(org => (
                <button
                  key={org.login}
                  onClick={() => {
                    onSelect({
                      type: 'org',
                      login: org.login,
                      avatarUrl: org.avatarUrl,
                      description: org.description,
                    });
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-purple/5 ${selectedLogin === org.login ? 'bg-purple/10 text-purple' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={org.avatarUrl}
                      alt={org.login}
                      className="w-4 h-4 rounded-full shrink-0"
                    />
                    <span>{org.login}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────

export default function LaunchPage() {
  const router = useRouter();
  const {isConnected: walletConnected} = useConnection();

  const {
    signIn,
    disconnect,
    isConnected: ghConnected,
    username,
    avatarUrl,
    isLoading: ghLoading,
  } = useGithubAuth();
  const {repos, orgs, isLoading: reposLoading} = useGithubRepos(ghConnected);

  const [tab, setTab] = useState<'repos' | 'orgs'>('repos');
  const [mode, setMode] = useState<LaunchMode>('now');
  const [scheduledTime, setScheduledTime] = useState<Date | undefined>();
  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  const tokenName = form.repoName;
  const tokenSymbol = deriveSymbol(form.repoName);
  const hasSelection = !!form.repoFullName;

  const {
    mineSalt,
    saltResult,
    isMining,
    miningProgress,
    reset: resetSalt,
  } = useMineSalt();
  const {launch, launchResult, isPending, isConfirming, isConfirmed} =
    useLaunch();
  const isDeploying = isPending || isConfirming;

  // Mine salt once user clicks deploy
  const handleDeploy = async () => {
    if (!hasSelection) return;

    // Mine salt if not ready
    if (!saltResult && !isMining) {
      await mineSalt({
        name: tokenName,
        symbol: tokenSymbol,
        scheduledTime: mode === 'scheduled' ? scheduledTime : undefined,
      });
    }
  };

  // When salt is ready, actually deploy
  useEffect(() => {
    if (saltResult && !isDeploying && !isConfirmed) {
      void launch({
        name: tokenName,
        symbol: tokenSymbol,
        salt: saltResult.salt,
        startBlock: saltResult.startBlock,
        description: form.repoDescription || undefined,
        websiteUrl: form.repoUrl || undefined,
      }).catch(err => {
        console.error('Launch failed:', err);
        resetSalt();
      });
    }
  }, [saltResult]);

  // Redirect on confirmation
  useEffect(() => {
    if (launchResult?.token && isConfirmed) {
      router.push(`/token/${launchResult.token}`);
    }
  }, [launchResult, isConfirmed, router]);

  const clearForm = () => setForm(EMPTY_FORM);

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

  // ── Not signed in ──────────────────────────────────────────────────

  if (ghLoading) {
    return (
      <div className="min-h-screen py-12">
        <Container size="sm">
          <div className="flex items-center justify-center py-20 text-dim text-sm">
            <Loader />
            <span className="ml-2">loading...</span>
          </div>
        </Container>
      </div>
    );
  }

  if (!ghConnected) {
    return (
      <div className="min-h-screen py-12">
        <Container size="sm">
          <div className="text-center mb-10">
            <h1 className="text-2xl mb-2">
              <span className="text-green">&gt;</span> register project
            </h1>
            <p className="text-dim text-sm">
              pick a project, configure, and go live.
            </p>
          </div>
          <div className="border border-border p-8 text-center space-y-4">
            <GitHubIcon className="h-12 w-12 mx-auto text-dim" />
            <div>
              <h2 className="text-lg mb-1">connect your github</h2>
              <p className="text-dim text-sm">
                sign in to pick a repository or organization
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
        </Container>
      </div>
    );
  }

  // ── Main form ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen py-12">
      <Container size="sm">
        <div className="space-y-8">
          {/* GitHub user */}
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

          {/* Project selection */}
          <div>
            <div className="text-sm mb-4">
              <span className="text-dim">01</span> <span>pick project</span>
            </div>
            <div className="border-b border-border mb-4" />

            {/* Tabs */}
            <div className="flex gap-6 mb-4">
              <button
                onClick={() => {
                  if (tab !== 'repos') {
                    setTab('repos');
                    clearForm();
                  }
                }}
                className={`text-sm transition-colors ${
                  tab === 'repos'
                    ? 'text-green'
                    : 'text-dim hover:text-foreground'
                }`}
              >
                repository
              </button>
              <button
                onClick={() => {
                  if (tab !== 'orgs') {
                    setTab('orgs');
                    clearForm();
                  }
                }}
                className={`text-sm transition-colors ${
                  tab === 'orgs'
                    ? 'text-purple'
                    : 'text-dim hover:text-foreground'
                }`}
              >
                organization
              </button>
            </div>

            {/* Dropdown */}
            {tab === 'repos' ? (
              <RepoDropdown
                repos={repos}
                selectedFullName={
                  form.selectionType === 'repo' ? form.repoFullName : ''
                }
                onSelect={handleSelect}
                disabled={isDeploying}
                isLoading={reposLoading}
              />
            ) : (
              <OrgDropdown
                orgs={orgs}
                selectedLogin={
                  form.selectionType === 'org' ? form.repoFullName : ''
                }
                onSelect={handleSelect}
                disabled={isDeploying}
                isLoading={reposLoading}
              />
            )}

            {/* Project card — shows after selection */}
            {hasSelection && (
              <div className="flex gap-5 items-start mt-6">
                <div className="w-20 h-20 border border-border shrink-0 overflow-hidden">
                  <img
                    src={form.repoOwnerAvatar}
                    alt={form.repoOwner}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {form.selectionType === 'org' ? (
                      <Building2 className="h-3.5 w-3.5 text-purple shrink-0" />
                    ) : (
                      <GitBranch className="h-3.5 w-3.5 text-green shrink-0" />
                    )}
                    <span className="text-sm">{form.repoFullName}</span>
                    <span className="text-xs text-dim">
                      ({form.selectionType})
                    </span>
                  </div>
                  {form.repoDescription && (
                    <p className="text-dim text-sm leading-relaxed">
                      {form.repoDescription}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <a
                      href={form.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1 border border-border text-xs text-dim hover:text-foreground hover:border-green transition-colors"
                    >
                      <GitHubIcon className="h-3 w-3 shrink-0" />
                      github
                    </a>
                    {form.repoStars > 0 && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 border border-border text-xs text-dim">
                        <Star className="h-3 w-3" />
                        {form.repoStars.toLocaleString()}
                      </div>
                    )}
                    {form.repoLanguage && (
                      <div className="px-2.5 py-1 border border-border text-xs text-dim">
                        {form.repoLanguage}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Launch timing */}
          <div>
            <div className="text-sm mb-4">
              <span className="text-dim">02</span> <span>timing</span>
            </div>
            <div className="border-b border-border mb-4" />

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setMode('now')}
                disabled={isDeploying}
                className={`p-4 border text-left transition-colors ${
                  mode === 'now'
                    ? 'border-green bg-green/5'
                    : 'border-border hover:border-dim'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Zap
                    className={`h-4 w-4 ${mode === 'now' ? 'text-green' : 'text-dim'}`}
                  />
                  <span
                    className={`text-sm ${mode === 'now' ? 'text-green' : ''}`}
                  >
                    go live now
                  </span>
                </div>
                <p className="text-xs text-dim">
                  register and start immediately
                </p>
              </button>
              <button
                onClick={() => setMode('scheduled')}
                disabled={isDeploying}
                className={`p-4 border text-left transition-colors ${
                  mode === 'scheduled'
                    ? 'border-purple bg-purple/5'
                    : 'border-border hover:border-dim'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Calendar
                    className={`h-4 w-4 ${mode === 'scheduled' ? 'text-purple' : 'text-dim'}`}
                  />
                  <span
                    className={`text-sm ${mode === 'scheduled' ? 'text-purple' : ''}`}
                  >
                    schedule
                  </span>
                </div>
                <p className="text-xs text-dim">pick a future start time</p>
              </button>
            </div>

            {mode === 'scheduled' && (
              <div className="mt-4">
                <DateTimePicker
                  value={scheduledTime}
                  onChange={setScheduledTime}
                  minDate={new Date()}
                  placeholder="pick launch date & time"
                />
              </div>
            )}
          </div>

          {/* Token details */}
          <div>
            <div className="text-sm mb-4">
              <span className="text-dim">03</span> <span>token details</span>
            </div>
            <div className="border-b border-border mb-4" />

            <div className="grid grid-cols-2 gap-3">
              <div className="px-4 py-3 border border-border">
                <div className="text-dim text-xs mb-1">total supply</div>
                <div className="text-sm">{TOTAL_SUPPLY.toLocaleString()}</div>
              </div>
              <div className="px-4 py-3 border border-border">
                <div className="text-dim text-xs mb-1">starting price</div>
                <div className="text-sm text-green">${FLOOR_PRICE}</div>
              </div>
              <div className="px-4 py-3 border border-border">
                <div className="text-dim text-xs mb-1">auction amount</div>
                <div className="text-sm">
                  {AUCTION_AMOUNT.toLocaleString()}{' '}
                  <span className="text-dim text-xs">
                    ({((AUCTION_AMOUNT / TOTAL_SUPPLY) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
              <div className="px-4 py-3 border border-border">
                <div className="text-dim text-xs mb-1">auction duration</div>
                <div className="text-sm">24 hours</div>
              </div>
            </div>

            <p className="text-xs text-dim mt-4 px-1">
              a token is automatically created for your project with these
              parameters — no configuration needed.
            </p>
          </div>

          {/* Progress */}
          {isMining && miningProgress && (
            <div className="text-yellow text-sm flex items-center gap-2">
              <Loader />
              {miningProgress}
            </div>
          )}
          {isDeploying && (
            <div className="text-green text-sm flex items-center gap-2">
              <Loader />
              registering project...
            </div>
          )}

          {/* Deploy */}
          <Button
            onClick={handleDeploy}
            disabled={
              !hasSelection ||
              !walletConnected ||
              isDeploying ||
              isMining ||
              (mode === 'scheduled' && !scheduledTime)
            }
            size="lg"
            className="w-full h-12"
            showPrefix={!isDeploying && !isMining}
          >
            {isDeploying ? (
              <>
                <Loader type="dots" />
                deploying...
              </>
            ) : isMining ? (
              <>
                <Loader type="dots" />
                preparing...
              </>
            ) : mode === 'scheduled' ? (
              'schedule registration'
            ) : (
              'register project'
            )}
          </Button>

          {!walletConnected && (
            <p className="text-center text-dim text-xs">
              connect wallet to register
            </p>
          )}
        </div>
      </Container>
    </div>
  );
}
