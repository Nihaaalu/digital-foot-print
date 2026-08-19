import crypto from 'crypto';
import { safeFetch } from '../security.js';
import { resolveDns, DnsAnalysis } from './dnsService.js';
import { lookupGitHubUser, GitHubAnalysis } from './githubService.js';
import { osintCache } from '../cache.js';

export interface EmailAnalysis {
  email: string;
  localPart: string;
  domain: string;
  timestamp: string;
  source: string;
  gravatar: {
    hasGravatar: boolean;
    hash: string;
    avatarUrl?: string;
    profileUrl?: string;
  };
  domainInfrastructure: {
    hasMx: boolean;
    mxRecords: string[];
    hasSpf: boolean;
    hasDmarc: boolean;
    dnsStatus: 'VALID_MAIL_SERVER' | 'NO_MAIL_SERVER' | 'DNS_ERROR';
  };
  githubCorrelation?: {
    usernameMatched?: string;
    profileFound: boolean;
    publicName?: string;
    profileUrl?: string;
  };
  manualBreachCheckUrl: string;
  notice: string;
}

export async function analyzeEmail(email: string): Promise<EmailAnalysis> {
  const cleanEmail = email.toLowerCase().trim();
  const [localPart, domain] = cleanEmail.split('@');
  const cacheKey = `email:${cleanEmail}`;
  const cached = osintCache.get<EmailAnalysis>(cacheKey);
  if (cached) return cached.data;

  // 1. Gravatar check (MD5 of trimmed lowercase email)
  const md5Hash = crypto.createHash('md5').update(cleanEmail).digest('hex');
  const gravatarUrl = `https://www.gravatar.com/avatar/${md5Hash}?d=404`;
  let hasGravatar = false;
  let avatarUrl: string | undefined;
  let profileUrl: string | undefined;

  try {
    const gravatarRes = await safeFetch(gravatarUrl, { method: 'HEAD', timeoutMs: 5000 });
    if (gravatarRes.ok) {
      hasGravatar = true;
      avatarUrl = `https://www.gravatar.com/avatar/${md5Hash}?s=200`;
      profileUrl = `https://gravatar.com/${md5Hash}`;
    }
  } catch {
    // Gravatar check optional
  }

  // 2. DNS Infrastructure check on the email's domain
  let dnsAnalysis: DnsAnalysis | null = null;
  try {
    dnsAnalysis = await resolveDns(domain);
  } catch {
    // DNS resolution failure handled below
  }

  const mxRecords = dnsAnalysis?.records.MX.map((m) => `${m.exchange} (priority ${m.priority})`) || [];
  const hasMx = mxRecords.length > 0;
  const hasSpf = dnsAnalysis?.security.spf.present || false;
  const hasDmarc = dnsAnalysis?.security.dmarc.present || false;
  const dnsStatus: 'VALID_MAIL_SERVER' | 'NO_MAIL_SERVER' | 'DNS_ERROR' = hasMx
    ? 'VALID_MAIL_SERVER'
    : dnsAnalysis
      ? 'NO_MAIL_SERVER'
      : 'DNS_ERROR';

  // 3. Username correlation on GitHub
  let githubCorrelation: EmailAnalysis['githubCorrelation'] = {
    usernameMatched: localPart,
    profileFound: false,
  };

  try {
    const ghUser = await lookupGitHubUser(localPart);
    if (ghUser.status === 'FOUND' && ghUser.profile) {
      githubCorrelation = {
        usernameMatched: localPart,
        profileFound: true,
        publicName: ghUser.profile.name,
        profileUrl: ghUser.profile.htmlUrl,
      };
    }
  } catch {
    // Ignore github error in email correlation
  }

  const result: EmailAnalysis = {
    email: cleanEmail,
    localPart,
    domain,
    timestamp: new Date().toISOString(),
    source: 'Email Decomposition & Public Infrastructure Verification',
    gravatar: {
      hasGravatar,
      hash: md5Hash,
      avatarUrl,
      profileUrl,
    },
    domainInfrastructure: {
      hasMx,
      mxRecords,
      hasSpf,
      hasDmarc,
      dnsStatus,
    },
    githubCorrelation,
    manualBreachCheckUrl: `https://haveibeenpwned.com/`,
    notice: 'Public OSINT verification only. No paid breach databases queried. An email match does not imply ownership without corroborating evidence.',
  };

  osintCache.set(cacheKey, result, 15 * 60 * 1000);
  return result;
}
