import { safeFetch } from '../security.js';
import { osintCache } from '../cache.js';

export interface VirusTotalAnalysis {
  target: string;
  targetType: 'IP' | 'DOMAIN' | 'URL';
  timestamp: string;
  source: string;
  sourceUrl: string;
  status: 'FOUND' | 'OPTIONAL_NOT_CONFIGURED' | 'RATE_LIMITED' | 'ERROR';
  data?: {
    reputation: number;
    lastAnalysisDate?: string;
    stats: {
      harmless: number;
      malicious: number;
      suspicious: number;
      undetected: number;
      timeout: number;
    };
    categories?: Record<string, string>;
    tags?: string[];
    asOwner?: string;
    verdict: 'CLEAN' | 'SUSPICIOUS' | 'MALICIOUS' | 'UNKNOWN';
  };
  error?: string;
}

export async function checkVirusTotal(target: string, type: 'IP' | 'DOMAIN' | 'URL'): Promise<VirusTotalAnalysis> {
  const cleanTarget = target.trim();
  const cacheKey = `vt:${type}:${cleanTarget.toLowerCase()}`;
  const cached = osintCache.get<VirusTotalAnalysis>(cacheKey);
  if (cached) return cached.data;

  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  if (!apiKey) {
    return {
      target: cleanTarget,
      targetType: type,
      timestamp: new Date().toISOString(),
      source: 'VirusTotal Community API v3 (OPTIONAL)',
      sourceUrl: `https://www.virustotal.com/gui/search/${encodeURIComponent(cleanTarget)}`,
      status: 'OPTIONAL_NOT_CONFIGURED',
      error: 'VirusTotal API key not configured (VIRUSTOTAL_API_KEY).',
    };
  }

  let endpoint = '';
  if (type === 'IP') endpoint = `https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(cleanTarget)}`;
  else if (type === 'DOMAIN') endpoint = `https://www.virustotal.com/api/v3/domains/${encodeURIComponent(cleanTarget)}`;
  else {
    const urlId = Buffer.from(cleanTarget).toString('base64url');
    endpoint = `https://www.virustotal.com/api/v3/urls/${urlId}`;
  }

  try {
    const res = await safeFetch(endpoint, {
      timeoutMs: 9000,
      headers: {
        'x-apikey': apiKey,
        Accept: 'application/json',
      },
    });

    if (res.status === 429) {
      return {
        target: cleanTarget,
        targetType: type,
        timestamp: new Date().toISOString(),
        source: 'VirusTotal Community API v3 (OPTIONAL)',
        sourceUrl: `https://www.virustotal.com/gui/search/${encodeURIComponent(cleanTarget)}`,
        status: 'RATE_LIMITED',
        error: 'VirusTotal public rate limit reached (4 requests/minute).',
      };
    }

    if (!res.ok) {
      throw new Error(`VirusTotal API returned HTTP ${res.status}`);
    }

    const json: any = await res.json();
    const attrs = json.data?.attributes || {};
    const stats = attrs.last_analysis_stats || { harmless: 0, malicious: 0, suspicious: 0, undetected: 0, timeout: 0 };

    let verdict: 'CLEAN' | 'SUSPICIOUS' | 'MALICIOUS' | 'UNKNOWN' = 'CLEAN';
    if (stats.malicious > 0) verdict = 'MALICIOUS';
    else if (stats.suspicious > 0) verdict = 'SUSPICIOUS';

    const result: VirusTotalAnalysis = {
      target: cleanTarget,
      targetType: type,
      timestamp: new Date().toISOString(),
      source: 'VirusTotal Community API v3 (OPTIONAL)',
      sourceUrl: `https://www.virustotal.com/gui/search/${encodeURIComponent(cleanTarget)}`,
      status: 'FOUND',
      data: {
        reputation: attrs.reputation || 0,
        lastAnalysisDate: attrs.last_analysis_date ? new Date(attrs.last_analysis_date * 1000).toISOString() : undefined,
        stats,
        categories: attrs.categories,
        tags: attrs.tags,
        asOwner: attrs.as_owner,
        verdict,
      },
    };

    osintCache.set(cacheKey, result, 30 * 60 * 1000);
    return result;
  } catch (err: any) {
    return {
      target: cleanTarget,
      targetType: type,
      timestamp: new Date().toISOString(),
      source: 'VirusTotal Community API v3',
      sourceUrl: `https://www.virustotal.com/gui/search/${encodeURIComponent(cleanTarget)}`,
      status: 'ERROR',
      error: err.message || 'Failed to query VirusTotal API',
    };
  }
}
