import { loadUnifiedSiteRegistry } from './siteRegistry.js';
import {
  probeInstagram,
  probeXTwitter,
  probeTikTok,
  probeBluesky,
  probeTelegram,
  probePinterest,
  probeKaggle,
  probeSpotify,
  probeTwitch,
  probeHashnode,
} from './directProbes.js';
import { safeFetch } from '../../security.js';
import {
  DiscoveredAccountFinding,
  SiteDefinition,
  UsernameInvestigationSummary,
  UsernameProbeStatus,
  ConfidenceLevel,
  SiteCategory,
} from './types.js';

const cache = new Map<string, { summary: UsernameInvestigationSummary; expiresAt: number }>();
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes

export function generateUsernameVariants(username: string): Array<{ variant: string; type: string }> {
  const variants: Array<{ variant: string; type: string }> = [];
  const clean = username.trim().toLowerCase();

  if (clean.includes('.')) {
    variants.push({ variant: clean.replace(/\./g, '_'), type: 'Underscore separator' });
    variants.push({ variant: clean.replace(/\./g, '-'), type: 'Hyphen separator' });
    variants.push({ variant: clean.replace(/\./g, ''), type: 'No separator' });
  }

  if (clean.includes('_')) {
    variants.push({ variant: clean.replace(/_/g, '.'), type: 'Dot separator' });
    variants.push({ variant: clean.replace(/_/g, '-'), type: 'Hyphen separator' });
    variants.push({ variant: clean.replace(/_/g, ''), type: 'No separator' });
  }

  if (clean.includes('-')) {
    variants.push({ variant: clean.replace(/-/g, '.'), type: 'Dot separator' });
    variants.push({ variant: clean.replace(/-/g, '_'), type: 'Underscore separator' });
    variants.push({ variant: clean.replace(/-/g, ''), type: 'No separator' });
  }

  const unique = new Map<string, { variant: string; type: string }>();
  for (const v of variants) {
    if (v.variant !== clean && !unique.has(v.variant)) {
      unique.set(v.variant, v);
    }
  }

  return Array.from(unique.values()).slice(0, 5);
}

const COMMON_NOT_FOUND_PATTERNS = [
  'user not found',
  'page not found',
  "page doesn't exist",
  "page doesn't exist",
  "account doesn't exist",
  "account doesn’t exist",
  'profile unavailable',
  "this page isn't available",
  "this page isn’t available",
  'no such user',
  'user does not exist',
  'could not be found',
  '404 not found',
  '404 - not found',
  'the specified profile could not be found',
  'we can’t find that user',
  'we can’t seem to find',
  'whoops, that page is gone',
];

async function executeProbe(site: SiteDefinition, username: string): Promise<DiscoveredAccountFinding> {
  const cleanUsername = username.trim();
  const profileUrl = site.urlTemplate.replace(/\{u\}/g, encodeURIComponent(cleanUsername));
  const probeUrl = site.probeUrlTemplate ? site.probeUrlTemplate.replace(/\{u\}/g, encodeURIComponent(cleanUsername)) : profileUrl;
  const startTime = Date.now();

  // 1. Specialized Platform Probes
  if (site.id === 'instagram') return probeInstagram(cleanUsername);
  if (site.id === 'x_twitter') return probeXTwitter(cleanUsername);
  if (site.id === 'tiktok') return probeTikTok(cleanUsername);
  if (site.id === 'bluesky') return probeBluesky(cleanUsername);
  if (site.id === 'telegram') return probeTelegram(cleanUsername);
  if (site.id === 'pinterest') return probePinterest(cleanUsername);
  if (site.id === 'kaggle') return probeKaggle(cleanUsername);
  if (site.id === 'spotify') return probeSpotify(cleanUsername);
  if (site.id === 'twitch') return probeTwitch(cleanUsername);
  if (site.id === 'hashnode') return probeHashnode(cleanUsername);

  if (site.id === 'linkedin') {
    return {
      platform: 'LinkedIn',
      category: 'Professional',
      username: cleanUsername,
      profileUrl,
      status: 'COULD_NOT_VERIFY',
      confidence: 'LOW',
      sources: site.sources,
      evidence: 'LinkedIn requires authenticated login to view member profiles.',
      responseTimeMs: 0,
      timestamp: new Date().toISOString(),
    };
  }

  // Regex format check if platform restricts characters (e.g., no dots)
  if (site.regexCheck) {
    try {
      const reg = new RegExp(site.regexCheck);
      if (!reg.test(cleanUsername)) {
        return {
          platform: site.name,
          category: site.category,
          username: cleanUsername,
          profileUrl,
          status: 'NOT_FOUND',
          confidence: 'CONFIRMED',
          sources: site.sources,
          evidence: `Username format does not match platform syntax rules (${site.regexCheck}).`,
          responseTimeMs: 0,
          timestamp: new Date().toISOString(),
        };
      }
    } catch {
      // ignore regex error
    }
  }

  const reqHeaders: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,application/json;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    ...(site.headers || {}),
  };

  try {
    const res = await safeFetch(probeUrl, {
      timeoutMs: 7000,
      headers: reqHeaders,
    });

    const duration = Date.now() - startTime;
    const statusCode = res.status;
    const finalUrl = res.url || probeUrl;

    // Rate Limiting
    if (statusCode === 429) {
      return {
        platform: site.name,
        category: site.category,
        username: cleanUsername,
        profileUrl,
        status: 'RATE_LIMITED',
        confidence: 'LOW',
        sources: site.sources,
        evidence: 'Rate limit encountered during verification.',
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    // Anti-Bot / CAPTCHA / Login Walls
    if (
      statusCode === 403 ||
      finalUrl.includes('cloudflare') ||
      finalUrl.includes('captcha') ||
      finalUrl.includes('challenge') ||
      (finalUrl.includes('/login') && !profileUrl.includes('/login')) ||
      (site.knownProtection && site.knownProtection.includes('anti_bot') && statusCode >= 400)
    ) {
      return {
        platform: site.name,
        category: site.category,
        username: cleanUsername,
        profileUrl,
        status: 'COULD_NOT_VERIFY',
        confidence: 'LOW',
        sources: site.sources,
        evidence: `${site.name} presented anti-bot challenge or login restriction.`,
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    // HTTP 404 / 410 (explicit not found)
    if (statusCode === 404 || statusCode === 410) {
      return {
        platform: site.name,
        category: site.category,
        username: cleanUsername,
        profileUrl,
        status: 'NOT_FOUND',
        confidence: 'CONFIRMED',
        sources: site.sources,
        evidence: `Platform returned HTTP ${statusCode} (Not Found).`,
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    // JSON API Probes (e.g. GitHub, Reddit, HackerNews, DockerHub, Keybase, Gravatar, Chess.com, Lichess)
    if (site.checkType === 'json_api') {
      try {
        const json = await res.json().catch(() => null);
        if (!json || json.message === 'Not Found' || json.error === 404 || json.error === 'Not Found' || json.code === 100 || (site.id === 'reddit' && json.data?.is_suspended)) {
          return {
            platform: site.name,
            category: site.category,
            username: cleanUsername,
            profileUrl,
            status: 'NOT_FOUND',
            confidence: 'CONFIRMED',
            sources: site.sources,
            evidence: 'API returned empty or 404 Not Found object.',
            responseTimeMs: duration,
            timestamp: new Date().toISOString(),
          };
        }

        // Positive verification
        const hasValidUser =
          json.login ||
          json.id ||
          json.name ||
          json.username ||
          (json.data && json.data.id) ||
          (json.them && json.them.id) ||
          (json.entry && json.entry.length > 0 && json.entry[0].preferredUsername) ||
          (json.player_id && json.username);

        if (hasValidUser) {
          return {
            platform: site.name,
            category: site.category,
            username: cleanUsername,
            profileUrl,
            status: 'FOUND',
            confidence: 'CONFIRMED',
            sources: site.sources,
            evidence: `Verified account object returned from official ${site.name} API.`,
            responseTimeMs: duration,
            timestamp: new Date().toISOString(),
            metadata: {
              avatarUrl: json.avatar_url || json.icon_img || (json.entry && json.entry[0]?.thumbnailUrl),
              bio: json.bio || (json.data && json.data.subreddit?.public_description),
              followers: json.followers,
              publicRepos: json.public_repos,
            },
          };
        }
      } catch {
        // fall through
      }

      return {
        platform: site.name,
        category: site.category,
        username: cleanUsername,
        profileUrl,
        status: 'NOT_FOUND',
        confidence: 'HIGH',
        sources: site.sources,
        evidence: 'API response did not return a valid user object.',
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    // HTML Body Inspection
    const bodyText = await res.text();
    const lowerBody = bodyText.toLowerCase();

    // 1. Check explicit platform errorString
    if (site.errorString && bodyText.includes(site.errorString)) {
      return {
        platform: site.name,
        category: site.category,
        username: cleanUsername,
        profileUrl,
        status: 'NOT_FOUND',
        confidence: 'CONFIRMED',
        sources: site.sources,
        evidence: `Page content matched platform not-found signature ('${site.errorString.slice(0, 35)}...').`,
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    // 2. Check common negative indicators
    for (const pattern of COMMON_NOT_FOUND_PATTERNS) {
      if (lowerBody.includes(pattern)) {
        return {
          platform: site.name,
          category: site.category,
          username: cleanUsername,
          profileUrl,
          status: 'NOT_FOUND',
          confidence: 'CONFIRMED',
          sources: site.sources,
          evidence: `Page content indicated missing account ('${pattern}').`,
          responseTimeMs: duration,
          timestamp: new Date().toISOString(),
        };
      }
    }

    // 3. Check explicit positive matchString
    if (site.matchString && bodyText.includes(site.matchString)) {
      return {
        platform: site.name,
        category: site.category,
        username: cleanUsername,
        profileUrl,
        status: 'FOUND',
        confidence: 'HIGH',
        sources: site.sources,
        evidence: `Verified active account signature matched on ${site.name}.`,
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    // 4. Positive profile validation: Title / OpenGraph meta / Canonical URL matching user handle
    const titleMatch = bodyText.match(/<title>([^<]+)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1].toLowerCase() : '';
    const cleanLower = cleanUsername.toLowerCase();

    const titleHasUser = pageTitle.includes(`@${cleanLower}`) || pageTitle.includes(` ${cleanLower}`) || pageTitle.startsWith(cleanLower);
    const hasProfileMeta = lowerBody.includes('property="og:type" content="profile"') || lowerBody.includes('name="twitter:creator"');
    const hasUserInMeta = lowerBody.includes(`content="@${cleanLower}"`) || lowerBody.includes(`content="${cleanLower}"`);

    if (statusCode === 200 && (titleHasUser || (hasProfileMeta && hasUserInMeta))) {
      return {
        platform: site.name,
        category: site.category,
        username: cleanUsername,
        profileUrl,
        status: 'FOUND',
        confidence: 'HIGH',
        sources: site.sources,
        evidence: `Verified public profile page metadata containing @${cleanUsername}.`,
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    // If HTTP 200 was returned but NO positive proof and NO error text (e.g. generic landing/SPA)
    return {
      platform: site.name,
      category: site.category,
      username: cleanUsername,
      profileUrl,
      status: 'NOT_FOUND',
      confidence: 'MEDIUM',
      sources: site.sources,
      evidence: 'Page returned generic response without verified user evidence.',
      responseTimeMs: duration,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    const duration = Date.now() - startTime;
    const isTimeout = err.name === 'AbortError' || err.message?.includes('timeout');

    return {
      platform: site.name,
      category: site.category,
      username: cleanUsername,
      profileUrl,
      status: isTimeout ? 'TIMEOUT' : 'ERROR',
      confidence: 'LOW',
      sources: site.sources,
      evidence: isTimeout ? 'Target connection timed out after 7s.' : (err.message || 'Network connection failed.'),
      responseTimeMs: duration,
      timestamp: new Date().toISOString(),
    };
  }
}

// Concurrency pool runner
async function runPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index++;
      try {
        const res = await fn(items[current]);
        results[current] = res;
      } catch {
        // Safely handled by executeProbe
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function runUsernameInvestigation(
  rawUsername: string,
  options: { refresh?: boolean; maxSites?: number } = {}
): Promise<UsernameInvestigationSummary> {
  const username = rawUsername.replace(/^@/, '').trim();
  const cacheKey = username.toLowerCase();

  if (!options.refresh) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      console.log(`[UsernameEngine] Returning cached scan for @${username}`);
      return cached.summary;
    }
  }

  const startTime = Date.now();
  console.log(`[UsernameEngine] Initiating verified OSINT investigation for @${username}`);

  const allSites = loadUnifiedSiteRegistry();
  const sitesToScan = options.maxSites ? allSites.slice(0, options.maxSites) : allSites;

  // Run probes with managed concurrency pool of 20
  const probeResults = await runPool(sitesToScan, 20, (site) => executeProbe(site, username));
  const results = probeResults.filter(Boolean);

  // Generate username variants for suggestions
  const variants = generateUsernameVariants(username);

  // Calculate distinct metrics
  let found = 0;
  let notFound = 0;
  let unverified = 0;
  let highConfidence = 0;

  const categories: Record<SiteCategory, { found: number; total: number }> = {
    Social: { found: 0, total: 0 },
    Developer: { found: 0, total: 0 },
    Forums: { found: 0, total: 0 },
    Gaming: { found: 0, total: 0 },
    Media: { found: 0, total: 0 },
    Professional: { found: 0, total: 0 },
    Photography: { found: 0, total: 0 },
    Music: { found: 0, total: 0 },
    Shopping: { found: 0, total: 0 },
    Crypto: { found: 0, total: 0 },
    Education: { found: 0, total: 0 },
    Other: { found: 0, total: 0 },
  };

  for (const r of results) {
    const cat = categories[r.category] || (categories[r.category] = { found: 0, total: 0 });
    cat.total++;

    if (r.status === 'FOUND') {
      found++;
      cat.found++;
      if (r.confidence === 'CONFIRMED' || r.confidence === 'HIGH') {
        highConfidence++;
      }
    } else if (r.status === 'NOT_FOUND') {
      notFound++;
    } else {
      unverified++;
    }
  }

  const durationMs = Date.now() - startTime;
  const summary: UsernameInvestigationSummary = {
    target: username,
    timestamp: new Date().toISOString(),
    durationMs,
    totalChecked: results.length,
    found,
    notFound,
    unverified,
    highConfidence,
    categories,
    results,
    variants,
    sourcesUsed: ['Sherlock', 'Maigret', 'WhatsMyName', 'Direct Probes'],
  };

  cache.set(cacheKey, {
    summary,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return summary;
}
