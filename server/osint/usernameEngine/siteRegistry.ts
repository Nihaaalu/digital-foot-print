import fs from 'fs';
import path from 'path';
import { SiteDefinition, SiteCategory } from './types.js';

function normalizeCategory(rawCat: string = ''): SiteCategory {
  const cat = rawCat.toLowerCase();
  if (cat.includes('social') || cat.includes('messenger') || cat.includes('chat') || cat.includes('network') || cat.includes('dating')) {
    return 'Social';
  }
  if (cat.includes('coding') || cat.includes('code') || cat.includes('dev') || cat.includes('git') || cat.includes('tech') || cat.includes('programming') || cat.includes('package')) {
    return 'Developer';
  }
  if (cat.includes('forum') || cat.includes('community') || cat.includes('discussion') || cat.includes('board') || cat.includes('qa')) {
    return 'Forums';
  }
  if (cat.includes('game') || cat.includes('gaming') || cat.includes('esports') || cat.includes('steam')) {
    return 'Gaming';
  }
  if (cat.includes('video') || cat.includes('stream') || cat.includes('tv') || cat.includes('movie') || cat.includes('entertainment') || cat.includes('media')) {
    return 'Media';
  }
  if (cat.includes('photo') || cat.includes('image') || cat.includes('art') || cat.includes('design') || cat.includes('creative')) {
    return 'Photography';
  }
  if (cat.includes('music') || cat.includes('audio') || cat.includes('podcast') || cat.includes('sound')) {
    return 'Music';
  }
  if (cat.includes('work') || cat.includes('job') || cat.includes('professional') || cat.includes('business') || cat.includes('finance') || cat.includes('career')) {
    return 'Professional';
  }
  if (cat.includes('shop') || cat.includes('store') || cat.includes('buy') || cat.includes('ecommerce')) {
    return 'Shopping';
  }
  if (cat.includes('crypto') || cat.includes('blockchain') || cat.includes('bitcoin')) {
    return 'Crypto';
  }
  if (cat.includes('edu') || cat.includes('learn') || cat.includes('school') || cat.includes('academy') || cat.includes('science')) {
    return 'Education';
  }
  return 'Other';
}

function extractDomainKey(url: string): string {
  try {
    const clean = url.replace(/\{[^}]+\}/g, 'PLACEHOLDER');
    const u = new URL(clean);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return url.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
}

// Built-in curated priority sites with strict verification logic
const CURATED_PRIORITY_SITES: SiteDefinition[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    category: 'Social',
    urlTemplate: 'https://www.instagram.com/{u}/',
    checkType: 'custom',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
    knownProtection: ['anti_bot', 'login_wall'],
  },
  {
    id: 'x_twitter',
    name: 'X (Twitter)',
    category: 'Social',
    urlTemplate: 'https://x.com/{u}',
    checkType: 'custom',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
    knownProtection: ['anti_bot', 'login_wall'],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    category: 'Social',
    urlTemplate: 'https://www.tiktok.com/@{u}',
    checkType: 'custom',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
    knownProtection: ['captcha', 'anti_bot'],
  },
  {
    id: 'bluesky',
    name: 'Bluesky',
    category: 'Social',
    urlTemplate: 'https://bsky.app/profile/{u}',
    checkType: 'custom',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
  },
  {
    id: 'telegram',
    name: 'Telegram',
    category: 'Social',
    urlTemplate: 'https://t.me/{u}',
    checkType: 'custom',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    category: 'Photography',
    urlTemplate: 'https://www.pinterest.com/{u}/',
    checkType: 'custom',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
  },
  {
    id: 'kaggle',
    name: 'Kaggle',
    category: 'Developer',
    urlTemplate: 'https://www.kaggle.com/{u}',
    checkType: 'custom',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
  },
  {
    id: 'spotify',
    name: 'Spotify',
    category: 'Music',
    urlTemplate: 'https://open.spotify.com/user/{u}',
    checkType: 'custom',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
  },
  {
    id: 'twitch',
    name: 'Twitch',
    category: 'Gaming',
    urlTemplate: 'https://www.twitch.tv/{u}',
    checkType: 'custom',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
  },
  {
    id: 'hashnode',
    name: 'Hashnode',
    category: 'Developer',
    urlTemplate: 'https://hashnode.com/@{u}',
    checkType: 'custom',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
  },
  {
    id: 'github',
    name: 'GitHub',
    category: 'Developer',
    urlTemplate: 'https://github.com/{u}',
    probeUrlTemplate: 'https://api.github.com/users/{u}',
    checkType: 'json_api',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
  },
  {
    id: 'reddit',
    name: 'Reddit',
    category: 'Forums',
    urlTemplate: 'https://www.reddit.com/user/{u}',
    probeUrlTemplate: 'https://www.reddit.com/user/{u}/about.json',
    checkType: 'json_api',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
  },
  {
    id: 'hackernews',
    name: 'HackerNews',
    category: 'Forums',
    urlTemplate: 'https://news.ycombinator.com/user?id={u}',
    probeUrlTemplate: 'https://hacker-news.firebaseio.com/v0/user/{u}.json',
    checkType: 'json_api',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName'],
  },
  {
    id: 'dockerhub',
    name: 'Docker Hub',
    category: 'Developer',
    urlTemplate: 'https://hub.docker.com/u/{u}',
    probeUrlTemplate: 'https://hub.docker.com/v2/users/{u}/',
    checkType: 'json_api',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName'],
  },
  {
    id: 'keybase',
    name: 'Keybase',
    category: 'Developer',
    urlTemplate: 'https://keybase.io/{u}',
    probeUrlTemplate: 'https://keybase.io/_/api/1.0/user/lookup.json?username={u}',
    checkType: 'json_api',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName'],
  },
  {
    id: 'gravatar',
    name: 'Gravatar',
    category: 'Social',
    urlTemplate: 'https://gravatar.com/{u}',
    probeUrlTemplate: 'https://en.gravatar.com/{u}.json',
    checkType: 'json_api',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName'],
  },
  {
    id: 'chess_com',
    name: 'Chess.com',
    category: 'Gaming',
    urlTemplate: 'https://www.chess.com/member/{u}',
    probeUrlTemplate: 'https://api.chess.com/pub/player/{u}',
    checkType: 'json_api',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName'],
  },
  {
    id: 'lichess',
    name: 'Lichess',
    category: 'Gaming',
    urlTemplate: 'https://lichess.org/@/{u}',
    probeUrlTemplate: 'https://lichess.org/api/user/{u}',
    checkType: 'json_api',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName'],
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    category: 'Developer',
    urlTemplate: 'https://gitlab.com/{u}',
    checkType: 'body_content',
    errorString: "The page you're looking for could not be found",
    sources: ['Sherlock', 'Maigret', 'WhatsMyName'],
  },
  {
    id: 'codeberg',
    name: 'Codeberg',
    category: 'Developer',
    urlTemplate: 'https://codeberg.org/{u}',
    checkType: 'body_content',
    errorString: 'Page Not Found',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName'],
  },
  {
    id: 'devto',
    name: 'Dev.to',
    category: 'Developer',
    urlTemplate: 'https://dev.to/{u}',
    checkType: 'body_content',
    errorString: 'Page not found',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName'],
  },
  {
    id: 'medium',
    name: 'Medium',
    category: 'Media',
    urlTemplate: 'https://medium.com/@{u}',
    checkType: 'body_content',
    errorString: 'PAGE NOT FOUND',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName'],
  },
  {
    id: 'pypi',
    name: 'PyPI',
    category: 'Developer',
    urlTemplate: 'https://pypi.org/user/{u}/',
    checkType: 'body_content',
    errorString: 'Page not found',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName'],
  },
  {
    id: 'npm',
    name: 'npm',
    category: 'Developer',
    urlTemplate: 'https://www.npmjs.com/~{u}',
    checkType: 'body_content',
    errorString: 'Not found',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName'],
  },
  {
    id: 'steam',
    name: 'Steam',
    category: 'Gaming',
    urlTemplate: 'https://steamcommunity.com/id/{u}',
    checkType: 'body_content',
    errorString: 'The specified profile could not be found',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName'],
  },
  {
    id: 'buymeacoffee',
    name: 'BuyMeACoffee',
    category: 'Other',
    urlTemplate: 'https://www.buymeacoffee.com/{u}',
    checkType: 'body_content',
    errorString: 'This page is no longer available',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName'],
  },
  {
    id: 'wikipedia',
    name: 'Wikipedia',
    category: 'Forums',
    urlTemplate: 'https://en.wikipedia.org/wiki/User:{u}',
    checkType: 'body_content',
    errorString: 'does not have a user page',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName'],
  },
  {
    id: 'behance',
    name: 'Behance',
    category: 'Photography',
    urlTemplate: 'https://www.behance.net/{u}',
    checkType: 'body_content',
    errorString: 'Oops! We can’t seem to find that page.',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName'],
  },
  {
    id: 'dribbble',
    name: 'Dribbble',
    category: 'Photography',
    urlTemplate: 'https://dribbble.com/{u}',
    checkType: 'body_content',
    errorString: 'Whoops, that page is gone.',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName'],
  },
  {
    id: 'soundcloud',
    name: 'SoundCloud',
    category: 'Music',
    urlTemplate: 'https://soundcloud.com/{u}',
    checkType: 'body_content',
    errorString: 'We can’t find that user.',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName'],
  },
  {
    id: 'vimeo',
    name: 'Vimeo',
    category: 'Media',
    urlTemplate: 'https://vimeo.com/{u}',
    checkType: 'body_content',
    errorString: 'Page not found',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName'],
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    category: 'Developer',
    urlTemplate: 'https://huggingface.co/{u}',
    checkType: 'body_content',
    errorString: 'Page not found',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName'],
  },
  {
    id: 'replit',
    name: 'Replit',
    category: 'Developer',
    urlTemplate: 'https://replit.com/@{u}',
    checkType: 'body_content',
    errorString: 'Page not found',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName'],
  },
  {
    id: 'producthunt',
    name: 'Product Hunt',
    category: 'Professional',
    urlTemplate: 'https://www.producthunt.com/@{u}',
    checkType: 'body_content',
    errorString: 'Page Not Found',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName'],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    category: 'Media',
    urlTemplate: 'https://www.youtube.com/@{u}',
    checkType: 'body_content',
    errorString: "This page isn't available",
    sources: ['Sherlock', 'Maigret', 'WhatsMyName'],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    category: 'Professional',
    urlTemplate: 'https://www.linkedin.com/in/{u}',
    checkType: 'custom',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName'],
    knownProtection: ['login_wall', 'auth_required'],
  },
  {
    id: 'linktree',
    name: 'Linktree',
    category: 'Social',
    urlTemplate: 'https://linktr.ee/{u}',
    checkType: 'body_content',
    errorString: 'The page you’re looking for doesn’t exist',
    sources: ['Sherlock', 'Maigret', 'WhatsMyName'],
  },
];

let cachedRegistry: SiteDefinition[] | null = null;

export function loadUnifiedSiteRegistry(): SiteDefinition[] {
  if (cachedRegistry) return cachedRegistry;

  const siteMap = new Map<string, SiteDefinition>();

  // Seed with Curated Priority Sites
  for (const s of CURATED_PRIORITY_SITES) {
    const key = extractDomainKey(s.urlTemplate);
    siteMap.set(key, { ...s });
  }

  const all = Array.from(siteMap.values());
  console.log(`[SiteRegistry] Unified OSINT Registry active with ${all.length} unique deduplicated platforms.`);
  cachedRegistry = all;
  return all;
}
