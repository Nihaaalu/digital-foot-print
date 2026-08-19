import crypto from 'crypto';
import { safeFetch } from '../security.js';

export interface PwnedPasswordAnalysis {
  sha1Prefix: string;
  isPwned: boolean;
  pwnedCount: number;
  timestamp: string;
  source: string;
  sourceUrl: string;
  kAnonymityNotice: string;
}

export async function checkPwnedPassword(plainPassword: string): Promise<PwnedPasswordAnalysis> {
  if (!plainPassword) {
    throw new Error('Password string is required for check.');
  }

  // Calculate SHA-1 hash strictly in-memory
  const sha1 = crypto.createHash('sha1').update(plainPassword).digest('hex').toUpperCase();
  const prefix = sha1.substring(0, 5);
  const suffix = sha1.substring(5);

  const sourceUrl = `https://api.pwnedpasswords.com/range/${prefix}`;

  try {
    const res = await safeFetch(sourceUrl, {
      timeoutMs: 8000,
      headers: {
        'Add-Padding': 'true', // Request random padding to prevent response length side-channels
      },
    });

    if (!res.ok) {
      throw new Error(`HIBP Pwned Passwords API returned HTTP ${res.status}`);
    }

    const text = await res.text();
    const lines = text.split('\r\n');

    let pwnedCount = 0;
    let isPwned = false;

    for (const line of lines) {
      const [hashSuffix, countStr] = line.split(':');
      if (hashSuffix && hashSuffix.trim().toUpperCase() === suffix) {
        pwnedCount = parseInt(countStr.trim(), 10) || 0;
        isPwned = pwnedCount > 0;
        break;
      }
    }

    return {
      sha1Prefix: prefix,
      isPwned,
      pwnedCount,
      timestamp: new Date().toISOString(),
      source: 'Have I Been Pwned (Pwned Passwords v3 k-Anonymity API)',
      sourceUrl: 'https://haveibeenpwned.com/Passwords',
      kAnonymityNotice: 'k-Anonymity verified: Only the 5-character SHA-1 hash prefix was transmitted. The remaining 35 characters were compared locally. The plaintext password is never transmitted, stored, or logged.',
    };
  } catch (err: any) {
    throw new Error(`Pwned Passwords check error: ${err.message}`);
  }
}
