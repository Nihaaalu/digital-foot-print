export interface ExposureFactor {
  name: string;
  category: 'Identity' | 'Infrastructure' | 'Security Configuration' | 'Code & Repositories' | 'Historical Archive' | 'Reputation';
  impact: 'POSITIVE' | 'NEUTRAL' | 'WARNING' | 'CRITICAL';
  points: number;
  description: string;
  evidence: string;
}

export interface ExposureScoreResult {
  score: number; // 0-100
  rating: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'VERY_HIGH';
  ratingLabel: string;
  disclaimer: string;
  summary: string;
  factors: ExposureFactor[];
}

export function calculateExposureScore(results: any): ExposureScoreResult {
  const factors: ExposureFactor[] = [];
  let baseScore = 0;

  // 1. Identity & Social Footprint
  const profilesCount = results.usernameProbe?.totalFound || 0;
  if (profilesCount > 0) {
    const points = Math.min(25, profilesCount * 4);
    baseScore += points;
    factors.push({
      name: 'Public Social Profiles',
      category: 'Identity',
      impact: profilesCount > 5 ? 'WARNING' : 'NEUTRAL',
      points,
      description: `${profilesCount} active public profile(s) discovered across indexed platforms`,
      evidence: `Found on platforms: ${(results.usernameProbe?.accounts || [])
        .filter((a: any) => a.status === 'FOUND')
        .map((a: any) => a.platform)
        .join(', ')}`,
    });
  }

  // 2. Public Email Exposure
  const gh = results.github;
  const commitEmails = gh?.publicEventsSummary?.associatedEmails || [];
  const publicEmail = gh?.profile?.email;
  if (publicEmail || commitEmails.length > 0) {
    const points = 15;
    baseScore += points;
    factors.push({
      name: 'Exposed Public Email in Repos/Profiles',
      category: 'Identity',
      impact: 'WARNING',
      points,
      description: 'Email addresses are directly exposed in public GitHub profile or unmasked Git commit logs',
      evidence: `Exposed email(s): ${[publicEmail, ...commitEmails].filter(Boolean).join(', ')}`,
    });
  }

  // 3. Public Repositories & Activity
  const reposCount = gh?.repositories?.length || 0;
  if (reposCount > 0) {
    const points = Math.min(15, reposCount * 2);
    baseScore += points;
    factors.push({
      name: 'Public Code Repositories',
      category: 'Code & Repositories',
      impact: 'NEUTRAL',
      points,
      description: `${reposCount} public source code repositories accessible without authentication`,
      evidence: `Public repositories on GitHub: ${reposCount}`,
    });
  }

  // 4. Subdomain Sprawl via Certificate Transparency
  const subdomainsCount = results.crtsh?.uniqueSubdomainsCount || 0;
  if (subdomainsCount > 0) {
    const points = Math.min(20, Math.floor(subdomainsCount * 1.5));
    baseScore += points;
    factors.push({
      name: 'Subdomain Surface via Certificate Transparency',
      category: 'Infrastructure',
      impact: subdomainsCount > 10 ? 'WARNING' : 'NEUTRAL',
      points,
      description: `${subdomainsCount} unique hostnames registered in public CT logs (crt.sh)`,
      evidence: `Discovered subdomains count: ${subdomainsCount}`,
    });
  }

  // 5. DNS Email Security Configuration (SPF / DMARC)
  const dns = results.dns;
  if (dns?.domain) {
    if (!dns.security.spf.present) {
      baseScore += 10;
      factors.push({
        name: 'Missing SPF Email Record',
        category: 'Security Configuration',
        impact: 'WARNING',
        points: 10,
        description: 'Domain lacks an SPF (Sender Policy Framework) TXT record, allowing potential email spoofing',
        evidence: 'No v=spf1 TXT record found in authoritative DNS',
      });
    } else {
      factors.push({
        name: 'SPF Record Configured',
        category: 'Security Configuration',
        impact: 'POSITIVE',
        points: 0,
        description: 'Domain enforces SPF policy to restrict unauthorized mail senders',
        evidence: dns.security.spf.raw || 'v=spf1 present',
      });
    }

    if (!dns.security.dmarc.present) {
      baseScore += 10;
      factors.push({
        name: 'Missing DMARC Policy',
        category: 'Security Configuration',
        impact: 'WARNING',
        points: 10,
        description: 'Domain lacks a DMARC policy for email authentication alignment and reporting',
        evidence: `No TXT record found at _dmarc.${dns.domain}`,
      });
    } else {
      factors.push({
        name: 'DMARC Policy Active',
        category: 'Security Configuration',
        impact: 'POSITIVE',
        points: 0,
        description: `DMARC policy '${dns.security.dmarc.policy}' is published`,
        evidence: dns.security.dmarc.raw || 'v=dmarc1 present',
      });
    }
  }

  // 6. Security Headers Check
  const http = results.passiveHttp;
  if (http?.securityHeaders) {
    const sec = http.securityHeaders;
    if (!sec.hsts.present) {
      baseScore += 8;
      factors.push({
        name: 'Missing HSTS Header',
        category: 'Security Configuration',
        impact: 'WARNING',
        points: 8,
        description: 'HTTP Strict Transport Security is not enforced on web server headers',
        evidence: 'Strict-Transport-Security header omitted',
      });
    }
    if (!sec.csp.present) {
      baseScore += 7;
      factors.push({
        name: 'Missing Content Security Policy (CSP)',
        category: 'Security Configuration',
        impact: 'WARNING',
        points: 7,
        description: 'No Content-Security-Policy header defined to restrict script execution',
        evidence: 'Content-Security-Policy header omitted',
      });
    }
  }

  // 7. Abuse & Reputation Flags
  const abuse = results.abuseipdb;
  if (abuse?.status === 'FOUND' && abuse.data?.abuseConfidenceScore > 0) {
    const abusePoints = Math.min(30, Math.round(abuse.data.abuseConfidenceScore * 0.3));
    baseScore += abusePoints;
    factors.push({
      name: 'AbuseIPDB Threat Reports',
      category: 'Reputation',
      impact: abuse.data.abuseConfidenceScore > 25 ? 'CRITICAL' : 'WARNING',
      points: abusePoints,
      description: `IP has an Abuse Confidence Score of ${abuse.data.abuseConfidenceScore}% with ${abuse.data.totalReports} reports`,
      evidence: `Abuse confidence score: ${abuse.data.abuseConfidenceScore}%, Total reports: ${abuse.data.totalReports}`,
    });
  }

  // 8. Historical Wayback Machine Presence
  const wayback = results.wayback;
  if (wayback?.status === 'FOUND' && wayback.data?.totalSnapshotsCount > 0) {
    const points = 5;
    baseScore += points;
    factors.push({
      name: 'Historical Internet Archive Snapshots',
      category: 'Historical Archive',
      impact: 'NEUTRAL',
      points,
      description: `${wayback.data.totalSnapshotsCount} archived historical snapshots since ${wayback.data.firstSnapshotDate || 'early index'}`,
      evidence: `First snapshot: ${wayback.data.firstSnapshotDate}, Latest: ${wayback.data.latestSnapshotDate}`,
    });
  }

  // Clamp score between 0 and 100
  const finalScore = Math.min(100, Math.max(5, baseScore));

  let rating: ExposureScoreResult['rating'] = 'LOW';
  let ratingLabel = '0-20 Low Exposure';

  if (finalScore > 80) {
    rating = 'VERY_HIGH';
    ratingLabel = '81-100 Very High Exposure';
  } else if (finalScore > 60) {
    rating = 'HIGH';
    ratingLabel = '61-80 High Exposure';
  } else if (finalScore > 40) {
    rating = 'ELEVATED';
    ratingLabel = '41-60 Elevated Exposure';
  } else if (finalScore > 20) {
    rating = 'MODERATE';
    ratingLabel = '21-40 Moderate Exposure';
  }

  return {
    score: finalScore,
    rating,
    ratingLabel,
    disclaimer: 'Application-generated heuristic score based on passive public OSINT visibility and configuration signals. It is NOT a standardized cybersecurity risk rating.',
    summary: `Digital footprint exposure index calculated at ${finalScore}/100 (${rating.replace('_', ' ')}). Derived from ${factors.length} observable signals across identity multiplicity, infrastructure visibility, and public security controls.`,
    factors,
  };
}
