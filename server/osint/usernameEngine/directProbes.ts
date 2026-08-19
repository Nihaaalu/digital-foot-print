import { safeFetch } from '../../security.js';
import { DiscoveredAccountFinding, UsernameProbeStatus, ConfidenceLevel } from './types.js';

const STANDARD_BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

// 1. Instagram
export async function probeInstagram(username: string): Promise<DiscoveredAccountFinding> {
  const profileUrl = `https://www.instagram.com/${encodeURIComponent(username)}/`;
  const startTime = Date.now();

  try {
    const res = await safeFetch(profileUrl, {
      timeoutMs: 8000,
      headers: STANDARD_BROWSER_HEADERS,
    });

    const duration = Date.now() - startTime;
    const finalUrl = res.url || profileUrl;

    if (
      res.status === 403 ||
      res.status === 429 ||
      finalUrl.includes('/accounts/login') ||
      finalUrl.includes('/challenge/') ||
      finalUrl.includes('/two_factor')
    ) {
      return {
        platform: 'Instagram',
        category: 'Social',
        username,
        profileUrl,
        status: 'COULD_NOT_VERIFY',
        confidence: 'LOW',
        sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
        evidence: 'Instagram prevented automated verification (anti-bot protection or login wall challenge).',
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    if (res.status === 404) {
      return {
        platform: 'Instagram',
        category: 'Social',
        username,
        profileUrl,
        status: 'NOT_FOUND',
        confidence: 'CONFIRMED',
        evidence: 'Instagram returned HTTP 404 (Page Not Found).',
        responseTimeMs: duration,
        sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
        timestamp: new Date().toISOString(),
      };
    }

    const html = await res.text();

    if (
      html.includes("Sorry, this page isn't available") ||
      html.includes('The link you followed may be broken') ||
      html.includes('Page Not Found • Instagram')
    ) {
      return {
        platform: 'Instagram',
        category: 'Social',
        username,
        profileUrl,
        status: 'NOT_FOUND',
        confidence: 'CONFIRMED',
        evidence: 'Instagram page indicated profile does not exist.',
        responseTimeMs: duration,
        sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
        timestamp: new Date().toISOString(),
      };
    }

    const isProfileTitle = html.includes(`(@${username})`) || html.includes(`(@${username.toLowerCase()})`);
    const hasMetaProfile = html.includes('og:type" content="profile"') || html.includes('instapp:owner_user_id');

    if (res.status === 200 && (isProfileTitle || hasMetaProfile)) {
      return {
        platform: 'Instagram',
        category: 'Social',
        username,
        profileUrl,
        status: 'FOUND',
        confidence: 'HIGH',
        sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
        evidence: `Confirmed active Instagram public profile for @${username}.`,
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      platform: 'Instagram',
      category: 'Social',
      username,
      profileUrl,
      status: 'COULD_NOT_VERIFY',
      confidence: 'LOW',
      sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
      evidence: 'Instagram did not provide enough verifiable public metadata without login.',
      responseTimeMs: duration,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    const duration = Date.now() - startTime;
    const isTimeout = err.name === 'AbortError' || err.message?.includes('timeout');
    return {
      platform: 'Instagram',
      category: 'Social',
      username,
      profileUrl,
      status: isTimeout ? 'TIMEOUT' : 'COULD_NOT_VERIFY',
      confidence: 'LOW',
      sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
      evidence: isTimeout ? 'Request timed out.' : (err.message || 'Instagram connection could not complete.'),
      responseTimeMs: duration,
      timestamp: new Date().toISOString(),
    };
  }
}

// 2. X / Twitter
export async function probeXTwitter(username: string): Promise<DiscoveredAccountFinding> {
  const profileUrl = `https://x.com/${encodeURIComponent(username)}`;
  const startTime = Date.now();

  try {
    const res = await safeFetch(profileUrl, {
      timeoutMs: 8000,
      headers: STANDARD_BROWSER_HEADERS,
    });

    const duration = Date.now() - startTime;
    const finalUrl = res.url || profileUrl;

    if (res.status === 404) {
      return {
        platform: 'X (Twitter)',
        category: 'Social',
        username,
        profileUrl,
        status: 'NOT_FOUND',
        confidence: 'CONFIRMED',
        sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
        evidence: 'HTTP 404 response from X/Twitter.',
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    if (res.status === 403 || res.status === 429 || finalUrl.includes('/login') || finalUrl.includes('/i/flow/login')) {
      return {
        platform: 'X (Twitter)',
        category: 'Social',
        username,
        profileUrl,
        status: 'COULD_NOT_VERIFY',
        confidence: 'LOW',
        sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
        evidence: 'X (Twitter) requires authentication or blocked automated lookup.',
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    const text = await res.text();
    if (text.includes("This account doesn’t exist") || text.includes('Account suspended')) {
      return {
        platform: 'X (Twitter)',
        category: 'Social',
        username,
        profileUrl,
        status: 'NOT_FOUND',
        confidence: 'CONFIRMED',
        sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
        evidence: 'X profile explicitly indicates non-existence or suspension.',
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    if (res.status === 200 && text.includes(`@${username}`)) {
      return {
        platform: 'X (Twitter)',
        category: 'Social',
        username,
        profileUrl,
        status: 'FOUND',
        confidence: 'HIGH',
        sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
        evidence: `Public profile found on X for @${username}.`,
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      platform: 'X (Twitter)',
      category: 'Social',
      username,
      profileUrl,
      status: 'COULD_NOT_VERIFY',
      confidence: 'LOW',
      sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
      evidence: 'X/Twitter did not provide enough public data to confirm without login.',
      responseTimeMs: duration,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError' || err.message?.includes('timeout');
    return {
      platform: 'X (Twitter)',
      category: 'Social',
      username,
      profileUrl,
      status: isTimeout ? 'TIMEOUT' : 'COULD_NOT_VERIFY',
      confidence: 'LOW',
      sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
      evidence: isTimeout ? 'Request timed out.' : (err.message || 'X (Twitter) automated check could not complete.'),
      responseTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

// 3. TikTok
export async function probeTikTok(username: string): Promise<DiscoveredAccountFinding> {
  const profileUrl = `https://www.tiktok.com/@${encodeURIComponent(username)}`;
  const startTime = Date.now();

  try {
    const res = await safeFetch(profileUrl, {
      timeoutMs: 8000,
      headers: STANDARD_BROWSER_HEADERS,
    });

    const duration = Date.now() - startTime;
    const finalUrl = res.url || profileUrl;

    if (res.status === 404) {
      return {
        platform: 'TikTok',
        category: 'Social',
        username,
        profileUrl,
        status: 'NOT_FOUND',
        confidence: 'CONFIRMED',
        sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
        evidence: 'TikTok returned HTTP 404.',
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    if (res.status === 403 || res.status === 429 || finalUrl.includes('/login') || finalUrl.includes('captcha')) {
      return {
        platform: 'TikTok',
        category: 'Social',
        username,
        profileUrl,
        status: 'COULD_NOT_VERIFY',
        confidence: 'LOW',
        sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
        evidence: 'TikTok presented anti-bot challenge or login restriction.',
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    const html = await res.text();
    if (html.includes("Couldn't find this account") || html.includes('"statusCode":10221') || html.includes('"statusCode":10222')) {
      return {
        platform: 'TikTok',
        category: 'Social',
        username,
        profileUrl,
        status: 'NOT_FOUND',
        confidence: 'HIGH',
        sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
        evidence: "TikTok page indicates 'Couldn't find this account'.",
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    // Verify positive uniqueId in rehydration data
    if (html.includes(`"uniqueId":"${username}"`) || html.includes(`"uniqueId":"${username.toLowerCase()}"`)) {
      return {
        platform: 'TikTok',
        category: 'Social',
        username,
        profileUrl,
        status: 'FOUND',
        confidence: 'HIGH',
        sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
        evidence: `Verified active TikTok creator profile for @${username}.`,
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      platform: 'TikTok',
      category: 'Social',
      username,
      profileUrl,
      status: 'COULD_NOT_VERIFY',
      confidence: 'LOW',
      sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
      evidence: 'TikTok response did not contain verifiable public profile data.',
      responseTimeMs: duration,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError' || err.message?.includes('timeout');
    return {
      platform: 'TikTok',
      category: 'Social',
      username,
      profileUrl,
      status: isTimeout ? 'TIMEOUT' : 'COULD_NOT_VERIFY',
      confidence: 'LOW',
      sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
      evidence: isTimeout ? 'Request timed out.' : (err.message || 'TikTok probe could not complete.'),
      responseTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

// 4. Bluesky (Public XRPC API)
export async function probeBluesky(username: string): Promise<DiscoveredAccountFinding> {
  const clean = username.trim().toLowerCase();
  const handle = clean.includes('.') ? clean : `${clean}.bsky.social`;
  const apiUrl = `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`;
  const profileUrl = `https://bsky.app/profile/${encodeURIComponent(handle)}`;
  const startTime = Date.now();

  try {
    const res = await safeFetch(apiUrl, { timeoutMs: 6000 });
    const duration = Date.now() - startTime;

    if (res.status === 400 || res.status === 404) {
      return {
        platform: 'Bluesky',
        category: 'Social',
        username,
        profileUrl,
        status: 'NOT_FOUND',
        confidence: 'CONFIRMED',
        sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
        evidence: 'Bluesky XRPC API confirmed actor account does not exist.',
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    if (res.ok) {
      const json: any = await res.json().catch(() => null);
      if (json && json.did && json.handle) {
        return {
          platform: 'Bluesky',
          category: 'Social',
          username,
          profileUrl,
          status: 'FOUND',
          confidence: 'CONFIRMED',
          sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
          evidence: `Verified Bluesky DID (${json.did}) and handle @${json.handle}.`,
          responseTimeMs: duration,
          timestamp: new Date().toISOString(),
          metadata: {
            displayName: json.displayName,
            bio: json.description,
            followers: json.followersCount,
            avatarUrl: json.avatar,
          },
        };
      }
    }

    return {
      platform: 'Bluesky',
      category: 'Social',
      username,
      profileUrl,
      status: 'NOT_FOUND',
      confidence: 'HIGH',
      sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
      evidence: 'Bluesky API returned empty profile.',
      responseTimeMs: duration,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError' || err.message?.includes('timeout');
    return {
      platform: 'Bluesky',
      category: 'Social',
      username,
      profileUrl,
      status: isTimeout ? 'TIMEOUT' : 'ERROR',
      confidence: 'LOW',
      sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
      evidence: err.message || 'Bluesky check failed.',
      responseTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

// 5. Telegram
export async function probeTelegram(username: string): Promise<DiscoveredAccountFinding> {
  const profileUrl = `https://t.me/${encodeURIComponent(username)}`;
  const startTime = Date.now();

  try {
    const res = await safeFetch(profileUrl, {
      timeoutMs: 6000,
      headers: STANDARD_BROWSER_HEADERS,
    });

    const duration = Date.now() - startTime;
    const html = await res.text();

    // Telegram returns 200 for missing profiles, with a generic "If you have Telegram, you can contact @..." message
    // BUT missing user pages DO NOT have the user title <div class="tgme_page_title"> or have an empty title
    const hasUserExtra = html.includes(`class="tgme_page_extra">@${username}`) || html.includes(`class="tgme_page_extra">@${username.toLowerCase()}`);
    const hasActiveTitle = html.includes('class="tgme_page_title"') && !html.includes('<div class="tgme_page_title"><!---->');
    const isChannelOrUser = html.includes('class="tgme_action_button_new"') || html.includes('tgme_page_photo');

    if (hasUserExtra && hasActiveTitle && isChannelOrUser) {
      return {
        platform: 'Telegram',
        category: 'Social',
        username,
        profileUrl,
        status: 'FOUND',
        confidence: 'HIGH',
        sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
        evidence: `Verified active public Telegram user/channel @${username}.`,
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      platform: 'Telegram',
      category: 'Social',
      username,
      profileUrl,
      status: 'NOT_FOUND',
      confidence: 'HIGH',
      sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
      evidence: 'No active Telegram user or channel found under this handle.',
      responseTimeMs: duration,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError' || err.message?.includes('timeout');
    return {
      platform: 'Telegram',
      category: 'Social',
      username,
      profileUrl,
      status: isTimeout ? 'TIMEOUT' : 'ERROR',
      confidence: 'LOW',
      sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
      evidence: err.message || 'Telegram probe failed.',
      responseTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

// 6. Pinterest
export async function probePinterest(username: string): Promise<DiscoveredAccountFinding> {
  const profileUrl = `https://www.pinterest.com/${encodeURIComponent(username)}/`;
  const startTime = Date.now();

  try {
    const res = await safeFetch(profileUrl, {
      timeoutMs: 7000,
      headers: STANDARD_BROWSER_HEADERS,
    });

    const duration = Date.now() - startTime;
    if (res.status === 404) {
      return {
        platform: 'Pinterest',
        category: 'Photography',
        username,
        profileUrl,
        status: 'NOT_FOUND',
        confidence: 'CONFIRMED',
        sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
        evidence: 'Pinterest returned HTTP 404.',
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    const html = await res.text();
    if (html.includes('User not found') || html.includes("Sorry, we couldn't find that page") || html.includes('"is_profile_missing":true')) {
      return {
        platform: 'Pinterest',
        category: 'Photography',
        username,
        profileUrl,
        status: 'NOT_FOUND',
        confidence: 'CONFIRMED',
        sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
        evidence: 'Pinterest returned page indicating user does not exist.',
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    // Inspect user object in JSON state
    if (
      html.includes(`"username":"${username}"`) ||
      html.includes(`"username":"${username.toLowerCase()}"`) ||
      html.includes(`pinterest.com/${username.toLowerCase()}/`)
    ) {
      return {
        platform: 'Pinterest',
        category: 'Photography',
        username,
        profileUrl,
        status: 'FOUND',
        confidence: 'HIGH',
        sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
        evidence: `Verified active Pinterest profile for @${username}.`,
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      platform: 'Pinterest',
      category: 'Photography',
      username,
      profileUrl,
      status: 'NOT_FOUND',
      confidence: 'HIGH',
      sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
      evidence: 'Pinterest SPA returned generic shell without user profile data.',
      responseTimeMs: duration,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError' || err.message?.includes('timeout');
    return {
      platform: 'Pinterest',
      category: 'Photography',
      username,
      profileUrl,
      status: isTimeout ? 'TIMEOUT' : 'ERROR',
      confidence: 'LOW',
      sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
      evidence: err.message || 'Pinterest check failed.',
      responseTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

// 7. Kaggle
export async function probeKaggle(username: string): Promise<DiscoveredAccountFinding> {
  const profileUrl = `https://www.kaggle.com/${encodeURIComponent(username)}`;
  const startTime = Date.now();

  try {
    const res = await safeFetch(profileUrl, {
      timeoutMs: 7000,
      headers: STANDARD_BROWSER_HEADERS,
    });

    const duration = Date.now() - startTime;
    if (res.status === 404) {
      return {
        platform: 'Kaggle',
        category: 'Developer',
        username,
        profileUrl,
        status: 'NOT_FOUND',
        confidence: 'CONFIRMED',
        sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
        evidence: 'Kaggle returned HTTP 404.',
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    const html = await res.text();
    if (html.includes('Page Not Found') || html.includes('User not found') || html.includes('"isNotFound":true')) {
      return {
        platform: 'Kaggle',
        category: 'Developer',
        username,
        profileUrl,
        status: 'NOT_FOUND',
        confidence: 'CONFIRMED',
        sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
        evidence: "Kaggle returned 'Page Not Found'.",
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    if (
      html.includes(`"userName":"${username}"`) ||
      html.includes(`"userName":"${username.toLowerCase()}"`) ||
      (html.includes('"userId":') && html.includes(`"userUrl":"/${username}`))
    ) {
      return {
        platform: 'Kaggle',
        category: 'Developer',
        username,
        profileUrl,
        status: 'FOUND',
        confidence: 'HIGH',
        sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
        evidence: `Verified Kaggle profile data for @${username}.`,
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      platform: 'Kaggle',
      category: 'Developer',
      username,
      profileUrl,
      status: 'NOT_FOUND',
      confidence: 'HIGH',
      sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
      evidence: 'No user record found on Kaggle.',
      responseTimeMs: duration,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError' || err.message?.includes('timeout');
    return {
      platform: 'Kaggle',
      category: 'Developer',
      username,
      profileUrl,
      status: isTimeout ? 'TIMEOUT' : 'ERROR',
      confidence: 'LOW',
      sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
      evidence: err.message || 'Kaggle check failed.',
      responseTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

// 8. Spotify
export async function probeSpotify(username: string): Promise<DiscoveredAccountFinding> {
  const profileUrl = `https://open.spotify.com/user/${encodeURIComponent(username)}`;
  const startTime = Date.now();

  try {
    const res = await safeFetch(profileUrl, {
      timeoutMs: 6000,
      headers: STANDARD_BROWSER_HEADERS,
    });

    const duration = Date.now() - startTime;
    if (res.status === 404) {
      return {
        platform: 'Spotify',
        category: 'Music',
        username,
        profileUrl,
        status: 'NOT_FOUND',
        confidence: 'CONFIRMED',
        sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
        evidence: 'Spotify returned HTTP 404 Not Found.',
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    const html = await res.text();
    const hasProfileMeta = html.includes('property="og:type" content="profile"') || html.includes('property="og:type" content="music.playlist"');
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : '';

    if (hasProfileMeta && !title.startsWith('Spotify') && !title.includes('Page not found')) {
      return {
        platform: 'Spotify',
        category: 'Music',
        username,
        profileUrl,
        status: 'FOUND',
        confidence: 'HIGH',
        sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
        evidence: `Verified public Spotify user profile '${title}'.`,
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      platform: 'Spotify',
      category: 'Music',
      username,
      profileUrl,
      status: 'NOT_FOUND',
      confidence: 'HIGH',
      sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
      evidence: 'No Spotify profile found for this username.',
      responseTimeMs: duration,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError' || err.message?.includes('timeout');
    return {
      platform: 'Spotify',
      category: 'Music',
      username,
      profileUrl,
      status: isTimeout ? 'TIMEOUT' : 'ERROR',
      confidence: 'LOW',
      sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
      evidence: err.message || 'Spotify probe failed.',
      responseTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

// 9. Twitch
export async function probeTwitch(username: string): Promise<DiscoveredAccountFinding> {
  const profileUrl = `https://www.twitch.tv/${encodeURIComponent(username)}`;
  const startTime = Date.now();

  try {
    const res = await safeFetch(profileUrl, {
      timeoutMs: 6000,
      headers: STANDARD_BROWSER_HEADERS,
    });

    const duration = Date.now() - startTime;
    if (res.status === 404) {
      return {
        platform: 'Twitch',
        category: 'Gaming',
        username,
        profileUrl,
        status: 'NOT_FOUND',
        confidence: 'CONFIRMED',
        sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
        evidence: 'Twitch returned HTTP 404.',
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    const html = await res.text();
    // Twitch SPA checks
    if (html.includes('"isChannel":false') || html.includes('content="Twitch is the world\'s leading live streaming"')) {
      return {
        platform: 'Twitch',
        category: 'Gaming',
        username,
        profileUrl,
        status: 'NOT_FOUND',
        confidence: 'HIGH',
        sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
        evidence: 'Twitch returned default landing page (channel does not exist).',
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    if (
      (html.includes(`"login":"${username}"`) || html.includes(`"login":"${username.toLowerCase()}"`)) &&
      !html.includes('"isChannel":false')
    ) {
      return {
        platform: 'Twitch',
        category: 'Gaming',
        username,
        profileUrl,
        status: 'FOUND',
        confidence: 'HIGH',
        sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
        evidence: `Verified active Twitch streamer profile for @${username}.`,
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      platform: 'Twitch',
      category: 'Gaming',
      username,
      profileUrl,
      status: 'NOT_FOUND',
      confidence: 'HIGH',
      sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
      evidence: 'No active channel found on Twitch.',
      responseTimeMs: duration,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError' || err.message?.includes('timeout');
    return {
      platform: 'Twitch',
      category: 'Gaming',
      username,
      profileUrl,
      status: isTimeout ? 'TIMEOUT' : 'ERROR',
      confidence: 'LOW',
      sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
      evidence: err.message || 'Twitch probe failed.',
      responseTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

// 10. Hashnode
export async function probeHashnode(username: string): Promise<DiscoveredAccountFinding> {
  const profileUrl = `https://hashnode.com/@${encodeURIComponent(username)}`;
  const startTime = Date.now();

  try {
    const res = await safeFetch(profileUrl, {
      timeoutMs: 6000,
      headers: STANDARD_BROWSER_HEADERS,
    });

    const duration = Date.now() - startTime;
    if (res.status === 404) {
      return {
        platform: 'Hashnode',
        category: 'Developer',
        username,
        profileUrl,
        status: 'NOT_FOUND',
        confidence: 'CONFIRMED',
        sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
        evidence: 'Hashnode returned HTTP 404.',
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    const html = await res.text();
    if (html.includes('userNotFound":true') || html.includes('User not found') || html.includes('404 - Page Not Found')) {
      return {
        platform: 'Hashnode',
        category: 'Developer',
        username,
        profileUrl,
        status: 'NOT_FOUND',
        confidence: 'CONFIRMED',
        sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
        evidence: "Hashnode indicated 'User not found'.",
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    if (html.includes(`"username":"${username}"`) || html.includes(`"username":"${username.toLowerCase()}"`)) {
      return {
        platform: 'Hashnode',
        category: 'Developer',
        username,
        profileUrl,
        status: 'FOUND',
        confidence: 'HIGH',
        sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
        evidence: `Verified active Hashnode developer blog for @${username}.`,
        responseTimeMs: duration,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      platform: 'Hashnode',
      category: 'Developer',
      username,
      profileUrl,
      status: 'NOT_FOUND',
      confidence: 'HIGH',
      sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
      evidence: 'No active Hashnode profile found.',
      responseTimeMs: duration,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError' || err.message?.includes('timeout');
    return {
      platform: 'Hashnode',
      category: 'Developer',
      username,
      profileUrl,
      status: isTimeout ? 'TIMEOUT' : 'ERROR',
      confidence: 'LOW',
      sources: ['Sherlock', 'Maigret', 'WhatsMyName', 'DirectProbe'],
      evidence: err.message || 'Hashnode check failed.',
      responseTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}
