import { InvestigationResult, TargetAnalysis, SettingsStatusResponse, ManualTargetSelection } from '../types/osint';

export interface HealthResponse {
  ok: boolean;
  service: string;
  environment: string;
}

export interface HealthIntegrationsResponse {
  github: boolean;
  ipinfo: boolean;
  abuseipdb: boolean;
  virustotal: boolean;
  gemini: boolean;
}

/**
 * Diagnostic Health Check
 */
export async function checkApiHealth(): Promise<HealthResponse> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) {
      throw new Error(`Health check returned status ${res.status}`);
    }
    return res.json();
  } catch (err: any) {
    throw new Error(err.message || 'Server could not be reached');
  }
}

/**
 * Diagnostic Integration Keys Status Check (boolean status only)
 */
export async function checkHealthIntegrations(): Promise<HealthIntegrationsResponse> {
  try {
    const res = await fetch('/api/health/integrations');
    if (!res.ok) {
      throw new Error(`Integrations check returned status ${res.status}`);
    }
    return res.json();
  } catch (err: any) {
    throw new Error(err.message || 'Could not verify server integration status');
  }
}

/**
 * Target Classification & Heuristics
 */
export async function detectTarget(input: string, manualType?: ManualTargetSelection): Promise<TargetAnalysis> {
  try {
    const typeParam = manualType && manualType !== 'AUTO' ? `&type=${encodeURIComponent(manualType)}` : '';
    const res = await fetch(`/api/detect?target=${encodeURIComponent(input)}${typeParam}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Target analysis failed' }));
      throw new Error(err.message || err.error || 'Could not analyze the target. Please verify your input.');
    }
    return res.json();
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Server could not be reached. Please check your connection.');
    }
    throw err;
  }
}

/**
 * Multi-Module OSINT Investigation Runner
 */
export async function launchInvestigation(
  target: string,
  modules?: string[],
  targetType?: ManualTargetSelection
): Promise<InvestigationResult> {
  try {
    const res = await fetch('/api/investigate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, modules, targetType }),
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('Too many requests. Please wait a moment before trying again.');
      }
      if (res.status === 504 || res.status === 408) {
        throw new Error('Search timed out. Some upstream registries were unreachable.');
      }
      const err = await res.json().catch(() => ({ error: 'Search could not be completed' }));
      throw new Error(err.message || err.error || `Search could not be completed (Status ${res.status}).`);
    }

    return res.json();
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Server could not be reached. Please verify the backend is online.');
    }
    throw err;
  }
}

/**
 * Settings & Rate Limit Status
 */
export async function fetchSettingsStatus(): Promise<SettingsStatusResponse> {
  try {
    const res = await fetch('/api/settings/status');
    if (!res.ok) {
      throw new Error('Failed to fetch settings status');
    }
    return res.json();
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Server could not be reached.');
    }
    throw err;
  }
}

/**
 * Test Integration Service Connection
 */
export async function testIntegrationService(service: string): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const res = await fetch('/api/settings/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Test failed');
    }
    return data;
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Server could not be reached.');
    }
    throw err;
  }
}

/**
 * HIBP k-Anonymity Password Breach Check
 */
export async function checkPwnedPasswordApi(password: string): Promise<{
  sha1Prefix: string;
  isPwned: boolean;
  pwnedCount: number;
  timestamp: string;
  source: string;
  sourceUrl: string;
  kAnonymityNotice: string;
}> {
  try {
    const res = await fetch('/api/pwnedpass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment.');
      }
      const err = await res.json().catch(() => ({ error: 'Pwned Passwords check failed' }));
      throw new Error(err.error || err.message || 'Check failed');
    }

    return res.json();
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Server could not be reached.');
    }
    throw err;
  }
}
