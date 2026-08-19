export type UsernameProbeStatus =
  | 'FOUND'
  | 'NOT_FOUND'
  | 'COULD_NOT_VERIFY'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'ERROR';

export type ConfidenceLevel = 'CONFIRMED' | 'HIGH' | 'MEDIUM' | 'LOW';

export type SiteCategory =
  | 'Social'
  | 'Developer'
  | 'Forums'
  | 'Gaming'
  | 'Media'
  | 'Professional'
  | 'Photography'
  | 'Music'
  | 'Shopping'
  | 'Crypto'
  | 'Education'
  | 'Other';

export interface SiteDefinition {
  id: string;
  name: string;
  category: SiteCategory;
  urlTemplate: string;
  probeUrlTemplate?: string;
  checkType: 'status_code' | 'body_content' | 'json_api' | 'response_url' | 'custom';
  errorStatus?: number;
  matchStatus?: number;
  errorString?: string;
  matchString?: string;
  errorUrlPattern?: string;
  regexCheck?: string;
  headers?: Record<string, string>;
  sources: Array<'Sherlock' | 'Maigret' | 'WhatsMyName' | 'DirectProbe'>;
  knownProtection?: string[];
}

export interface DiscoveredAccountFinding {
  platform: string;
  category: SiteCategory;
  username: string;
  profileUrl: string;
  status: UsernameProbeStatus;
  confidence: ConfidenceLevel;
  sources: string[];
  evidence: string;
  responseTimeMs: number;
  timestamp: string;
  isVariation?: boolean;
  variantType?: string;
  metadata?: {
    avatarUrl?: string;
    displayName?: string;
    bio?: string;
    followers?: number | string;
    publicRepos?: number;
    tags?: string[];
  };
}

export interface UsernameInvestigationSummary {
  target: string;
  timestamp: string;
  durationMs: number;
  totalChecked: number;
  found: number;
  notFound: number;
  unverified: number; // BLOCKED + COULD_NOT_VERIFY + RATE_LIMITED + TIMEOUT
  highConfidence: number;
  categories: Record<SiteCategory, { found: number; total: number }>;
  results: DiscoveredAccountFinding[];
  variants: Array<{
    variant: string;
    type: string;
  }>;
  sourcesUsed: string[];
}
