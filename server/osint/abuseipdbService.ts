import { safeFetch } from '../security.js';
import { osintCache } from '../cache.js';

export interface AbuseReportItem {
  reportedAt: string;
  comment: string;
  categories: number[];
  reporterCountryCode: string;
}

export interface AbuseIpDbAnalysis {
  ip: string;
  timestamp: string;
  source: string;
  sourceUrl: string;
  status: 'FOUND' | 'OPTIONAL_NOT_CONFIGURED' | 'RATE_LIMITED' | 'ERROR';
  data?: {
    abuseConfidenceScore: number;
    totalReports: number;
    numDistinctUsers: number;
    lastReportedAt?: string;
    isWhitelisted: boolean;
    countryCode?: string;
    usageType?: string;
    isp?: string;
    domain?: string;
    hostnames: string[];
    isTor: boolean;
    recentReports: AbuseReportItem[];
    riskLevel: 'CLEAN' | 'LOW' | 'SUSPICIOUS' | 'HIGH_RISK';
  };
  error?: string;
}

export async function checkAbuseIpDb(ip: string): Promise<AbuseIpDbAnalysis> {
  const cleanIp = ip.trim();
  const cacheKey = `abuseipdb:${cleanIp}`;
  const cached = osintCache.get<AbuseIpDbAnalysis>(cacheKey);
  if (cached) return cached.data;

  const apiKey = process.env.ABUSEIPDB_API_KEY;
  if (!apiKey) {
    return {
      ip: cleanIp,
      timestamp: new Date().toISOString(),
      source: 'AbuseIPDB API v2',
      sourceUrl: `https://www.abuseipdb.com/check/${cleanIp}`,
      status: 'OPTIONAL_NOT_CONFIGURED',
      error: 'AbuseIPDB API key not configured in environment (ABUSEIPDB_API_KEY).',
    };
  }

  const url = `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(cleanIp)}&maxAgeInDays=90&verbose=true`;

  try {
    const res = await safeFetch(url, {
      timeoutMs: 8000,
      headers: {
        Key: apiKey,
        Accept: 'application/json',
      },
    });

    if (res.status === 429) {
      return {
        ip: cleanIp,
        timestamp: new Date().toISOString(),
        source: 'AbuseIPDB API v2',
        sourceUrl: `https://www.abuseipdb.com/check/${cleanIp}`,
        status: 'RATE_LIMITED',
        error: 'AbuseIPDB free limit reached (1,000 checks/day).',
      };
    }

    if (!res.ok) {
      throw new Error(`AbuseIPDB API returned HTTP ${res.status}`);
    }

    const json: any = await res.json();
    const d = json.data;

    let riskLevel: 'CLEAN' | 'LOW' | 'SUSPICIOUS' | 'HIGH_RISK' = 'CLEAN';
    if (d.abuseConfidenceScore > 50) riskLevel = 'HIGH_RISK';
    else if (d.abuseConfidenceScore > 20) riskLevel = 'SUSPICIOUS';
    else if (d.totalReports > 0) riskLevel = 'LOW';

    const recentReports: AbuseReportItem[] = Array.isArray(d.reports)
      ? d.reports.slice(0, 10).map((r: any) => ({
          reportedAt: r.reportedAt,
          comment: r.comment || 'No comment provided',
          categories: r.categories || [],
          reporterCountryCode: r.reporterCountryCode || 'XX',
        }))
      : [];

    const result: AbuseIpDbAnalysis = {
      ip: cleanIp,
      timestamp: new Date().toISOString(),
      source: 'AbuseIPDB API v2',
      sourceUrl: `https://www.abuseipdb.com/check/${cleanIp}`,
      status: 'FOUND',
      data: {
        abuseConfidenceScore: d.abuseConfidenceScore || 0,
        totalReports: d.totalReports || 0,
        numDistinctUsers: d.numDistinctUsers || 0,
        lastReportedAt: d.lastReportedAt || undefined,
        isWhitelisted: d.isWhitelisted || false,
        countryCode: d.countryCode || undefined,
        usageType: d.usageType || undefined,
        isp: d.isp || undefined,
        domain: d.domain || undefined,
        hostnames: d.hostnames || [],
        isTor: d.isTor || false,
        recentReports,
        riskLevel,
      },
    };

    osintCache.set(cacheKey, result, 30 * 60 * 1000);
    return result;
  } catch (err: any) {
    return {
      ip: cleanIp,
      timestamp: new Date().toISOString(),
      source: 'AbuseIPDB API v2',
      sourceUrl: `https://www.abuseipdb.com/check/${cleanIp}`,
      status: 'ERROR',
      error: err.message || 'Failed to query AbuseIPDB',
    };
  }
}
