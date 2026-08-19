import { safeFetch } from '../security.js';
import { osintCache } from '../cache.js';

export interface RdapAnalysis {
  target: string;
  type: 'DOMAIN' | 'IP';
  timestamp: string;
  source: string;
  sourceUrl: string;
  status: 'FOUND' | 'NOT_FOUND' | 'ERROR';
  data?: {
    handle?: string;
    domainName?: string;
    registrar?: string;
    registrarIanaId?: string;
    creationDate?: string;
    expirationDate?: string;
    updatedDate?: string;
    statusCodes: string[];
    nameservers: string[];
    entities: Array<{
      role: string;
      name?: string;
      email?: string;
      organization?: string;
      country?: string;
    }>;
    network?: {
      cidr?: string;
      startAddress?: string;
      endAddress?: string;
      ipVersion?: string;
      name?: string;
    };
  };
  raw?: any;
  error?: string;
}

export async function lookupDomainRdap(domain: string): Promise<RdapAnalysis> {
  const cleanDomain = domain.toLowerCase().trim();
  const cacheKey = `rdap:domain:${cleanDomain}`;
  const cached = osintCache.get<RdapAnalysis>(cacheKey);
  if (cached) return cached.data;

  const sourceUrl = `https://rdap.org/domain/${encodeURIComponent(cleanDomain)}`;

  try {
    const res = await safeFetch(sourceUrl, {
      timeoutMs: 9000,
      headers: { Accept: 'application/rdap+json, application/json' },
    });

    if (res.status === 404) {
      const notFound: RdapAnalysis = {
        target: cleanDomain,
        type: 'DOMAIN',
        timestamp: new Date().toISOString(),
        source: 'RDAP (Registration Data Access Protocol)',
        sourceUrl,
        status: 'NOT_FOUND',
      };
      osintCache.set(cacheKey, notFound, 30 * 60 * 1000);
      return notFound;
    }

    if (!res.ok) {
      throw new Error(`RDAP server responded with HTTP ${res.status}`);
    }

    const rdapJson: any = await res.json();

    // Extract dates
    let creationDate: string | undefined;
    let expirationDate: string | undefined;
    let updatedDate: string | undefined;

    if (Array.isArray(rdapJson.events)) {
      for (const ev of rdapJson.events) {
        if (ev.eventAction === 'registration') creationDate = ev.eventDate;
        if (ev.eventAction === 'expiration') expirationDate = ev.eventDate;
        if (ev.eventAction === 'last changed' || ev.eventAction === 'last update') updatedDate = ev.eventDate;
      }
    }

    // Extract registrar
    let registrar: string | undefined;
    let registrarIanaId: string | undefined;
    const entities: any[] = [];

    if (Array.isArray(rdapJson.entities)) {
      for (const ent of rdapJson.entities) {
        const roles = ent.roles || [];
        const vcard = ent.vcardArray?.[1] || [];
        let name: string | undefined;
        let org: string | undefined;
        let email: string | undefined;
        let country: string | undefined;

        for (const item of vcard) {
          if (item[0] === 'fn') name = item[3];
          if (item[0] === 'org') org = item[3];
          if (item[0] === 'email') email = item[3];
          if (item[0] === 'adr') country = item[3]?.[6];
        }

        if (roles.includes('registrar')) {
          registrar = name || org || ent.handle;
          registrarIanaId = ent.publicIds?.[0]?.identifier;
        }

        entities.push({
          role: roles.join(', ') || 'entity',
          name,
          organization: org,
          email,
          country,
        });
      }
    }

    // Extract nameservers
    const nameservers: string[] = [];
    if (Array.isArray(rdapJson.nameservers)) {
      for (const ns of rdapJson.nameservers) {
        if (ns.ldhName) nameservers.push(ns.ldhName.toLowerCase());
      }
    }

    const result: RdapAnalysis = {
      target: cleanDomain,
      type: 'DOMAIN',
      timestamp: new Date().toISOString(),
      source: 'RDAP (Registration Data Access Protocol)',
      sourceUrl,
      status: 'FOUND',
      data: {
        handle: rdapJson.handle,
        domainName: rdapJson.ldhName || cleanDomain,
        registrar: registrar || 'Unknown / Privacy Protected',
        registrarIanaId,
        creationDate,
        expirationDate,
        updatedDate,
        statusCodes: rdapJson.status || [],
        nameservers,
        entities,
      },
    };

    osintCache.set(cacheKey, result, 60 * 60 * 1000); // 1 hour cache
    return result;
  } catch (err: any) {
    return {
      target: cleanDomain,
      type: 'DOMAIN',
      timestamp: new Date().toISOString(),
      source: 'RDAP',
      sourceUrl,
      status: 'ERROR',
      error: err.message || 'Failed to query RDAP registry',
    };
  }
}

export async function lookupIpRdap(ip: string): Promise<RdapAnalysis> {
  const cleanIp = ip.trim();
  const cacheKey = `rdap:ip:${cleanIp}`;
  const cached = osintCache.get<RdapAnalysis>(cacheKey);
  if (cached) return cached.data;

  const sourceUrl = `https://rdap.org/ip/${encodeURIComponent(cleanIp)}`;

  try {
    const res = await safeFetch(sourceUrl, {
      timeoutMs: 9000,
      headers: { Accept: 'application/rdap+json, application/json' },
    });

    if (!res.ok) {
      throw new Error(`RDAP IP lookup failed with HTTP ${res.status}`);
    }

    const rdapJson: any = await res.json();

    const entities: any[] = [];
    if (Array.isArray(rdapJson.entities)) {
      for (const ent of rdapJson.entities) {
        const roles = ent.roles || [];
        const vcard = ent.vcardArray?.[1] || [];
        let name: string | undefined;
        let org: string | undefined;
        for (const item of vcard) {
          if (item[0] === 'fn') name = item[3];
          if (item[0] === 'org') org = item[3];
        }
        entities.push({
          role: roles.join(', ') || 'registrant',
          name,
          organization: org,
        });
      }
    }

    const result: RdapAnalysis = {
      target: cleanIp,
      type: 'IP',
      timestamp: new Date().toISOString(),
      source: 'RDAP Registry (ARIN/RIPE/APNIC/LACNIC/AFRINIC)',
      sourceUrl,
      status: 'FOUND',
      data: {
        handle: rdapJson.handle,
        statusCodes: rdapJson.status || [],
        nameservers: [],
        entities,
        network: {
          name: rdapJson.name,
          startAddress: rdapJson.startAddress,
          endAddress: rdapJson.endAddress,
          ipVersion: rdapJson.ipVersion,
          cidr: rdapJson.cidr0_cidrs?.[0] ? `${rdapJson.cidr0_cidrs[0].v4prefix || rdapJson.cidr0_cidrs[0].v6prefix}/${rdapJson.cidr0_cidrs[0].length}` : undefined,
        },
      },
    };

    osintCache.set(cacheKey, result, 60 * 60 * 1000);
    return result;
  } catch (err: any) {
    return {
      target: cleanIp,
      type: 'IP',
      timestamp: new Date().toISOString(),
      source: 'RDAP',
      sourceUrl,
      status: 'ERROR',
      error: err.message || 'Failed to query IP RDAP',
    };
  }
}
