import { safeFetch, validateSafeHost } from '../security.js';
import { osintCache } from '../cache.js';

export interface DetectedTechnology {
  name: string;
  category: 'Web Server' | 'CDN / Proxy' | 'Frontend Framework' | 'CMS' | 'Backend Framework' | 'CSS Framework' | 'Analytics' | 'Programming Language';
  confidence: 'Detected' | 'Likely' | 'Possible';
  evidence: string;
}

export interface SecurityHeadersAnalysis {
  hsts: { present: boolean; value?: string };
  csp: { present: boolean; value?: string };
  xFrameOptions: { present: boolean; value?: string };
  xContentTypeOptions: { present: boolean; value?: string };
  referrerPolicy: { present: boolean; value?: string };
  permissionsPolicy: { present: boolean; value?: string };
  score: number; // 0 to 100
}

export interface PassiveHttpAnalysis {
  url: string;
  finalUrl: string;
  statusCode: number;
  statusText: string;
  timestamp: string;
  source: string;
  redirectCount: number;
  redirectChain: string[];
  headers: Record<string, string>;
  cookies: string[];
  technologies: DetectedTechnology[];
  securityHeaders: SecurityHeadersAnalysis;
}

export async function inspectPassiveHttp(targetUrl: string): Promise<PassiveHttpAnalysis> {
  let normalizedUrl = targetUrl.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  const cacheKey = `http_inspect:${normalizedUrl}`;
  const cached = osintCache.get<PassiveHttpAnalysis>(cacheKey);
  if (cached) return cached.data;

  const validation = await validateSafeHost(normalizedUrl);
  if (!validation.safe) {
    throw new Error(`SSRF Prevention: ${validation.error}`);
  }

  const redirectChain: string[] = [normalizedUrl];
  let currentUrl = normalizedUrl;
  let res: Response | null = null;
  let redirects = 0;

  for (let i = 0; i < 5; i++) {
    const fetchRes = await safeFetch(currentUrl, {
      method: 'GET',
      redirect: 'manual',
      timeoutMs: 8000,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    res = fetchRes;
    if ([301, 302, 303, 307, 308].includes(fetchRes.status)) {
      const loc = fetchRes.headers.get('location');
      if (loc) {
        redirects++;
        try {
          currentUrl = new URL(loc, currentUrl).href;
          redirectChain.push(currentUrl);
          const nextValidation = await validateSafeHost(currentUrl);
          if (!nextValidation.safe) break;
          continue;
        } catch {
          break;
        }
      }
    }
    break;
  }

  if (!res) {
    throw new Error('Failed to obtain HTTP response');
  }

  const headers: Record<string, string> = {};
  res.headers.forEach((val, key) => {
    headers[key.toLowerCase()] = val;
  });

  const rawHtml = await res.text().catch(() => '');
  const lowerHtml = rawHtml.toLowerCase();

  // Parse cookies
  const cookies: string[] = [];
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    cookies.push(...setCookie.split(',').map((c) => c.trim().split(';')[0]));
  }

  // Detect technologies
  const techMap = new Map<string, DetectedTechnology>();

  const addTech = (name: string, category: DetectedTechnology['category'], confidence: DetectedTechnology['confidence'], evidence: string) => {
    if (!techMap.has(name)) {
      techMap.set(name, { name, category, confidence, evidence });
    }
  };

  // Server Header checks
  const serverHeader = headers['server'] || '';
  if (serverHeader.includes('cloudflare')) addTech('Cloudflare', 'CDN / Proxy', 'Detected', `Server header: ${serverHeader}`);
  else if (headers['cf-ray']) addTech('Cloudflare', 'CDN / Proxy', 'Detected', 'cf-ray header present');

  if (serverHeader.toLowerCase().includes('nginx')) addTech('Nginx', 'Web Server', 'Detected', `Server header: ${serverHeader}`);
  if (serverHeader.toLowerCase().includes('apache')) addTech('Apache', 'Web Server', 'Detected', `Server header: ${serverHeader}`);
  if (serverHeader.toLowerCase().includes('caddy')) addTech('Caddy', 'Web Server', 'Detected', `Server header: ${serverHeader}`);
  if (serverHeader.toLowerCase().includes('litespeed')) addTech('LiteSpeed', 'Web Server', 'Detected', `Server header: ${serverHeader}`);
  if (serverHeader.toLowerCase().includes('microsoft-iis')) addTech('Microsoft IIS', 'Web Server', 'Detected', `Server header: ${serverHeader}`);

  // X-Powered-By
  const xPowered = headers['x-powered-by'] || '';
  if (xPowered.toLowerCase().includes('express')) addTech('Express.js', 'Backend Framework', 'Detected', `x-powered-by: ${xPowered}`);
  if (xPowered.toLowerCase().includes('php')) addTech('PHP', 'Programming Language', 'Detected', `x-powered-by: ${xPowered}`);
  if (xPowered.toLowerCase().includes('next.js')) addTech('Next.js', 'Frontend Framework', 'Detected', `x-powered-by: ${xPowered}`);
  if (xPowered.toLowerCase().includes('asp.net')) addTech('ASP.NET', 'Backend Framework', 'Detected', `x-powered-by: ${xPowered}`);

  // HTML / DOM Signature checks
  if (lowerHtml.includes('__next') || lowerHtml.includes('/_next/static/')) {
    addTech('Next.js', 'Frontend Framework', 'Detected', 'Next.js hydration DOM markers (/__next or _next/static/)');
    addTech('React', 'Frontend Framework', 'Detected', 'React base framework via Next.js');
  } else if (lowerHtml.includes('react-root') || lowerHtml.includes('data-reactroot') || lowerHtml.includes('react-dom')) {
    addTech('React', 'Frontend Framework', 'Likely', 'React DOM attributes / script patterns found in markup');
  }

  if (lowerHtml.includes('wp-content') || lowerHtml.includes('wp-includes') || lowerHtml.includes('wordpress')) {
    addTech('WordPress', 'CMS', 'Detected', 'wp-content/ or wp-includes/ directory references');
    addTech('PHP', 'Programming Language', 'Likely', 'Associated with WordPress CMS');
  }

  if (lowerHtml.includes('shopify.com') || lowerHtml.includes('cdn.shopify.com')) {
    addTech('Shopify', 'CMS', 'Detected', 'Shopify CDN assets linked');
  }

  if (lowerHtml.includes('drupal.js') || lowerHtml.includes('drupal.org') || lowerHtml.includes('drupalsettings')) {
    addTech('Drupal', 'CMS', 'Detected', 'Drupal settings / script markers in HTML');
  }

  if (lowerHtml.includes('bootstrap.min.css') || lowerHtml.includes('class="btn btn-')) {
    addTech('Bootstrap', 'CSS Framework', 'Likely', 'Bootstrap CSS classes / files in DOM');
  }

  if (lowerHtml.includes('tailwind') || lowerHtml.includes('tailwind.css')) {
    addTech('Tailwind CSS', 'CSS Framework', 'Likely', 'Tailwind stylesheet references');
  }

  if (lowerHtml.includes('vue.js') || lowerHtml.includes('vue.min.js') || lowerHtml.includes('data-v-')) {
    addTech('Vue.js', 'Frontend Framework', 'Likely', 'Vue data-v scoped attribute markers');
  }

  if (lowerHtml.includes('jquery.min.js') || lowerHtml.includes('jquery/')) {
    addTech('jQuery', 'Frontend Framework', 'Detected', 'jQuery script tag linked');
  }

  if (lowerHtml.includes('googletagmanager.com') || lowerHtml.includes('google-analytics.com')) {
    addTech('Google Analytics / GTM', 'Analytics', 'Detected', 'Google Tag Manager integration script');
  }

  // Security headers check
  const hstsPresent = !!headers['strict-transport-security'];
  const cspPresent = !!headers['content-security-policy'];
  const xfoPresent = !!headers['x-frame-options'];
  const xctoPresent = !!headers['x-content-type-options'];
  const refPresent = !!headers['referrer-policy'];
  const permPresent = !!headers['permissions-policy'];

  let secScore = 0;
  if (hstsPresent) secScore += 25;
  if (cspPresent) secScore += 25;
  if (xfoPresent) secScore += 15;
  if (xctoPresent) secScore += 15;
  if (refPresent) secScore += 10;
  if (permPresent) secScore += 10;

  const result: PassiveHttpAnalysis = {
    url: normalizedUrl,
    finalUrl: currentUrl,
    statusCode: res.status,
    statusText: res.statusText,
    timestamp: new Date().toISOString(),
    source: 'Passive HTTP Header & Markup Inspection',
    redirectCount: redirects,
    redirectChain,
    headers,
    cookies,
    technologies: Array.from(techMap.values()),
    securityHeaders: {
      hsts: { present: hstsPresent, value: headers['strict-transport-security'] },
      csp: { present: cspPresent, value: headers['content-security-policy'] },
      xFrameOptions: { present: xfoPresent, value: headers['x-frame-options'] },
      xContentTypeOptions: { present: xctoPresent, value: headers['x-content-type-options'] },
      referrerPolicy: { present: refPresent, value: headers['referrer-policy'] },
      permissionsPolicy: { present: permPresent, value: headers['permissions-policy'] },
      score: secScore,
    },
  };

  osintCache.set(cacheKey, result, 15 * 60 * 1000);
  return result;
}
