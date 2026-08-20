import { safeFetch } from '../security.js';
import { osintCache } from '../cache.js';

export type WhoisFreaksStatus =
  | 'FOUND'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'CONFIGURATION_MISSING'
  | 'TIMEOUT'
  | 'ERROR';

export interface WhoisFreaksContact {
  organization?: string;
  country?: string;
  state?: string;
  city?: string;
  email?: string;
}

export interface WhoisFreaksAnalysis {
  source: 'WhoisFreaks';
  type: 'whois';
  status: WhoisFreaksStatus;
  domain: string;
  timestamp: string;
  sourceUrl?: string;
  registrar?: string;
  registrarIanaId?: string;
  createdDate?: string;
  updatedDate?: string;
  expiryDate?: string;
  statusCodes?: string[];
  nameServers?: string[];
  dnssec?: string;
  registry?: string;
  registrant?: WhoisFreaksContact;
  admin?: WhoisFreaksContact;
  tech?: WhoisFreaksContact;
  error?: string;
}

/**
 * Normalizes domain strings for WHOIS lookup
 */
function normalizeDomain(raw: string): string {
  let d = raw.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, '').replace(/^www\./, '');
  d = d.split('/')[0].split(':')[0].trim();
  return d;
}

/**
 * Dedicated WhoisFreaks Live WHOIS API Client
 * Free tier: 500 API credits. Results are cached to minimize credit consumption.
 */
export async function lookupWhoisFreaks(domainInput: string): Promise<WhoisFreaksAnalysis> {
  const cleanDomain = normalizeDomain(domainInput);
  const timestamp = new Date().toISOString();
  const sourceUrl = 'https://whoisfreaks.com';

  if (!cleanDomain || !cleanDomain.includes('.')) {
    return {
      source: 'WhoisFreaks',
      type: 'whois',
      status: 'NOT_FOUND',
      domain: cleanDomain,
      timestamp,
      sourceUrl,
      error: 'Invalid domain format for WHOIS lookup',
    };
  }

  // 1. Check in-memory cache to preserve 500 free credits
  const cacheKey = `whoisfreaks:domain:${cleanDomain}`;
  const cached = osintCache.get<WhoisFreaksAnalysis>(cacheKey);
  if (cached) {
    return cached.data;
  }

  // 2. Check API key configuration
  const apiKey = process.env.WHOISFREAKS_API_KEY?.trim();
  if (!apiKey) {
    return {
      source: 'WhoisFreaks',
      type: 'whois',
      status: 'CONFIGURATION_MISSING',
      domain: cleanDomain,
      timestamp,
      sourceUrl,
      error: 'WHOISFREAKS_API_KEY is not configured in server environment.',
    };
  }

  // 3. Make server-side API request
  const apiUrl = `https://api.whoisfreaks.com/v2.0/whois?whois=live&domainName=${encodeURIComponent(cleanDomain)}&apiKey=${encodeURIComponent(apiKey)}&format=json`;

  try {
    const res = await safeFetch(apiUrl, {
      timeoutMs: 8000,
      headers: {
        Accept: 'application/json',
      },
    });

    if (res.status === 429) {
      const rateLimitedResult: WhoisFreaksAnalysis = {
        source: 'WhoisFreaks',
        type: 'whois',
        status: 'RATE_LIMITED',
        domain: cleanDomain,
        timestamp,
        sourceUrl,
        error: 'WhoisFreaks rate limit or credit quota exceeded.',
      };
      osintCache.set(cacheKey, rateLimitedResult, 5 * 60 * 1000); // 5 min cache
      return rateLimitedResult;
    }

    if (res.status === 401 || res.status === 403) {
      return {
        source: 'WhoisFreaks',
        type: 'whois',
        status: 'CONFIGURATION_MISSING',
        domain: cleanDomain,
        timestamp,
        sourceUrl,
        error: 'Invalid WhoisFreaks API key or account permissions.',
      };
    }

    if (res.status === 404) {
      const notFoundResult: WhoisFreaksAnalysis = {
        source: 'WhoisFreaks',
        type: 'whois',
        status: 'NOT_FOUND',
        domain: cleanDomain,
        timestamp,
        sourceUrl,
        error: 'No WHOIS record found for domain.',
      };
      osintCache.set(cacheKey, notFoundResult, 15 * 60 * 1000);
      return notFoundResult;
    }

    if (!res.ok) {
      throw new Error(`WhoisFreaks API responded with HTTP status ${res.status}`);
    }

    const data: any = await res.json();

    // Check if WhoisFreaks returned an API error structure
    if (data.status === false || (data.domain_registered && data.domain_registered.toLowerCase() === 'no')) {
      const notFoundResult: WhoisFreaksAnalysis = {
        source: 'WhoisFreaks',
        type: 'whois',
        status: 'NOT_FOUND',
        domain: cleanDomain,
        timestamp,
        sourceUrl,
        error: data.error || data.message || 'No active WHOIS registration found.',
      };
      osintCache.set(cacheKey, notFoundResult, 15 * 60 * 1000);
      return notFoundResult;
    }

    // 4. Normalize fields cleanly
    // Registrar
    let registrar: string | undefined;
    let registrarIanaId: string | undefined;
    if (data.registrar) {
      if (typeof data.registrar === 'string') {
        registrar = data.registrar;
      } else if (typeof data.registrar === 'object') {
        registrar = data.registrar.name || data.registrar.registrar_name;
        registrarIanaId = data.registrar.iana_id || data.registrar.id;
      }
    }
    if (!registrar && data.registrar_name) {
      registrar = data.registrar_name;
    }

    // Dates
    const createdDate = data.create_date || data.created_date || data.registry_created_date || undefined;
    const updatedDate = data.update_date || data.updated_date || data.registry_updated_date || undefined;
    const expiryDate = data.expiry_date || data.expiration_date || data.registry_expiry_date || undefined;

    // Status Codes
    let statusCodes: string[] = [];
    if (Array.isArray(data.domain_status)) {
      statusCodes = data.domain_status.map((s: any) => String(s).trim()).filter(Boolean);
    } else if (typeof data.domain_status === 'string') {
      statusCodes = data.domain_status.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (Array.isArray(data.status)) {
      statusCodes = data.status.map((s: any) => String(s).trim()).filter(Boolean);
    }

    // Name Servers
    let nameServers: string[] = [];
    if (Array.isArray(data.name_servers)) {
      nameServers = data.name_servers.map((ns: any) => (typeof ns === 'string' ? ns.toLowerCase().trim() : ns.name ? String(ns.name).toLowerCase().trim() : '')).filter(Boolean);
    } else if (typeof data.name_servers === 'string') {
      nameServers = data.name_servers.split(',').map((ns) => ns.toLowerCase().trim()).filter(Boolean);
    }

    // DNSSEC
    let dnssec: string | undefined;
    if (data.dnssec !== undefined && data.dnssec !== null) {
      dnssec = typeof data.dnssec === 'string' ? data.dnssec : data.dnssec ? 'signed' : 'unsigned';
    }

    // Registry / WHOIS Server
    const registry = data.whois_server || data.registry_domain_id || undefined;

    // Contacts (Registrant, Admin, Tech) with privacy guard
    const normalizeContact = (contactObj: any): WhoisFreaksContact | undefined => {
      if (!contactObj || typeof contactObj !== 'object') return undefined;
      const org = contactObj.company || contactObj.organization || contactObj.name;
      const country = contactObj.country_name || contactObj.country_code || contactObj.country;
      const state = contactObj.state || contactObj.province;
      const city = contactObj.city;
      const email = contactObj.email_address || contactObj.email;

      if (!org && !country && !state && !city && !email) return undefined;
      return {
        organization: org,
        country,
        state,
        city,
        email: email && !email.includes('privacy') ? email : undefined,
      };
    };

    const registrant = normalizeContact(data.registrant_contact || data.registrant);
    const admin = normalizeContact(data.administrative_contact || data.admin);
    const tech = normalizeContact(data.technical_contact || data.tech);

    const result: WhoisFreaksAnalysis = {
      source: 'WhoisFreaks',
      type: 'whois',
      status: 'FOUND',
      domain: cleanDomain,
      timestamp,
      sourceUrl,
      registrar: registrar || 'Not available',
      registrarIanaId,
      createdDate,
      updatedDate,
      expiryDate,
      statusCodes,
      nameServers,
      dnssec,
      registry,
      registrant,
      admin,
      tech,
    };

    // Cache successful lookup for 60 minutes
    osintCache.set(cacheKey, result, 60 * 60 * 1000);
    return result;
  } catch (err: any) {
    if (err.message && err.message.includes('timed out')) {
      return {
        source: 'WhoisFreaks',
        type: 'whois',
        status: 'TIMEOUT',
        domain: cleanDomain,
        timestamp,
        sourceUrl,
        error: 'WhoisFreaks lookup request timed out.',
      };
    }

    return {
      source: 'WhoisFreaks',
      type: 'whois',
      status: 'ERROR',
      domain: cleanDomain,
      timestamp,
      sourceUrl,
      error: err.message || 'Failed to query WhoisFreaks API',
    };
  }
}
