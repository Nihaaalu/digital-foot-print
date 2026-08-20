import dns from 'dns/promises';
import { detectTargetType, TargetAnalysis } from './detector.js';
import { resolveDns } from './dnsService.js';
import { lookupDomainRdap, lookupIpRdap } from './rdapService.js';
import { searchCertificateTransparency } from './crtshService.js';
import { inspectTls } from './tlsService.js';
import { lookupGitHubUser } from './githubService.js';
import { lookupIpInfo } from './ipinfoService.js';
import { checkAbuseIpDb } from './abuseipdbService.js';
import { checkVirusTotal } from './virustotalService.js';
import { lookupWaybackMachine } from './waybackService.js';
import { probeUsername } from './usernameService.js';
import { analyzeEmail } from './emailService.js';
import { inspectPassiveHttp } from './passiveHttpService.js';
import { lookupWhoisFreaks, WhoisFreaksAnalysis } from './whoisFreaksService.js';
import { buildCorrelatedGraph, CorrelatedGraph } from './correlator.js';
import { calculateExposureScore, ExposureScoreResult } from './exposureScore.js';

export interface InvestigationResult {
  id: string;
  target: TargetAnalysis;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  exposureScore: ExposureScoreResult;
  graph: CorrelatedGraph;
  modules: {
    usernameProbe?: any;
    github?: any;
    email?: any;
    dns?: any;
    rdap?: any;
    whoisFreaks?: WhoisFreaksAnalysis;
    crtsh?: any;
    tls?: any;
    ipinfo?: any;
    abuseipdb?: any;
    virustotal?: any;
    wayback?: any;
    passiveHttp?: any;
  };
  sources: Array<{
    name: string;
    sourceUrl?: string;
    status: string;
    timestamp: string;
    category: string;
  }>;
}

export async function runInvestigation(
  rawInput: string,
  selectedModules?: string[],
  manualTargetType?: string
): Promise<InvestigationResult> {
  const startTime = Date.now();
  const startedAt = new Date().toISOString();
  const target = detectTargetType(rawInput, manualTargetType);
  const id = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const modules: InvestigationResult['modules'] = {};
  const sources: InvestigationResult['sources'] = [];

  const shouldRun = (modName: string) => !selectedModules || selectedModules.length === 0 || selectedModules.includes(modName);

  // Helper to record source
  const recordSource = (name: string, sourceUrl: string | undefined, status: string, category: string) => {
    sources.push({
      name,
      sourceUrl,
      status,
      timestamp: new Date().toISOString(),
      category,
    });
  };

  // Branch based on detected type
  if (target.type === 'USERNAME') {
    const username = target.normalized;

    const [uProbe, gh] = await Promise.allSettled([
      shouldRun('username_probe') ? probeUsername(username) : Promise.resolve(null),
      shouldRun('github') ? lookupGitHubUser(username) : Promise.resolve(null),
    ]);

    if (uProbe.status === 'fulfilled' && uProbe.value) {
      modules.usernameProbe = uProbe.value;
      recordSource('Multi-Platform Username Discovery', undefined, 'FOUND', 'Identity');
    }

    if (gh.status === 'fulfilled' && gh.value) {
      modules.github = gh.value;
      recordSource('GitHub REST API v3', gh.value.sourceUrl, gh.value.status, 'Developer Identity');

      // If GitHub profile reveals blog domain, cascade domain DNS lookup
      if (gh.value.profile?.blog) {
        const blogDomain = gh.value.profile.blog.replace(/^https?:\/\//, '').split('/')[0];
        if (blogDomain && shouldRun('dns')) {
          const blogDns = await resolveDns(blogDomain).catch(() => null);
          if (blogDns) {
            modules.dns = blogDns;
            recordSource('Authoritative DNS (Cascaded from GitHub Blog)', undefined, 'FOUND', 'Domain Infrastructure');
          }
        }
      }
    }
  } else if (target.type === 'EMAIL') {
    const email = target.normalized;
    const { username, domain } = target.details;

    const [emailRes, dnsRes, rdapRes] = await Promise.allSettled([
      shouldRun('email') ? analyzeEmail(email) : Promise.resolve(null),
      domain && shouldRun('dns') ? resolveDns(domain) : Promise.resolve(null),
      domain && shouldRun('rdap') ? lookupDomainRdap(domain) : Promise.resolve(null),
    ]);

    if (emailRes.status === 'fulfilled' && emailRes.value) {
      modules.email = emailRes.value;
      recordSource('Email Verification & Gravatar', emailRes.value.manualBreachCheckUrl, 'FOUND', 'Identity');
    }
    if (dnsRes.status === 'fulfilled' && dnsRes.value) {
      modules.dns = dnsRes.value;
      recordSource('Authoritative DNS (Email Domain)', undefined, 'FOUND', 'Infrastructure');
    }
    if (rdapRes.status === 'fulfilled' && rdapRes.value) {
      modules.rdap = rdapRes.value;
      recordSource('RDAP (Email Domain Registry)', rdapRes.value.sourceUrl, rdapRes.value.status, 'Registry');
    }

    if (username && shouldRun('username_probe')) {
      const uProbe = await probeUsername(username).catch(() => null);
      if (uProbe) {
        modules.usernameProbe = uProbe;
        recordSource('Username Probe (Cascaded from Email Local-Part)', undefined, 'FOUND', 'Identity');
      }
    }
  } else if (target.type === 'DOMAIN' || target.type === 'URL') {
    const domain = target.type === 'URL' ? target.details.domain! : target.normalized;
    const urlForHttp = target.type === 'URL' ? target.normalized : `https://${domain}`;

    const [dnsRes, rdapRes, whoisRes, crtshRes, tlsRes, httpRes, waybackRes, vtRes] = await Promise.allSettled([
      shouldRun('dns') ? resolveDns(domain) : Promise.resolve(null),
      shouldRun('rdap') ? lookupDomainRdap(domain) : Promise.resolve(null),
      shouldRun('whoisfreaks') || shouldRun('whois') ? lookupWhoisFreaks(domain) : Promise.resolve(null),
      shouldRun('crtsh') ? searchCertificateTransparency(domain) : Promise.resolve(null),
      shouldRun('tls') ? inspectTls(domain) : Promise.resolve(null),
      shouldRun('passiveHttp') ? inspectPassiveHttp(urlForHttp) : Promise.resolve(null),
      shouldRun('wayback') ? lookupWaybackMachine(domain) : Promise.resolve(null),
      shouldRun('virustotal') ? checkVirusTotal(domain, 'DOMAIN') : Promise.resolve(null),
    ]);

    if (dnsRes.status === 'fulfilled' && dnsRes.value) {
      modules.dns = dnsRes.value;
      recordSource('Authoritative DNS', undefined, 'FOUND', 'Infrastructure');

      // IPinfo lookup on primary A record
      const primaryIp = dnsRes.value.records.A[0];
      if (primaryIp && shouldRun('ipinfo')) {
        const [ipinfoRes, abuseRes] = await Promise.allSettled([
          lookupIpInfo(primaryIp),
          shouldRun('abuseipdb') ? checkAbuseIpDb(primaryIp) : Promise.resolve(null),
        ]);
        if (ipinfoRes.status === 'fulfilled' && ipinfoRes.value) {
          modules.ipinfo = ipinfoRes.value;
          recordSource(ipinfoRes.value.source, ipinfoRes.value.sourceUrl, ipinfoRes.value.status, 'IP Intelligence');
        }
        if (abuseRes.status === 'fulfilled' && abuseRes.value) {
          modules.abuseipdb = abuseRes.value;
          recordSource(abuseRes.value.source, abuseRes.value.sourceUrl, abuseRes.value.status, 'Threat Reputation');
        }
      }
    }

    if (rdapRes.status === 'fulfilled' && rdapRes.value) {
      modules.rdap = rdapRes.value;
      recordSource(rdapRes.value.source, rdapRes.value.sourceUrl, rdapRes.value.status, 'Registry');
    }
    if (whoisRes.status === 'fulfilled' && whoisRes.value) {
      modules.whoisFreaks = whoisRes.value;
      recordSource('WhoisFreaks Live WHOIS', whoisRes.value.sourceUrl || 'https://whoisfreaks.com', whoisRes.value.status, 'Domain Registration');
    }
    if (crtshRes.status === 'fulfilled' && crtshRes.value) {
      modules.crtsh = crtshRes.value;
      recordSource('Certificate Transparency (crt.sh)', crtshRes.value.sourceUrl, crtshRes.value.status, 'Certificates');
    }
    if (tlsRes.status === 'fulfilled' && tlsRes.value) {
      modules.tls = tlsRes.value;
      recordSource('Direct TLS Handshake (port 443)', undefined, tlsRes.value.status, 'Encryption');
    }
    if (httpRes.status === 'fulfilled' && httpRes.value) {
      modules.passiveHttp = httpRes.value;
      recordSource('Passive HTTP Header & Tech Fingerprint', httpRes.value.url, 'FOUND', 'Web Surface');
    }
    if (waybackRes.status === 'fulfilled' && waybackRes.value) {
      modules.wayback = waybackRes.value;
      recordSource('Internet Archive Wayback Machine', waybackRes.value.sourceUrl, waybackRes.value.status, 'Historical Archive');
    }
    if (vtRes.status === 'fulfilled' && vtRes.value) {
      modules.virustotal = vtRes.value;
      recordSource(vtRes.value.source, vtRes.value.sourceUrl, vtRes.value.status, 'Threat Reputation');
    }
  } else if (target.type === 'IPV4' || target.type === 'IPV6') {
    const ip = target.normalized;

    const [rdapRes, ipinfoRes, abuseRes, vtRes, ptrRes, tlsRes] = await Promise.allSettled([
      shouldRun('rdap') ? lookupIpRdap(ip) : Promise.resolve(null),
      shouldRun('ipinfo') ? lookupIpInfo(ip) : Promise.resolve(null),
      shouldRun('abuseipdb') ? checkAbuseIpDb(ip) : Promise.resolve(null),
      shouldRun('virustotal') ? checkVirusTotal(ip, 'IP') : Promise.resolve(null),
      dns.reverse(ip).catch(() => [] as string[]),
      shouldRun('tls') ? inspectTls(ip) : Promise.resolve(null),
    ]);

    if (rdapRes.status === 'fulfilled' && rdapRes.value) {
      modules.rdap = rdapRes.value;
      recordSource(rdapRes.value.source, rdapRes.value.sourceUrl, rdapRes.value.status, 'Registry');
    }
    if (ipinfoRes.status === 'fulfilled' && ipinfoRes.value) {
      modules.ipinfo = ipinfoRes.value;
      if (ptrRes.status === 'fulfilled' && ptrRes.value.length > 0 && modules.ipinfo.data) {
        modules.ipinfo.data.hostname = ptrRes.value[0];
      }
      recordSource(ipinfoRes.value.source, ipinfoRes.value.sourceUrl, ipinfoRes.value.status, 'IP Intelligence');
    }
    if (abuseRes.status === 'fulfilled' && abuseRes.value) {
      modules.abuseipdb = abuseRes.value;
      recordSource(abuseRes.value.source, abuseRes.value.sourceUrl, abuseRes.value.status, 'Threat Reputation');
    }
    if (vtRes.status === 'fulfilled' && vtRes.value) {
      modules.virustotal = vtRes.value;
      recordSource(vtRes.value.source, vtRes.value.sourceUrl, vtRes.value.status, 'Threat Reputation');
    }
    if (tlsRes.status === 'fulfilled' && tlsRes.value) {
      modules.tls = tlsRes.value;
      recordSource('Direct TLS Handshake (port 443)', undefined, tlsRes.value.status, 'Encryption');
    }
  } else {
    // Fallback: try username probe + domain probe
    const [uProbe] = await Promise.allSettled([probeUsername(target.normalized)]);
    if (uProbe.status === 'fulfilled' && uProbe.value) {
      modules.usernameProbe = uProbe.value;
      recordSource('Multi-Platform Username Discovery', undefined, 'FOUND', 'Identity');
    }
  }

  // Correlate all module outputs into Graph
  const graph = buildCorrelatedGraph(target, modules);

  // Derive Exposure Score
  const exposureScore = calculateExposureScore(modules);

  const completedAt = new Date().toISOString();
  const durationMs = Date.now() - startTime;

  return {
    id,
    target,
    startedAt,
    completedAt,
    durationMs,
    exposureScore,
    graph,
    modules,
    sources,
  };
}
