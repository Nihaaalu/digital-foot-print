import dns from 'dns/promises';
import { safeFetch } from '../security.js';
import { osintCache } from '../cache.js';

export interface CrtShCertificate {
  id: number;
  loggedAt: string;
  notBefore: string;
  notAfter: string;
  commonName: string;
  nameValue: string;
  issuerName: string;
  isWildcard: boolean;
  isExpired: boolean;
}

export interface DiscoveredSubdomain {
  hostname: string;
  isWildcard: boolean;
  resolved: boolean;
  ips: string[];
}

export interface CrtShAnalysis {
  domain: string;
  timestamp: string;
  source: string;
  sourceUrl: string;
  status: 'FOUND' | 'NO_DATA' | 'ERROR';
  totalCertificates: number;
  uniqueSubdomainsCount: number;
  certificates: CrtShCertificate[];
  subdomains: DiscoveredSubdomain[];
  error?: string;
}

export async function searchCertificateTransparency(domain: string): Promise<CrtShAnalysis> {
  const cleanDomain = domain.toLowerCase().trim();
  const cacheKey = `crtsh:${cleanDomain}`;
  const cached = osintCache.get<CrtShAnalysis>(cacheKey);
  if (cached) return cached.data;

  const sourceUrl = `https://crt.sh/?q=%.${encodeURIComponent(cleanDomain)}&output=json`;

  try {
    const res = await safeFetch(sourceUrl, {
      timeoutMs: 12000,
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      if (res.status === 404 || res.status === 502 || res.status === 504) {
        // crt.sh can sometimes be busy or return no records
        return {
          domain: cleanDomain,
          timestamp: new Date().toISOString(),
          source: 'Certificate Transparency (crt.sh)',
          sourceUrl,
          status: 'NO_DATA',
          totalCertificates: 0,
          uniqueSubdomainsCount: 0,
          certificates: [],
          subdomains: [],
        };
      }
      throw new Error(`crt.sh returned HTTP ${res.status}`);
    }

    const rawCerts: any[] = await res.json();

    if (!Array.isArray(rawCerts) || rawCerts.length === 0) {
      const emptyResult: CrtShAnalysis = {
        domain: cleanDomain,
        timestamp: new Date().toISOString(),
        source: 'Certificate Transparency (crt.sh)',
        sourceUrl,
        status: 'NO_DATA',
        totalCertificates: 0,
        uniqueSubdomainsCount: 0,
        certificates: [],
        subdomains: [],
      };
      osintCache.set(cacheKey, emptyResult, 30 * 60 * 1000);
      return emptyResult;
    }

    const now = new Date();
    const certList: CrtShCertificate[] = [];
    const hostnameSet = new Set<string>();

    for (const item of rawCerts.slice(0, 150)) {
      const notAfter = item.not_after ? new Date(item.not_after) : null;
      const isExpired = notAfter ? notAfter < now : false;
      const isWildcard = String(item.name_value).includes('*') || String(item.common_name).includes('*');

      certList.push({
        id: item.id,
        loggedAt: item.entry_timestamp || '',
        notBefore: item.not_before || '',
        notAfter: item.not_after || '',
        commonName: item.common_name || '',
        nameValue: item.name_value || '',
        issuerName: item.issuer_name || 'Unknown Issuer',
        isWildcard,
        isExpired,
      });

      // Split multiple SAN names
      const names = String(item.name_value || '')
        .split('\n')
        .concat(String(item.common_name || '').split('\n'));

      for (const n of names) {
        const cleaned = n.trim().toLowerCase();
        if (cleaned && (cleaned.endsWith(`.${cleanDomain}`) || cleaned === cleanDomain)) {
          hostnameSet.add(cleaned);
        }
      }
    }

    // Resolve discovered unique subdomains (up to 30 to stay fast and avoid DNS flooding)
    const uniqueHostnames = Array.from(hostnameSet).slice(0, 40);
    const subdomains: DiscoveredSubdomain[] = await Promise.all(
      uniqueHostnames.map(async (host) => {
        const isWildcard = host.startsWith('*.');
        const resolveTarget = isWildcard ? host.slice(2) : host;
        let ips: string[] = [];
        let resolved = false;

        try {
          const addrs = await dns.resolve4(resolveTarget).catch(() => [] as string[]);
          if (addrs.length > 0) {
            ips = addrs;
            resolved = true;
          }
        } catch {
          // not resolved
        }

        return {
          hostname: host,
          isWildcard,
          resolved,
          ips,
        };
      })
    );

    const result: CrtShAnalysis = {
      domain: cleanDomain,
      timestamp: new Date().toISOString(),
      source: 'Certificate Transparency (crt.sh)',
      sourceUrl,
      status: 'FOUND',
      totalCertificates: rawCerts.length,
      uniqueSubdomainsCount: hostnameSet.size,
      certificates: certList.slice(0, 50),
      subdomains,
    };

    osintCache.set(cacheKey, result, 30 * 60 * 1000);
    return result;
  } catch (err: any) {
    return {
      domain: cleanDomain,
      timestamp: new Date().toISOString(),
      source: 'Certificate Transparency (crt.sh)',
      sourceUrl,
      status: 'ERROR',
      totalCertificates: 0,
      uniqueSubdomainsCount: 0,
      certificates: [],
      subdomains: [],
      error: err.message || 'Failed to query crt.sh log database',
    };
  }
}
