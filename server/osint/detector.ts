import net from 'net';

export type TargetType = 'USERNAME' | 'EMAIL' | 'DOMAIN' | 'IPV4' | 'IPV6' | 'URL' | 'PHONE' | 'UNKNOWN';

export interface TargetAnalysis {
  raw: string;
  type: TargetType;
  normalized: string;
  isAmbiguous?: boolean;
  suggestedType?: TargetType;
  details: {
    username?: string;
    domain?: string;
    ip?: string;
    scheme?: string;
    path?: string;
    phoneE164?: string;
  };
}

// Common high-confidence top-level domains that strongly indicate a website/domain
const HIGH_CONFIDENCE_TLDS = new Set([
  'com', 'org', 'net', 'edu', 'gov', 'mil', 'int',
  'io', 'dev', 'ai', 'app', 'co', 'info', 'me', 'xyz',
  'biz', 'online', 'site', 'tech', 'cloud', 'store', 'live',
  'us', 'uk', 'ca', 'de', 'fr', 'au', 'in', 'jp', 'cn', 'ru',
  'br', 'it', 'nl', 'es', 'eu', 'ch', 'se', 'no', 'fi', 'dk',
  'pl', 'cz', 'tv', 'cc', 'sh', 'is', 'pro', 'club', 'top',
  'global', 'network', 'world', 'digital', 'page', 'run', 'social',
]);

export function detectTargetType(input: string, manualType?: string): TargetAnalysis {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  // If the user manually selected a type, enforce it without overriding
  if (manualType && manualType.toUpperCase() !== 'AUTO') {
    const selected = manualType.toUpperCase();

    if (selected === 'URL') {
      let normalizedUrl = trimmed;
      if (!/^https?:\/\//i.test(normalizedUrl)) {
        normalizedUrl = `https://${normalizedUrl}`;
      }
      try {
        const parsed = new URL(normalizedUrl);
        return {
          raw: trimmed,
          type: 'URL',
          normalized: parsed.href,
          details: {
            scheme: parsed.protocol.replace(':', ''),
            domain: parsed.hostname,
            path: parsed.pathname + parsed.search,
          },
        };
      } catch {
        return {
          raw: trimmed,
          type: 'URL',
          normalized: normalizedUrl,
          details: { domain: trimmed },
        };
      }
    }

    if (selected === 'EMAIL') {
      const [username, domain] = trimmed.split('@');
      return {
        raw: trimmed,
        type: 'EMAIL',
        normalized: lower,
        details: {
          username: username || trimmed,
          domain: domain ? domain.toLowerCase() : '',
        },
      };
    }

    if (selected === 'DOMAIN') {
      const cleanDomain = lower.replace(/^https?:\/\//, '').split('/')[0];
      return {
        raw: trimmed,
        type: 'DOMAIN',
        normalized: cleanDomain,
        details: { domain: cleanDomain },
      };
    }

    if (selected === 'IP' || selected === 'IPV4' || selected === 'IPV6') {
      const isV6 = net.isIPv6(trimmed);
      return {
        raw: trimmed,
        type: isV6 ? 'IPV6' : 'IPV4',
        normalized: trimmed,
        details: { ip: trimmed },
      };
    }

    if (selected === 'USERNAME') {
      return {
        raw: trimmed,
        type: 'USERNAME',
        normalized: trimmed,
        details: { username: trimmed },
      };
    }
  }

  // Deterministic priority in AUTO mode:
  // 1. URL
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return {
        raw: trimmed,
        type: 'URL',
        normalized: parsed.href,
        details: {
          scheme: parsed.protocol.replace(':', ''),
          domain: parsed.hostname,
          path: parsed.pathname + parsed.search,
        },
      };
    } catch {
      // Fall through if invalid URL
    }
  }

  // 2. Email
  const emailRegex = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/;
  const emailMatch = trimmed.match(emailRegex);
  if (emailMatch) {
    const [username, domain] = trimmed.split('@');
    return {
      raw: trimmed,
      type: 'EMAIL',
      normalized: lower,
      details: {
        username,
        domain: domain.toLowerCase(),
      },
    };
  }

  // 3. IP address (IPv4 or IPv6)
  if (net.isIPv4(trimmed)) {
    return {
      raw: trimmed,
      type: 'IPV4',
      normalized: trimmed,
      details: { ip: trimmed },
    };
  }

  if (net.isIPv6(trimmed)) {
    return {
      raw: trimmed,
      type: 'IPV6',
      normalized: lower,
      details: { ip: lower },
    };
  }

  // 4. Domain vs Username resolution
  // Check if string has invalid domain characters (like underscore, spaces, slashes)
  const hasUnderscore = trimmed.includes('_');
  const hasSpaceOrSlash = trimmed.includes(' ') || trimmed.includes('/');

  if (!hasSpaceOrSlash && !hasUnderscore && trimmed.includes('.')) {
    const parts = lower.split('.');
    const tld = parts[parts.length - 1];

    // Subdomains like api.example.com, www.google.com, sub.domain.org
    const isMultiPartSubdomain = parts.length >= 3 && parts.every((p) => /^[a-z0-9-]+$/.test(p)) && HIGH_CONFIDENCE_TLDS.has(tld);
    const startsWithWww = lower.startsWith('www.');
    const isStandardDomain = parts.length === 2 && HIGH_CONFIDENCE_TLDS.has(tld) && /^[a-z0-9-]+$/.test(parts[0]);

    // Known personal name / generic word patterns with dots that should be USERNAME (e.g. f1.nihal, john.doe, admin.user, nih.al)
    // If it is 2 parts and the TLD is NOT a high confidence TLD (or it's an ambiguous ccTLD on a personal name like nih.al), classify as USERNAME
    if (startsWithWww || isMultiPartSubdomain) {
      return {
        raw: trimmed,
        type: 'DOMAIN',
        normalized: lower,
        details: { domain: lower },
      };
    }

    if (isStandardDomain) {
      // If TLD is standard (like .com, .org, .net, .io, .ai, .dev, .gov, .edu), treat as DOMAIN
      // Examples: example.com, google.com, github.io, openai.com
      return {
        raw: trimmed,
        type: 'DOMAIN',
        normalized: lower,
        details: { domain: lower },
      };
    }
  }

  // 5. Username detection (letters, numbers, underscore, hyphen, dot)
  // Matches: f1.nihal, john.doe, admin.user, user.name.123, nih.al, test.user, user_01, john-doe, user123
  const usernameRegex = /^[a-zA-Z0-9._-]{1,60}$/;
  if (usernameRegex.test(trimmed)) {
    const isDotted = trimmed.includes('.');
    return {
      raw: trimmed,
      type: 'USERNAME',
      normalized: trimmed,
      isAmbiguous: isDotted,
      suggestedType: 'USERNAME',
      details: { username: trimmed },
    };
  }

  // Fallback Phone number
  const phoneDigits = trimmed.replace(/[\s\-\(\)\.]/g, '');
  if (/^\+?[1-9]\d{6,14}$/.test(phoneDigits)) {
    return {
      raw: trimmed,
      type: 'PHONE',
      normalized: phoneDigits.startsWith('+') ? phoneDigits : `+${phoneDigits}`,
      details: { phoneE164: phoneDigits },
    };
  }

  return {
    raw: trimmed,
    type: 'UNKNOWN',
    normalized: trimmed,
    details: {},
  };
}
