import { runUsernameInvestigation } from './usernameEngine/usernameRunner.js';
import {
  DiscoveredAccountFinding,
  UsernameInvestigationSummary,
  UsernameProbeStatus,
  ConfidenceLevel,
  SiteCategory,
} from './usernameEngine/types.js';

export interface DiscoveredAccount {
  platform: string;
  category: string;
  username: string;
  profileUrl: string;
  status: UsernameProbeStatus;
  confidence: ConfidenceLevel;
  evidence: string;
  source: string;
  sources?: string[];
  timestamp: string;
  responseTimeMs?: number;
  isVariation?: boolean;
  variantType?: string;
  metadata?: any;
}

export interface UsernameAnalysis {
  username: string;
  timestamp: string;
  durationMs: number;
  totalPlatformsChecked: number;
  totalFound: number;
  totalUnverified: number;
  totalNotFound: number;
  highConfidence: number;
  categories: Record<SiteCategory, { found: number; total: number }>;
  accounts: DiscoveredAccount[];
  variants: Array<{ variant: string; type: string }>;
  sourcesUsed: string[];
}

export async function probeUsername(username: string, refresh = false): Promise<UsernameAnalysis> {
  const summary: UsernameInvestigationSummary = await runUsernameInvestigation(username, { refresh });

  const accounts: DiscoveredAccount[] = summary.results.map((r: DiscoveredAccountFinding) => ({
    platform: r.platform,
    category: r.category,
    username: r.username,
    profileUrl: r.profileUrl,
    status: r.status,
    confidence: r.confidence,
    evidence: r.evidence,
    source: r.sources.join(', '),
    sources: r.sources,
    timestamp: r.timestamp,
    responseTimeMs: r.responseTimeMs,
    isVariation: r.isVariation,
    variantType: r.variantType,
    metadata: r.metadata,
  }));

  return {
    username: summary.target,
    timestamp: summary.timestamp,
    durationMs: summary.durationMs,
    totalPlatformsChecked: summary.totalChecked,
    totalFound: summary.found,
    totalUnverified: summary.unverified,
    totalNotFound: summary.notFound,
    highConfidence: summary.highConfidence,
    categories: summary.categories,
    accounts,
    variants: summary.variants,
    sourcesUsed: summary.sourcesUsed,
  };
}
