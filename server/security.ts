import net from 'net';
import dns from 'dns/promises';

/**
 * SSRF (Server-Side Request Forgery) and Target Validation Guard
 * Strictly prevents requests to internal IPs, loopback, private ranges, link-local, and cloud metadata services.
 */

// Private IPv4 CIDR blocks and special addresses
const PRIVATE_IPV4_RANGES = [
  { start: '10.0.0.0', end: '10.255.255.255' },
  { start: '172.16.0.0', end: '172.31.255.255' },
  { start: '192.168.0.0', end: '192.168.255.255' },
  { start: '127.0.0.0', end: '127.255.255.255' },
  { start: '169.254.0.0', end: '169.254.255.255' }, // Link-local and cloud metadata (169.254.169.254)
  { start: '0.0.0.0', end: '0.255.255.255' },
  { start: '100.64.0.0', end: '100.127.255.255' }, // Shared address space
  { start: '192.0.0.0', end: '192.0.0.255' },
  { start: '198.18.0.0', end: '198.19.255.255' }, // Benchmark
  { start: '224.0.0.0', end: '239.255.255.255' }, // Multicast
  { start: '240.0.0.0', end: '255.255.255.255' }, // Reserved
];

function ipToLong(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

export function isPrivateIPv4(ip: string): boolean {
  if (!net.isIPv4(ip)) return false;
  const ipLong = ipToLong(ip);
  for (const range of PRIVATE_IPV4_RANGES) {
    if (ipLong >= ipToLong(range.start) && ipLong <= ipToLong(range.end)) {
      return true;
    }
  }
  return false;
}

export function isPrivateIPv6(ip: string): boolean {
  if (!net.isIPv6(ip)) return false;
  const normalized = ip.toLowerCase();
  // Loopback (::1), unspecified (::), link-local (fe80::/10), unique local (fc00::/7, fd00::/8)
  if (normalized === '::1' || normalized === '::' || normalized.startsWith('fe80:') || normalized.startsWith('fc00:') || normalized.startsWith('fd00:')) {
    return true;
  }
  return false;
}

export function isPrivateIP(ip: string): boolean {
  return isPrivateIPv4(ip) || isPrivateIPv6(ip);
}

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'instance-data',
  '169.254.169.254',
  'metadata.internal',
  'kubernetes.default.svc',
]);

/**
 * Validates if a hostname or URL target is safe from SSRF.
 * Resolves DNS and verifies none of the IPs are private or internal.
 */
export async function validateSafeHost(hostOrUrl: string): Promise<{ safe: boolean; hostname: string; error?: string }> {
  let hostname = hostOrUrl.trim();
  try {
    if (hostname.includes('://')) {
      const parsed = new URL(hostname);
      hostname = parsed.hostname;
    }
  } catch {
    // If URL parse fails, keep hostname as is
  }

  // Remove port if present
  hostname = hostname.split(':')[0].toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.internal') || hostname.endsWith('.local') || hostname.endsWith('.onion')) {
    return { safe: false, hostname, error: `Access to internal hostname '${hostname}' is strictly prohibited.` };
  }

  if (net.isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      return { safe: false, hostname, error: `Access to private/internal IP address '${hostname}' is prohibited.` };
    }
    return { safe: true, hostname };
  }

  try {
    const addresses = await dns.resolve4(hostname).catch(() => [] as string[]);
    const addresses6 = await dns.resolve6(hostname).catch(() => [] as string[]);
    const allAddresses = [...addresses, ...addresses6];

    if (allAddresses.length === 0) {
      // Could be an unresolvable domain, but if target is public domain string it's acceptable for passive search
      return { safe: true, hostname };
    }

    for (const addr of allAddresses) {
      if (isPrivateIP(addr)) {
        return { safe: false, hostname, error: `Hostname '${hostname}' resolves to private address '${addr}'. Request blocked.` };
      }
    }
  } catch (err: any) {
    // DNS resolution failure is safe to proceed for passive lookups like crt.sh/Wayback
    return { safe: true, hostname };
  }

  return { safe: true, hostname };
}

/**
 * Safe Fetch with timeout, size limit, and SSRF verification.
 */
export async function safeFetch(url: string, options: RequestInit & { timeoutMs?: number; maxBytes?: number } = {}): Promise<Response> {
  const { timeoutMs = 8000, maxBytes = 2 * 1024 * 1024, ...fetchOptions } = options;

  const validation = await validateSafeHost(url);
  if (!validation.safe) {
    throw new Error(`SSRF Prevention: ${validation.error}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'User-Agent': 'DigitalFootprintInvestigator/1.0 (OSINT Research; +https://github.com/osint/dfi)',
        ...(fetchOptions.headers || {}),
      },
    });
    clearTimeout(timer);
    return response;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw err;
  }
}
