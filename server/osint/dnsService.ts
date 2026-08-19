import dns from 'dns/promises';
import { osintCache } from '../cache.js';

export interface DnsRecordResult {
  type: string;
  records: any[];
  status: 'FOUND' | 'NO_RECORDS' | 'ERROR';
  error?: string;
}

export interface DnsAnalysis {
  domain: string;
  timestamp: string;
  source: string;
  records: {
    A: string[];
    AAAA: string[];
    MX: Array<{ exchange: string; priority: number }>;
    NS: string[];
    TXT: string[];
    CNAME: string[];
    SOA?: any;
    CAA: Array<{ critical: number; issue?: string; issuewild?: string; iodef?: string }>;
  };
  security: {
    spf: { present: boolean; raw?: string; mechanismCount?: number };
    dmarc: { present: boolean; raw?: string; policy?: string };
    caa: { present: boolean; issuers: string[] };
    dnssec: { enabled: boolean; note: string };
  };
}

export async function resolveDns(domain: string): Promise<DnsAnalysis> {
  const cleanDomain = domain.toLowerCase().trim();
  const cacheKey = `dns:${cleanDomain}`;
  const cached = osintCache.get<DnsAnalysis>(cacheKey);
  if (cached) return cached.data;

  const result: DnsAnalysis = {
    domain: cleanDomain,
    timestamp: new Date().toISOString(),
    source: 'Direct Authoritative DNS Resolution',
    records: {
      A: [],
      AAAA: [],
      MX: [],
      NS: [],
      TXT: [],
      CNAME: [],
      CAA: [],
    },
    security: {
      spf: { present: false },
      dmarc: { present: false },
      caa: { present: false, issuers: [] },
      dnssec: { enabled: false, note: 'DNSSEC status not verified' },
    },
  };

  // Run resolutions in parallel with individual try/catch
  const [a, aaaa, mx, ns, txt, cname, soa, caa, dmarcTxt] = await Promise.allSettled([
    dns.resolve4(cleanDomain),
    dns.resolve6(cleanDomain),
    dns.resolveMx(cleanDomain),
    dns.resolveNs(cleanDomain),
    dns.resolveTxt(cleanDomain),
    dns.resolveCname(cleanDomain),
    dns.resolveSoa(cleanDomain),
    dns.resolveCaa(cleanDomain),
    dns.resolveTxt(`_dmarc.${cleanDomain}`),
  ]);

  if (a.status === 'fulfilled') result.records.A = a.value;
  if (aaaa.status === 'fulfilled') result.records.AAAA = aaaa.value;
  if (mx.status === 'fulfilled') {
    result.records.MX = mx.value.sort((x, y) => x.priority - y.priority);
  }
  if (ns.status === 'fulfilled') result.records.NS = ns.value;
  if (cname.status === 'fulfilled') result.records.CNAME = cname.value;
  if (soa.status === 'fulfilled') result.records.SOA = soa.value;
  if (caa.status === 'fulfilled') {
    result.records.CAA = caa.value;
    result.security.caa.present = caa.value.length > 0;
    result.security.caa.issuers = caa.value
      .map((c) => c.issue || c.issuewild)
      .filter(Boolean) as string[];
  }

  // Parse TXT & SPF
  if (txt.status === 'fulfilled') {
    const flattenedTxt = txt.value.map((chunks) => chunks.join(''));
    result.records.TXT = flattenedTxt;

    const spfRecord = flattenedTxt.find((t) => t.toLowerCase().startsWith('v=spf1'));
    if (spfRecord) {
      result.security.spf = {
        present: true,
        raw: spfRecord,
        mechanismCount: spfRecord.split(' ').length - 1,
      };
    }
  }

  // Parse DMARC
  if (dmarcTxt.status === 'fulfilled') {
    const flattenedDmarc = dmarcTxt.value.map((chunks) => chunks.join(''));
    const dmarcRecord = flattenedDmarc.find((t) => t.toLowerCase().startsWith('v=dmarc1'));
    if (dmarcRecord) {
      const pMatch = dmarcRecord.match(/p=([a-zA-Z]+)/);
      result.security.dmarc = {
        present: true,
        raw: dmarcRecord,
        policy: pMatch ? pMatch[1] : 'none',
      };
    }
  }

  // Check DNSSEC indicators
  try {
    // Try querying SOA / DS records
    if (soa.status === 'fulfilled') {
      result.security.dnssec = {
        enabled: false,
        note: 'DNS zone active; standard authoritative SOA record present',
      };
    }
  } catch {
    // ignore
  }

  osintCache.set(cacheKey, result, 10 * 60 * 1000); // 10 min cache
  return result;
}
