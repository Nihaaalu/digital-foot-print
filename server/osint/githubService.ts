import { safeFetch } from '../security.js';
import { osintCache } from '../cache.js';

export interface GitHubRepository {
  name: string;
  fullName: string;
  description?: string;
  language?: string;
  stars: number;
  forks: number;
  htmlUrl: string;
  updatedAt: string;
  isFork: boolean;
  defaultBranch: string;
}

export interface GitHubOrganization {
  login: string;
  avatarUrl: string;
  description?: string;
  htmlUrl: string;
}

export interface GitHubAnalysis {
  username: string;
  timestamp: string;
  source: string;
  sourceUrl: string;
  status: 'FOUND' | 'NOT_FOUND' | 'RATE_LIMITED' | 'ERROR';
  rateLimit: {
    remaining: number;
    limit: number;
    resetTime: string;
  };
  profile?: {
    login: string;
    name?: string;
    avatarUrl: string;
    bio?: string;
    company?: string;
    blog?: string;
    location?: string;
    email?: string;
    twitterUsername?: string;
    publicRepos: number;
    publicGists: number;
    followers: number;
    following: number;
    createdAt: string;
    updatedAt: string;
    htmlUrl: string;
  };
  repositories: GitHubRepository[];
  organizations: GitHubOrganization[];
  publicEventsSummary?: {
    totalEvents: number;
    recentActionTypes: string[];
    associatedEmails: string[];
  };
  error?: string;
}

export async function lookupGitHubUser(username: string): Promise<GitHubAnalysis> {
  const cleanUsername = username.trim();
  const cacheKey = `github:${cleanUsername.toLowerCase()}`;
  const cached = osintCache.get<GitHubAnalysis>(cacheKey);
  if (cached) return cached.data;

  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const sourceUrl = `https://github.com/${encodeURIComponent(cleanUsername)}`;

  try {
    const userRes = await safeFetch(`https://api.github.com/users/${encodeURIComponent(cleanUsername)}`, {
      timeoutMs: 8000,
      headers,
    });

    const rateLimitRemaining = parseInt(userRes.headers.get('x-ratelimit-remaining') || '0', 10);
    const rateLimitLimit = parseInt(userRes.headers.get('x-ratelimit-limit') || '60', 10);
    const resetEpoch = parseInt(userRes.headers.get('x-ratelimit-reset') || '0', 10);
    const resetDate = resetEpoch ? new Date(resetEpoch * 1000).toISOString() : new Date().toISOString();

    const rateLimit = {
      remaining: rateLimitRemaining,
      limit: rateLimitLimit,
      resetTime: resetDate,
    };

    if (userRes.status === 404) {
      const notFound: GitHubAnalysis = {
        username: cleanUsername,
        timestamp: new Date().toISOString(),
        source: 'GitHub REST API v3',
        sourceUrl,
        status: 'NOT_FOUND',
        rateLimit,
        repositories: [],
        organizations: [],
      };
      osintCache.set(cacheKey, notFound, 20 * 60 * 1000);
      return notFound;
    }

    if (userRes.status === 403 || userRes.status === 429) {
      return {
        username: cleanUsername,
        timestamp: new Date().toISOString(),
        source: 'GitHub REST API v3',
        sourceUrl,
        status: 'RATE_LIMITED',
        rateLimit,
        repositories: [],
        organizations: [],
        error: `GitHub API rate limit exceeded. Resets at ${resetDate}. Add GITHUB_TOKEN to increase limits.`,
      };
    }

    if (!userRes.ok) {
      throw new Error(`GitHub API returned HTTP ${userRes.status}`);
    }

    const userData: any = await userRes.json();

    // Fetch repositories, organizations and events in parallel
    const [reposRes, orgsRes, eventsRes] = await Promise.allSettled([
      safeFetch(`https://api.github.com/users/${encodeURIComponent(cleanUsername)}/repos?sort=updated&per_page=30`, {
        timeoutMs: 8000,
        headers,
      }).then((r) => (r.ok ? r.json() : [])),
      safeFetch(`https://api.github.com/users/${encodeURIComponent(cleanUsername)}/orgs`, {
        timeoutMs: 8000,
        headers,
      }).then((r) => (r.ok ? r.json() : [])),
      safeFetch(`https://api.github.com/users/${encodeURIComponent(cleanUsername)}/events/public?per_page=30`, {
        timeoutMs: 8000,
        headers,
      }).then((r) => (r.ok ? r.json() : [])),
    ]);

    const reposData = reposRes.status === 'fulfilled' && Array.isArray(reposRes.value) ? reposRes.value : [];
    const orgsData = orgsRes.status === 'fulfilled' && Array.isArray(orgsRes.value) ? orgsRes.value : [];
    const eventsData = eventsRes.status === 'fulfilled' && Array.isArray(eventsRes.value) ? eventsRes.value : [];

    const repositories: GitHubRepository[] = reposData.map((r: any) => ({
      name: r.name,
      fullName: r.full_name,
      description: r.description || undefined,
      language: r.language || undefined,
      stars: r.stargazers_count || 0,
      forks: r.forks_count || 0,
      htmlUrl: r.html_url,
      updatedAt: r.updated_at,
      isFork: r.fork || false,
      defaultBranch: r.default_branch || 'main',
    }));

    const organizations: GitHubOrganization[] = orgsData.map((o: any) => ({
      login: o.login,
      avatarUrl: o.avatar_url,
      description: o.description || undefined,
      htmlUrl: `https://github.com/${o.login}`,
    }));

    // Extract any public commit emails from public PushEvents
    const associatedEmails = new Set<string>();
    const recentActionTypes = new Set<string>();
    for (const ev of eventsData) {
      if (ev.type) recentActionTypes.add(ev.type);
      if (ev.type === 'PushEvent' && ev.payload?.commits) {
        for (const c of ev.payload.commits) {
          if (c.author?.email && !c.author.email.includes('users.noreply.github.com')) {
            associatedEmails.add(c.author.email.toLowerCase());
          }
        }
      }
    }

    const result: GitHubAnalysis = {
      username: cleanUsername,
      timestamp: new Date().toISOString(),
      source: 'GitHub REST API v3',
      sourceUrl,
      status: 'FOUND',
      rateLimit,
      profile: {
        login: userData.login,
        name: userData.name || undefined,
        avatarUrl: userData.avatar_url,
        bio: userData.bio || undefined,
        company: userData.company || undefined,
        blog: userData.blog || undefined,
        location: userData.location || undefined,
        email: userData.email || undefined,
        twitterUsername: userData.twitter_username || undefined,
        publicRepos: userData.public_repos || 0,
        publicGists: userData.public_gists || 0,
        followers: userData.followers || 0,
        following: userData.following || 0,
        createdAt: userData.created_at,
        updatedAt: userData.updated_at,
        htmlUrl: userData.html_url,
      },
      repositories,
      organizations,
      publicEventsSummary: {
        totalEvents: eventsData.length,
        recentActionTypes: Array.from(recentActionTypes),
        associatedEmails: Array.from(associatedEmails),
      },
    };

    osintCache.set(cacheKey, result, 15 * 60 * 1000);
    return result;
  } catch (err: any) {
    return {
      username: cleanUsername,
      timestamp: new Date().toISOString(),
      source: 'GitHub REST API v3',
      sourceUrl,
      status: 'ERROR',
      rateLimit: { remaining: 0, limit: 60, resetTime: new Date().toISOString() },
      repositories: [],
      organizations: [],
      error: err.message || 'Failed to connect to GitHub API',
    };
  }
}
