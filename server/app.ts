import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { apiRateLimiter } from './rateLimiter.js';
import { detectTargetType } from './osint/detector.js';
import { runInvestigation } from './osint/orchestrator.js';
import { checkPwnedPassword } from './osint/pwnedpassService.js';
import { lookupGitHubUser } from './osint/githubService.js';
import { lookupIpInfo } from './osint/ipinfoService.js';
import { checkAbuseIpDb } from './osint/abuseipdbService.js';
import { checkVirusTotal } from './osint/virustotalService.js';
import { runUsernameInvestigation } from './osint/usernameEngine/usernameRunner.js';

dotenv.config();

export const app = express();

// Parse JSON request bodies
app.use(express.json({ limit: '1mb' }));

// Safe Production Request Diagnostics Logger Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const reqId = Math.random().toString(36).substring(2, 9);
  const start = Date.now();

  res.on('finish', () => {
    // Only log API routes to keep diagnostics clean
    if (req.originalUrl.startsWith('/api') || req.url.startsWith('/api')) {
      const duration = Date.now() - start;
      const sanitizedUrl = req.originalUrl.split('?')[0]; // Strip sensitive query parameters if any
      console.log(`[request ${reqId}]\n${req.method} ${sanitizedUrl}\n${res.statusCode}\n${duration}ms\n`);
    }
  });

  next();
});

// Router for API endpoints (mounted on both /api and / for maximum serverless compatibility)
const apiRouter = express.Router();

// 1. Diagnostics & Health Check
apiRouter.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    ok: true,
    service: 'footprint-osint',
    environment: process.env.NODE_ENV || 'production',
  });
});

// 2. Integration Keys Diagnostics (boolean status only, NEVER exposes values)
apiRouter.get('/health/integrations', (req: Request, res: Response) => {
  res.status(200).json({
    github: !!process.env.GITHUB_TOKEN,
    ipinfo: !!process.env.IPINFO_TOKEN,
    abuseipdb: !!process.env.ABUSEIPDB_API_KEY,
    virustotal: !!process.env.VIRUSTOTAL_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
  });
});

// 3. Target Classifier
apiRouter.get('/detect', (req: Request, res: Response) => {
  const target = req.query.target as string;
  const manualType = req.query.type as string | undefined;
  if (!target) {
    return res.status(400).json({ error: 'Target query parameter is required' });
  }
  const analysis = detectTargetType(target, manualType);
  res.json(analysis);
});

// 4. Integration Settings & Rate Limit Status
apiRouter.get('/settings/status', async (req: Request, res: Response) => {
  const ghToken = process.env.GITHUB_TOKEN;
  const ipinfoToken = process.env.IPINFO_TOKEN;
  const abuseKey = process.env.ABUSEIPDB_API_KEY;
  const vtKey = process.env.VIRUSTOTAL_API_KEY;

  let ghRemaining = 60;
  let ghLimit = 60;
  let ghReset = new Date().toISOString();

  try {
    const ghProbe = await lookupGitHubUser('octocat');
    ghRemaining = ghProbe.rateLimit.remaining;
    ghLimit = ghProbe.rateLimit.limit;
    ghReset = ghProbe.rateLimit.resetTime;
  } catch {
    // Ignore rate check failure
  }

  res.json({
    integrations: {
      github: {
        name: 'GitHub REST API v3',
        type: 'FREE_CORE_WITH_OPTIONAL_TOKEN',
        configured: !!ghToken,
        status: 'CONNECTED',
        description: ghToken
          ? 'Authenticated Personal Access Token (5,000 req/hr)'
          : 'Unauthenticated Public Rate Limit (60 req/hr)',
        rateLimit: {
          remaining: ghRemaining,
          limit: ghLimit,
          resetTime: ghReset,
        },
      },
      username_engine: {
        name: 'Multi-Source Username Engine (Sherlock + Maigret + WhatsMyName)',
        type: 'FREE_OPEN_SOURCE',
        configured: true,
        status: 'CONNECTED',
        description: 'Unified OSINT platform signatures (1,000+ public sites, anti-bot verifiers, confidence scoring)',
      },
      ipinfo: {
        name: 'IPinfo Lite',
        type: 'FREE_CORE_API',
        configured: !!ipinfoToken,
        status: ipinfoToken ? 'CONNECTED' : 'OPEN_TIER',
        description: ipinfoToken
          ? 'IPinfo Lite Token Configured (50,000 req/mo)'
          : 'Free Open Network Geolocation & ASN fallback',
      },
      abuseipdb: {
        name: 'AbuseIPDB API v2',
        type: 'FREE_ACCOUNT_API',
        configured: !!abuseKey,
        status: abuseKey ? 'CONNECTED' : 'NOT_CONFIGURED',
        description: abuseKey
          ? 'AbuseIPDB API v2 Key Active (1,000 checks/day)'
          : 'Optional free API key missing. Add ABUSEIPDB_API_KEY to enable reputation checks.',
      },
      virustotal: {
        name: 'VirusTotal Community API v3',
        type: 'OPTIONAL_ENRICHMENT',
        configured: !!vtKey,
        status: vtKey ? 'CONNECTED' : 'NOT_CONFIGURED',
        description: vtKey
          ? 'VirusTotal Community Key Active (4 req/min, 500 req/day)'
          : 'Optional community key omitted. Module safely disabled.',
      },
      crtsh: {
        name: 'Certificate Transparency (crt.sh)',
        type: 'FREE_OPEN_SERVICE',
        configured: true,
        status: 'CONNECTED',
        description: 'Direct free public CT log database queries',
      },
      rdap: {
        name: 'RDAP (Domain/IP Registry)',
        type: 'FREE_OPEN_SERVICE',
        configured: true,
        status: 'CONNECTED',
        description: 'Official ICANN/IANA bootstrap RDAP registry',
      },
      dns: {
        name: 'Authoritative Direct DNS',
        type: 'FREE_NATIVE',
        configured: true,
        status: 'CONNECTED',
        description: 'Direct recursive DNS resolution (A, AAAA, MX, NS, TXT, SOA, CAA, PTR, SPF, DMARC)',
      },
      wayback: {
        name: 'Internet Archive Wayback Machine',
        type: 'FREE_OPEN_SERVICE',
        configured: true,
        status: 'CONNECTED',
        description: 'Public CDX historical snapshot archive',
      },
    },
  });
});

// 5. Test Integration Endpoint
apiRouter.post('/settings/test', async (req: Request, res: Response) => {
  const { service } = req.body;
  try {
    if (service === 'github') {
      const gh = await lookupGitHubUser('octocat');
      return res.json({
        service,
        success: gh.status === 'FOUND',
        message: `GitHub API responded successfully. Rate limit remaining: ${gh.rateLimit.remaining}/${gh.rateLimit.limit}`,
        rateLimit: gh.rateLimit,
      });
    }

    if (service === 'ipinfo') {
      const ip = await lookupIpInfo('8.8.8.8');
      return res.json({
        service,
        success: ip.status === 'FOUND',
        message: `IPinfo query succeeded for 8.8.8.8 (${ip.data?.org || ip.data?.country || 'OK'})`,
        data: ip.data,
      });
    }

    if (service === 'abuseipdb') {
      if (!process.env.ABUSEIPDB_API_KEY) {
        return res.status(400).json({ success: false, message: 'ABUSEIPDB_API_KEY is not configured in environment' });
      }
      const abuse = await checkAbuseIpDb('127.0.0.1');
      return res.json({
        service,
        success: abuse.status === 'FOUND' || abuse.status === 'OPTIONAL_NOT_CONFIGURED',
        message: abuse.status === 'FOUND' ? 'AbuseIPDB API key verified successfully' : abuse.error,
      });
    }

    if (service === 'virustotal') {
      if (!process.env.VIRUSTOTAL_API_KEY) {
        return res.status(400).json({ success: false, message: 'VIRUSTOTAL_API_KEY is not configured in environment' });
      }
      const vt = await checkVirusTotal('8.8.8.8', 'IP');
      return res.json({
        service,
        success: vt.status === 'FOUND',
        message: vt.status === 'FOUND' ? 'VirusTotal API key verified' : vt.error,
      });
    }

    res.status(400).json({ error: `Unknown service '${service}'` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. HIBP Pwned Passwords k-Anonymity Check
apiRouter.post('/pwnedpass', apiRateLimiter, async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password string is required in request body.' });
    }
    const result = await checkPwnedPassword(password);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Pwned password check failed' });
  }
});

// 7. Dedicated Username Multi-Engine Runner
apiRouter.post('/investigate/username', apiRateLimiter, async (req: Request, res: Response) => {
  try {
    const { username, refresh } = req.body;
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username string is required in request body.' });
    }
    const cleanUsername = username.replace(/^@/, '').trim();
    if (cleanUsername.length === 0 || cleanUsername.length > 100) {
      return res.status(400).json({ error: 'Username must be between 1 and 100 characters.' });
    }

    const results = await runUsernameInvestigation(cleanUsername, { refresh: !!refresh });
    res.json(results);
  } catch (err: any) {
    console.error('Username investigation error:', err);
    res.status(500).json({
      error: 'Username search failed',
      message: err.message || 'An unexpected error occurred during username investigation',
    });
  }
});

// 8. Core Multi-Module Investigation Runner
apiRouter.post('/investigate', apiRateLimiter, async (req: Request, res: Response) => {
  try {
    const { target, modules, targetType } = req.body;
    if (!target || typeof target !== 'string') {
      return res.status(400).json({ error: 'Target query string is required.' });
    }

    const cleanTarget = target.trim();
    if (cleanTarget.length === 0 || cleanTarget.length > 250) {
      return res.status(400).json({ error: 'Target must be between 1 and 250 characters.' });
    }

    const investigation = await runInvestigation(cleanTarget, modules, targetType);
    res.json(investigation);
  } catch (err: any) {
    console.error('Investigation execution error:', err);
    res.status(500).json({
      error: 'Search could not be completed',
      message: err.message || 'An unexpected error occurred during investigation execution',
    });
  }
});

// Mount the API Router on /api and root fallback
app.use('/api', apiRouter);

export default app;
