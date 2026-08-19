import { safeFetch } from '../security.js';
import { osintCache } from '../cache.js';

export interface IpInfoAnalysis {
  ip: string;
  timestamp: string;
  source: string;
  sourceUrl: string;
  status: 'FOUND' | 'ERROR';
  data?: {
    hostname?: string;
    city?: string;
    region?: string;
    country?: string;
    countryCode?: string;
    loc?: string;
    org?: string;
    asn?: string;
    asName?: string;
    postal?: string;
    timezone?: string;
    isApproximateLocation: boolean;
    disclaimer: string;
  };
  error?: string;
}

export async function lookupIpInfo(ip: string): Promise<IpInfoAnalysis> {
  const cleanIp = ip.trim();
  const cacheKey = `ipinfo:${cleanIp}`;
  const cached = osintCache.get<IpInfoAnalysis>(cacheKey);
  if (cached) return cached.data;

  const token = process.env.IPINFO_TOKEN;
  let url = `https://ipinfo.io/${encodeURIComponent(cleanIp)}/json`;
  if (token) {
    url = `https://api.ipinfo.io/lite/${encodeURIComponent(cleanIp)}?token=${token}`;
  }

  try {
    const res = await safeFetch(url, {
      timeoutMs: 8000,
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`IPinfo lookup failed with HTTP ${res.status}`);
    }

    const data: any = await res.json();

    // Parse ASN if present in org e.g. "AS15169 Google LLC"
    let asn = data.asn || data.as?.asn;
    let asName = data.as_name || data.as?.name;
    if (!asn && data.org && data.org.startsWith('AS')) {
      const match = data.org.match(/^(AS\d+)\s*(.*)$/);
      if (match) {
        asn = match[1];
        asName = match[2];
      }
    }

    const result: IpInfoAnalysis = {
      ip: cleanIp,
      timestamp: new Date().toISOString(),
      source: token ? 'IPinfo Lite API' : 'IPinfo Open Network Intelligence',
      sourceUrl: `https://ipinfo.io/${cleanIp}`,
      status: 'FOUND',
      data: {
        hostname: data.hostname || data.reverse || undefined,
        city: data.city || undefined,
        region: data.region || undefined,
        country: data.country || data.country_name || undefined,
        countryCode: data.country_code || data.country || undefined,
        loc: data.loc || undefined,
        org: data.org || data.company?.name || asName || undefined,
        asn: asn || undefined,
        asName: asName || data.org || undefined,
        postal: data.postal || undefined,
        timezone: data.timezone || undefined,
        isApproximateLocation: true,
        disclaimer: 'IP geolocation indicates network broadcast origin / ISP routing and is APPROXIMATE. It does not identify physical personal residence.',
      },
    };

    osintCache.set(cacheKey, result, 60 * 60 * 1000); // 1 hr cache
    return result;
  } catch (err: any) {
    return {
      ip: cleanIp,
      timestamp: new Date().toISOString(),
      source: 'IPinfo',
      sourceUrl: `https://ipinfo.io/${cleanIp}`,
      status: 'ERROR',
      error: err.message || 'Failed to query IPinfo service',
    };
  }
}
