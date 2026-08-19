import tls from 'tls';
import { validateSafeHost } from '../security.js';
import { osintCache } from '../cache.js';

export interface TlsAnalysis {
  host: string;
  port: number;
  timestamp: string;
  source: string;
  status: 'FOUND' | 'NO_TLS' | 'ERROR';
  data?: {
    subject: Record<string, string>;
    issuer: Record<string, string>;
    validFrom: string;
    validTo: string;
    daysRemaining: number;
    serialNumber: string;
    fingerprint256: string;
    sans: string[];
    protocol: string;
    cipher: string;
    isWildcard: boolean;
    isExpired: boolean;
    isExpiringSoon: boolean;
  };
  error?: string;
}

export async function inspectTls(host: string, port = 443): Promise<TlsAnalysis> {
  const cleanHost = host.toLowerCase().trim();
  const cacheKey = `tls:${cleanHost}:${port}`;
  const cached = osintCache.get<TlsAnalysis>(cacheKey);
  if (cached) return cached.data;

  const validation = await validateSafeHost(cleanHost);
  if (!validation.safe) {
    return {
      host: cleanHost,
      port,
      timestamp: new Date().toISOString(),
      source: 'Direct TLS Handshake',
      status: 'ERROR',
      error: validation.error,
    };
  }

  return new Promise((resolve) => {
    const socket = tls.connect(
      {
        host: cleanHost,
        port,
        servername: cleanHost,
        rejectUnauthorized: false, // We inspect even self-signed or untrusted certs for OSINT
        timeout: 7000,
      },
      () => {
        try {
          const cert: any = socket.getPeerCertificate(true);
          const protocol = socket.getProtocol() || 'TLS';
          const cipher = socket.getCipher()?.name || 'Unknown Cipher';
          socket.end();

          if (!cert || !cert.valid_to) {
            const noCert: TlsAnalysis = {
              host: cleanHost,
              port,
              timestamp: new Date().toISOString(),
              source: 'Direct TLS Handshake',
              status: 'NO_TLS',
            };
            return resolve(noCert);
          }

          const validTo = new Date(cert.valid_to);
          const validFrom = new Date(cert.valid_from);
          const now = new Date();
          const daysRemaining = Math.round((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const isExpired = daysRemaining < 0;
          const isExpiringSoon = daysRemaining >= 0 && daysRemaining <= 30;

          // Parse SANs
          const sans: string[] = [];
          if (cert.subjectaltname) {
            const parts = cert.subjectaltname.split(', ');
            for (const p of parts) {
              if (p.startsWith('DNS:')) {
                sans.push(p.replace('DNS:', ''));
              } else if (p.startsWith('IP Address:')) {
                sans.push(p.replace('IP Address:', ''));
              }
            }
          }

          const isWildcard = (cert.subject?.CN && cert.subject.CN.includes('*')) || sans.some((s) => s.includes('*'));

          const analysis: TlsAnalysis = {
            host: cleanHost,
            port,
            timestamp: new Date().toISOString(),
            source: 'Direct TLS Handshake (port 443)',
            status: 'FOUND',
            data: {
              subject: cert.subject || {},
              issuer: cert.issuer || {},
              validFrom: validFrom.toISOString(),
              validTo: validTo.toISOString(),
              daysRemaining,
              serialNumber: cert.serialNumber || '',
              fingerprint256: cert.fingerprint256 || '',
              sans,
              protocol,
              cipher,
              isWildcard,
              isExpired,
              isExpiringSoon,
            },
          };

          osintCache.set(cacheKey, analysis, 30 * 60 * 1000);
          resolve(analysis);
        } catch (err: any) {
          socket.destroy();
          resolve({
            host: cleanHost,
            port,
            timestamp: new Date().toISOString(),
            source: 'Direct TLS Handshake',
            status: 'ERROR',
            error: err.message,
          });
        }
      }
    );

    socket.on('error', (err) => {
      resolve({
        host: cleanHost,
        port,
        timestamp: new Date().toISOString(),
        source: 'Direct TLS Handshake',
        status: 'ERROR',
        error: `TLS Connection Error: ${err.message}`,
      });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({
        host: cleanHost,
        port,
        timestamp: new Date().toISOString(),
        source: 'Direct TLS Handshake',
        status: 'ERROR',
        error: 'TLS Handshake timed out',
      });
    });
  });
}
