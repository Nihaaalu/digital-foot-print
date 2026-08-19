import { InvestigationResult, TargetAnalysis, SettingsStatusResponse, ManualTargetSelection } from '../types/osint';

export async function detectTarget(input: string, manualType?: ManualTargetSelection): Promise<TargetAnalysis> {
  const typeParam = manualType && manualType !== 'AUTO' ? `&type=${encodeURIComponent(manualType)}` : '';
  const res = await fetch(`/api/detect?target=${encodeURIComponent(input)}${typeParam}`);
  if (!res.ok) {
    throw new Error('Could not analyze the target. Please verify your input.');
  }
  return res.json();
}

export async function launchInvestigation(
  target: string,
  modules?: string[],
  targetType?: ManualTargetSelection
): Promise<InvestigationResult> {
  const res = await fetch('/api/investigate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target, modules, targetType }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Search failed' }));
    throw new Error(err.message || err.error || `Error ${res.status}: Search could not complete`);
  }

  return res.json();
}

export async function fetchSettingsStatus(): Promise<SettingsStatusResponse> {
  const res = await fetch('/api/settings/status');
  if (!res.ok) {
    throw new Error('Failed to fetch settings status');
  }
  return res.json();
}

export async function testIntegrationService(service: string): Promise<{ success: boolean; message: string; data?: any }> {
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
}

export async function checkPwnedPasswordApi(password: string): Promise<{
  sha1Prefix: string;
  isPwned: boolean;
  pwnedCount: number;
  timestamp: string;
  source: string;
  sourceUrl: string;
  kAnonymityNotice: string;
}> {
  const res = await fetch('/api/pwnedpass', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Pwned Passwords check failed' }));
    throw new Error(err.error || err.message || 'Check failed');
  }

  return res.json();
}
