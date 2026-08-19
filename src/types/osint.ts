export type TargetType = 'USERNAME' | 'EMAIL' | 'DOMAIN' | 'IPV4' | 'IPV6' | 'URL' | 'PHONE' | 'UNKNOWN';

export type ManualTargetSelection = 'AUTO' | 'USERNAME' | 'EMAIL' | 'DOMAIN' | 'IP' | 'URL';

export interface TargetAnalysis {
  raw: string;
  type: TargetType;
  normalized: string;
  isAmbiguous?: boolean;
  suggestedType?: TargetType;
  details: {
    username?: string;
    domain?: string;
    ip?: string;
    scheme?: string;
    path?: string;
    phoneE164?: string;
  };
}

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

export interface ExposureFactor {
  name: string;
  category: 'Identity' | 'Infrastructure' | 'Security Configuration' | 'Code & Repositories' | 'Historical Archive' | 'Reputation';
  impact: 'POSITIVE' | 'NEUTRAL' | 'WARNING' | 'CRITICAL';
  points: number;
  description: string;
  evidence: string;
}

export interface ExposureScoreResult {
  score: number; // 0-100
  rating: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'VERY_HIGH';
  ratingLabel: string;
  disclaimer: string;
  summary: string;
  factors: ExposureFactor[];
}

export type UsernameProbeStatus =
  | 'FOUND'
  | 'NOT_FOUND'
  | 'COULD_NOT_VERIFY'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'ERROR';

export interface DiscoveredAccount {
  platform: string;
  category: string;
  username: string;
  url?: string;
  profileUrl?: string;
  status: UsernameProbeStatus;
  confidence: 'CONFIRMED' | 'HIGH' | 'MEDIUM' | 'LOW';
  evidence: string;
  source: string;
  sources?: string[];
  timestamp: string;
  responseTimeMs?: number;
  isVariation?: boolean;
  variantType?: string;
  metadata?: any;
}

export type UsernameProbeResult = DiscoveredAccount;

export interface UsernameAnalysisResult {
  username: string;
  timestamp: string;
  durationMs: number;
  totalPlatformsChecked: number;
  totalFound: number;
  totalUnverified: number;
  totalNotFound: number;
  highConfidence: number;
  categories: Record<string, { found: number; total: number }>;
  accounts: DiscoveredAccount[];
  variants?: Array<{ variant: string; type: string }>;
  sourcesUsed?: string[];
}

export interface SourceRecord {
  name: string;
  sourceUrl?: string;
  status: string;
  timestamp: string;
  category: string;
}

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
    crtsh?: any;
    tls?: any;
    ipinfo?: any;
    abuseipdb?: any;
    virustotal?: any;
    wayback?: any;
    passiveHttp?: any;
  };
  sources: SourceRecord[];
  isDemo?: boolean;
}

export interface InvestigationHistoryItem {
  id: string;
  target: string;
  targetType: TargetType;
  date: string;
  exposureScore: number;
  nodesCount: number;
  result: InvestigationResult;
}

export interface IntegrationStatus {
  name: string;
  type: string;
  configured: boolean;
  status: 'CONNECTED' | 'OPEN_TIER' | 'NOT_CONFIGURED';
  description: string;
  rateLimit?: {
    remaining: number;
    limit: number;
    resetTime: string;
  };
}

export interface SettingsStatusResponse {
  integrations: Record<string, IntegrationStatus>;
}
