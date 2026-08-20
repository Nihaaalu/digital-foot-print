export type NodeType =
  | 'TARGET'
  | 'PERSON'
  | 'USERNAME'
  | 'EMAIL'
  | 'DOMAIN'
  | 'SUBDOMAIN'
  | 'IP'
  | 'ASN'
  | 'ORGANIZATION'
  | 'REPOSITORY'
  | 'CERTIFICATE'
  | 'SOCIAL_PROFILE'
  | 'TECHNOLOGY';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  value: string;
  confidence: 'CONFIRMED' | 'HIGH' | 'MEDIUM' | 'LOW';
  source: string;
  sourceUrl?: string;
  timestamp: string;
  metadata?: Record<string, any>;
  position?: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type?: string;
  animated?: boolean;
}

export interface CorrelatedGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: {
    totalNodes: number;
    totalEdges: number;
    identitiesCount: number;
    domainsCount: number;
    ipsCount: number;
    subdomainsCount: number;
    certificatesCount: number;
    repositoriesCount: number;
    technologiesCount: number;
  };
}

export function buildCorrelatedGraph(target: { raw: string; type: string; normalized: string }, results: any): CorrelatedGraph {
  const nodesMap = new Map<string, GraphNode>();
  const edgesMap = new Map<string, GraphEdge>();

  const addNode = (node: Omit<GraphNode, 'position'>) => {
    if (!nodesMap.has(node.id)) {
      nodesMap.set(node.id, { ...node, position: { x: 0, y: 0 } });
    }
  };

  const addEdge = (source: string, targetNode: string, label: string) => {
    const edgeId = `${source}->${targetNode}:${label}`;
    if (!edgesMap.has(edgeId) && source !== targetNode) {
      edgesMap.set(edgeId, {
        id: edgeId,
        source,
        target: targetNode,
        label,
        type: 'smoothstep',
      });
    }
  };

  // 1. Root Target Node
  const rootId = `target:${target.normalized}`;
  addNode({
    id: rootId,
    type: 'TARGET',
    label: target.normalized,
    value: target.normalized,
    confidence: 'CONFIRMED',
    source: 'Investigation Target Input',
    timestamp: new Date().toISOString(),
    metadata: { inputType: target.type },
  });

  // 2. Process Username Probes
  if (results.usernameProbe?.accounts) {
    for (const acc of results.usernameProbe.accounts) {
      if (acc.status === 'FOUND') {
        const nodeId = `profile:${acc.platform.toLowerCase()}:${acc.username}`;
        addNode({
          id: nodeId,
          type: 'SOCIAL_PROFILE',
          label: `${acc.platform} (@${acc.username})`,
          value: acc.profileUrl,
          confidence: acc.confidence || 'HIGH',
          source: acc.source,
          sourceUrl: acc.profileUrl,
          timestamp: acc.timestamp,
          metadata: { platform: acc.platform, category: acc.category },
        });
        addEdge(rootId, nodeId, 'HAS_PROFILE');
      }
    }
  }

  // 3. Process GitHub Profile, Repos, Orgs, and Emails
  if (results.github?.status === 'FOUND' && results.github.profile) {
    const gh = results.github;
    const ghNodeId = `github:${gh.profile.login}`;
    addNode({
      id: ghNodeId,
      type: 'USERNAME',
      label: `GitHub: ${gh.profile.name || gh.profile.login}`,
      value: gh.profile.login,
      confidence: 'CONFIRMED',
      source: 'GitHub REST API',
      sourceUrl: gh.profile.htmlUrl,
      timestamp: gh.timestamp,
      metadata: {
        avatar: gh.profile.avatarUrl,
        bio: gh.profile.bio,
        company: gh.profile.company,
        location: gh.profile.location,
        followers: gh.profile.followers,
        publicRepos: gh.profile.publicRepos,
      },
    });
    addEdge(rootId, ghNodeId, 'GITHUB_IDENTITY');

    if (gh.profile.email) {
      const emailNodeId = `email:${gh.profile.email.toLowerCase()}`;
      addNode({
        id: emailNodeId,
        type: 'EMAIL',
        label: gh.profile.email,
        value: gh.profile.email,
        confidence: 'CONFIRMED',
        source: 'GitHub Public Profile',
        timestamp: gh.timestamp,
      });
      addEdge(ghNodeId, emailNodeId, 'PUBLIC_EMAIL');
    }

    if (gh.profile.blog) {
      const blogDomain = gh.profile.blog.replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
      if (blogDomain) {
        const blogNodeId = `domain:${blogDomain}`;
        addNode({
          id: blogNodeId,
          type: 'DOMAIN',
          label: blogDomain,
          value: blogDomain,
          confidence: 'HIGH',
          source: 'GitHub Profile Blog Link',
          timestamp: gh.timestamp,
        });
        addEdge(ghNodeId, blogNodeId, 'ASSOCIATED_DOMAIN');
      }
    }

    // Repositories
    for (const repo of (gh.repositories || []).slice(0, 8)) {
      const repoNodeId = `repo:${repo.fullName}`;
      addNode({
        id: repoNodeId,
        type: 'REPOSITORY',
        label: repo.name,
        value: repo.htmlUrl,
        confidence: 'CONFIRMED',
        source: 'GitHub API',
        sourceUrl: repo.htmlUrl,
        timestamp: gh.timestamp,
        metadata: {
          language: repo.language,
          stars: repo.stars,
          forks: repo.forks,
        },
      });
      addEdge(ghNodeId, repoNodeId, 'OWNS_REPO');
    }

    // Organizations
    for (const org of (gh.organizations || []).slice(0, 5)) {
      const orgNodeId = `org:${org.login}`;
      addNode({
        id: orgNodeId,
        type: 'ORGANIZATION',
        label: org.login,
        value: org.htmlUrl,
        confidence: 'CONFIRMED',
        source: 'GitHub API',
        sourceUrl: org.htmlUrl,
        timestamp: gh.timestamp,
      });
      addEdge(ghNodeId, orgNodeId, 'MEMBER_OF');
    }

    // Associated commit emails
    if (gh.publicEventsSummary?.associatedEmails) {
      for (const commitEmail of gh.publicEventsSummary.associatedEmails) {
        const commitEmailId = `email:${commitEmail.toLowerCase()}`;
        addNode({
          id: commitEmailId,
          type: 'EMAIL',
          label: commitEmail,
          value: commitEmail,
          confidence: 'HIGH',
          source: 'GitHub Public Commit Event Logs',
          timestamp: gh.timestamp,
        });
        addEdge(ghNodeId, commitEmailId, 'COMMIT_AUTHOR_EMAIL');
      }
    }
  }

  // 4. Process Email Analysis
  if (results.email?.email) {
    const em = results.email;
    const emNodeId = `email:${em.email}`;
    addNode({
      id: emNodeId,
      type: 'EMAIL',
      label: em.email,
      value: em.email,
      confidence: 'CONFIRMED',
      source: em.source,
      timestamp: em.timestamp,
      metadata: { gravatar: em.gravatar?.hasGravatar },
    });
    addEdge(rootId, emNodeId, 'TARGET_EMAIL');

    const domNodeId = `domain:${em.domain}`;
    addNode({
      id: domNodeId,
      type: 'DOMAIN',
      label: em.domain,
      value: em.domain,
      confidence: 'CONFIRMED',
      source: 'Email Domain Extraction',
      timestamp: em.timestamp,
    });
    addEdge(emNodeId, domNodeId, 'HOSTED_ON_DOMAIN');

    if (em.gravatar?.hasGravatar) {
      const gravatarId = `profile:gravatar:${em.localPart}`;
      addNode({
        id: gravatarId,
        type: 'SOCIAL_PROFILE',
        label: `Gravatar (${em.email})`,
        value: em.gravatar.profileUrl || `https://gravatar.com/${em.gravatar.hash}`,
        confidence: 'CONFIRMED',
        source: 'Gravatar Avatar Database',
        timestamp: em.timestamp,
        metadata: { avatar: em.gravatar.avatarUrl },
      });
      addEdge(emNodeId, gravatarId, 'GRAVATAR_IDENTITY');
    }
  }

  // 5. Process DNS Analysis
  if (results.dns?.domain) {
    const dnsData = results.dns;
    const domainNodeId = `domain:${dnsData.domain}`;
    addNode({
      id: domainNodeId,
      type: 'DOMAIN',
      label: dnsData.domain,
      value: dnsData.domain,
      confidence: 'CONFIRMED',
      source: dnsData.source,
      timestamp: dnsData.timestamp,
      metadata: {
        hasSpf: dnsData.security.spf.present,
        hasDmarc: dnsData.security.dmarc.present,
      },
    });
    if (rootId !== domainNodeId) {
      addEdge(rootId, domainNodeId, 'DNS_DOMAIN');
    }

    // A records -> IP nodes
    for (const ip of (dnsData.records.A || []).slice(0, 8)) {
      const ipNodeId = `ip:${ip}`;
      addNode({
        id: ipNodeId,
        type: 'IP',
        label: ip,
        value: ip,
        confidence: 'CONFIRMED',
        source: 'Authoritative DNS (A Record)',
        timestamp: dnsData.timestamp,
      });
      addEdge(domainNodeId, ipNodeId, 'RESOLVES_TO');
    }

    // MX records
    for (const mx of (dnsData.records.MX || []).slice(0, 4)) {
      const mxDomain = mx.exchange.toLowerCase().replace(/\.$/, '');
      const mxNodeId = `domain:${mxDomain}`;
      addNode({
        id: mxNodeId,
        type: 'DOMAIN',
        label: `MX: ${mxDomain}`,
        value: mxDomain,
        confidence: 'CONFIRMED',
        source: 'Authoritative DNS (MX Record)',
        timestamp: dnsData.timestamp,
      });
      addEdge(domainNodeId, mxNodeId, 'MAIL_EXCHANGE');
    }
  }

  // 6. Process RDAP & WhoisFreaks
  if (results.rdap?.status === 'FOUND' && results.rdap.data) {
    const rdap = results.rdap.data;
    if (rdap.registrar && !rdap.registrar.toLowerCase().includes('unknown') && !rdap.registrar.toLowerCase().includes('privacy')) {
      const regId = `org:registrar:${rdap.registrar.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      addNode({
        id: regId,
        type: 'ORGANIZATION',
        label: `Registrar: ${rdap.registrar}`,
        value: rdap.registrar,
        confidence: 'CONFIRMED',
        source: results.rdap.source,
        timestamp: results.rdap.timestamp,
        metadata: {
          creationDate: rdap.creationDate,
          expirationDate: rdap.expirationDate,
        },
      });
      addEdge(rootId, regId, 'REGISTERED_WITH');
    }
  }

  // WhoisFreaks WHOIS processing (correlated with target domain)
  if (results.whoisFreaks?.status === 'FOUND') {
    const whois = results.whoisFreaks;
    const domainNodeId = `domain:${whois.domain}`;

    // Registrar node (if not already added or to enrich)
    if (whois.registrar && whois.registrar !== 'Not available' && !whois.registrar.toLowerCase().includes('unknown')) {
      const regId = `org:registrar:${whois.registrar.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      addNode({
        id: regId,
        type: 'ORGANIZATION',
        label: `Registrar: ${whois.registrar}`,
        value: whois.registrar,
        confidence: 'CONFIRMED',
        source: 'WhoisFreaks Live WHOIS',
        timestamp: whois.timestamp,
        metadata: {
          createdDate: whois.createdDate,
          expiryDate: whois.expiryDate,
          ianaId: whois.registrarIanaId,
        },
      });
      addEdge(rootId !== domainNodeId ? rootId : domainNodeId, regId, 'REGISTERED_WITH');
    }

    // Nameservers (up to 4)
    if (Array.isArray(whois.nameServers)) {
      for (const ns of whois.nameServers.slice(0, 4)) {
        const nsDomain = ns.toLowerCase().replace(/\.$/, '');
        const nsNodeId = `domain:ns:${nsDomain}`;
        addNode({
          id: nsNodeId,
          type: 'DOMAIN',
          label: `NS: ${nsDomain}`,
          value: nsDomain,
          confidence: 'CONFIRMED',
          source: 'WhoisFreaks Live WHOIS',
          timestamp: whois.timestamp,
        });
        addEdge(domainNodeId, nsNodeId, 'NAMESERVER');
      }
    }

    // Registrant Organization if public and unredacted
    if (
      whois.registrant?.organization &&
      !whois.registrant.organization.toLowerCase().includes('privacy') &&
      !whois.registrant.organization.toLowerCase().includes('redacted') &&
      !whois.registrant.organization.toLowerCase().includes('whoisguard') &&
      !whois.registrant.organization.toLowerCase().includes('not available')
    ) {
      const orgId = `org:registrant:${whois.registrant.organization.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      addNode({
        id: orgId,
        type: 'ORGANIZATION',
        label: `Registrant: ${whois.registrant.organization}`,
        value: whois.registrant.organization,
        confidence: 'CONFIRMED',
        source: 'WhoisFreaks Live WHOIS',
        timestamp: whois.timestamp,
        metadata: {
          country: whois.registrant.country,
          city: whois.registrant.city,
        },
      });
      addEdge(domainNodeId, orgId, 'REGISTERED_BY');
    }
  }

  // 7. Process Certificate Transparency (crt.sh)
  if (results.crtsh?.subdomains) {
    const domainTarget = results.crtsh.domain;
    const parentDomainId = `domain:${domainTarget}`;

    for (const sub of results.crtsh.subdomains.slice(0, 15)) {
      if (sub.hostname !== domainTarget) {
        const subId = `subdomain:${sub.hostname}`;
        addNode({
          id: subId,
          type: 'SUBDOMAIN',
          label: sub.hostname,
          value: sub.hostname,
          confidence: sub.resolved ? 'CONFIRMED' : 'HIGH',
          source: 'Certificate Transparency (crt.sh)',
          timestamp: results.crtsh.timestamp,
          metadata: { isWildcard: sub.isWildcard, resolved: sub.resolved, ips: sub.ips },
        });
        addEdge(parentDomainId, subId, 'HAS_SUBDOMAIN');

        for (const subIp of sub.ips) {
          const ipId = `ip:${subIp}`;
          addNode({
            id: ipId,
            type: 'IP',
            label: subIp,
            value: subIp,
            confidence: 'CONFIRMED',
            source: 'Subdomain DNS Resolution',
            timestamp: results.crtsh.timestamp,
          });
          addEdge(subId, ipId, 'RESOLVES_TO');
        }
      }
    }
  }

  // 8. Process IPinfo & ASN
  if (results.ipinfo?.status === 'FOUND' && results.ipinfo.data) {
    const ipData = results.ipinfo.data;
    const ipId = `ip:${results.ipinfo.ip}`;

    if (ipData.asn) {
      const asnId = `asn:${ipData.asn}`;
      addNode({
        id: asnId,
        type: 'ASN',
        label: `${ipData.asn} (${ipData.asName || 'Autonomous System'})`,
        value: ipData.asn,
        confidence: 'CONFIRMED',
        source: results.ipinfo.source,
        timestamp: results.ipinfo.timestamp,
        metadata: { org: ipData.org, country: ipData.country },
      });
      addEdge(ipId, asnId, 'PART_OF_ASN');
    }

    if (ipData.org && !ipData.asn) {
      const orgId = `org:${ipData.org.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      addNode({
        id: orgId,
        type: 'ORGANIZATION',
        label: ipData.org,
        value: ipData.org,
        confidence: 'HIGH',
        source: results.ipinfo.source,
        timestamp: results.ipinfo.timestamp,
      });
      addEdge(ipId, orgId, 'NETWORK_OWNER');
    }
  }

  // 9. Process TLS Handshake
  if (results.tls?.status === 'FOUND' && results.tls.data) {
    const tlsData = results.tls.data;
    const certId = `cert:${tlsData.serialNumber || tlsData.fingerprint256.slice(0, 16)}`;
    const issuerName = tlsData.issuer.O || tlsData.issuer.CN || 'TLS Certificate';
    addNode({
      id: certId,
      type: 'CERTIFICATE',
      label: `Cert (${issuerName})`,
      value: tlsData.fingerprint256,
      confidence: 'CONFIRMED',
      source: results.tls.source,
      timestamp: results.tls.timestamp,
      metadata: {
        validFrom: tlsData.validFrom,
        validTo: tlsData.validTo,
        daysRemaining: tlsData.daysRemaining,
        protocol: tlsData.protocol,
        cipher: tlsData.cipher,
      },
    });
    addEdge(rootId, certId, 'TLS_CERTIFICATE');
  }

  // 10. Process Passive Technologies
  if (results.passiveHttp?.technologies) {
    for (const tech of (results.passiveHttp.technologies as any[]).slice(0, 10)) {
      const techId = `tech:${tech.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      addNode({
        id: techId,
        type: 'TECHNOLOGY',
        label: tech.name,
        value: tech.name,
        confidence: tech.confidence === 'Detected' ? 'CONFIRMED' : 'HIGH',
        source: results.passiveHttp.source,
        timestamp: results.passiveHttp.timestamp,
        metadata: { category: tech.category, evidence: tech.evidence },
      });
      addEdge(rootId, techId, 'USES_TECH');
    }
  }

  // Calculate Layout Positions (Radial / Concentric Ring Distribution)
  const nodes = Array.from(nodesMap.values());
  const edges = Array.from(edgesMap.values());

  const centerX = 400;
  const centerY = 350;

  // Root center
  const rootNode = nodes.find((n) => n.id === rootId);
  if (rootNode) {
    rootNode.position = { x: centerX, y: centerY };
  }

  // Group nodes by type for concentric rings
  const otherNodes = nodes.filter((n) => n.id !== rootId);
  const totalOthers = otherNodes.length;

  if (totalOthers > 0) {
    const ring1: GraphNode[] = [];
    const ring2: GraphNode[] = [];

    for (const n of otherNodes) {
      if (['DOMAIN', 'IP', 'USERNAME', 'EMAIL'].includes(n.type)) {
        ring1.push(n);
      } else {
        ring2.push(n);
      }
    }

    // Place Ring 1 (Radius 220)
    const r1Len = ring1.length;
    ring1.forEach((n, idx) => {
      const angle = (idx / (r1Len || 1)) * 2 * Math.PI - Math.PI / 2;
      n.position = {
        x: Math.round(centerX + 240 * Math.cos(angle)),
        y: Math.round(centerY + 200 * Math.sin(angle)),
      };
    });

    // Place Ring 2 (Radius 420)
    const r2Len = ring2.length;
    ring2.forEach((n, idx) => {
      const angle = (idx / (r2Len || 1)) * 2 * Math.PI - Math.PI / 4;
      n.position = {
        x: Math.round(centerX + 440 * Math.cos(angle)),
        y: Math.round(centerY + 360 * Math.sin(angle)),
      };
    });
  }

  const identitiesCount = nodes.filter((n) => ['PERSON', 'USERNAME', 'SOCIAL_PROFILE'].includes(n.type)).length;
  const domainsCount = nodes.filter((n) => n.type === 'DOMAIN').length;
  const ipsCount = nodes.filter((n) => n.type === 'IP').length;
  const subdomainsCount = nodes.filter((n) => n.type === 'SUBDOMAIN').length;
  const certificatesCount = nodes.filter((n) => n.type === 'CERTIFICATE').length;
  const repositoriesCount = nodes.filter((n) => n.type === 'REPOSITORY').length;
  const technologiesCount = nodes.filter((n) => n.type === 'TECHNOLOGY').length;

  return {
    nodes,
    edges,
    summary: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      identitiesCount,
      domainsCount,
      ipsCount,
      subdomainsCount,
      certificatesCount,
      repositoriesCount,
      technologiesCount,
    },
  };
}
