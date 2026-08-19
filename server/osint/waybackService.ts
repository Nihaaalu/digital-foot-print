import { safeFetch } from '../security.js';
import { osintCache } from '../cache.js';

export interface WaybackSnapshot {
  timestamp: string;
  originalUrl: string;
  archiveUrl: string;
  mimeType: string;
  statusCode: string;
  digest: string;
}

export interface WaybackAnalysis {
  target: string;
  timestamp: string;
  source: string;
  sourceUrl: string;
  status: 'FOUND' | 'NO_ARCHIVES' | 'ERROR';
  data?: {
    firstSnapshotDate?: string;
    latestSnapshotDate?: string;
    totalSnapshotsCount: number;
    latestArchiveUrl?: string;
    snapshots: WaybackSnapshot[];
  };
  error?: string;
}

export async function lookupWaybackMachine(target: string): Promise<WaybackAnalysis> {
  const cleanTarget = target.toLowerCase().trim().replace(/^https?:\/\//, '');
  const cacheKey = `wayback:${cleanTarget}`;
  const cached = osintCache.get<WaybackAnalysis>(cacheKey);
  if (cached) return cached.data;

  const sourceUrl = `https://web.archive.org/web/*/${encodeURIComponent(cleanTarget)}`;
  const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(cleanTarget)}&output=json&limit=30&collapse=timestamp:8`;

  try {
    const res = await safeFetch(cdxUrl, {
      timeoutMs: 9000,
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      if (res.status === 404) {
        return {
          target: cleanTarget,
          timestamp: new Date().toISOString(),
          source: 'Internet Archive Wayback Machine',
          sourceUrl,
          status: 'NO_ARCHIVES',
          data: {
            totalSnapshotsCount: 0,
            snapshots: [],
          },
        };
      }
      throw new Error(`Wayback CDX API responded with HTTP ${res.status}`);
    }

    const rows: any[] = await res.json();
    if (!Array.isArray(rows) || rows.length <= 1) {
      const emptyResult: WaybackAnalysis = {
        target: cleanTarget,
        timestamp: new Date().toISOString(),
        source: 'Internet Archive Wayback Machine',
        sourceUrl,
        status: 'NO_ARCHIVES',
        data: {
          totalSnapshotsCount: 0,
          snapshots: [],
        },
      };
      osintCache.set(cacheKey, emptyResult, 60 * 60 * 1000);
      return emptyResult;
    }

    // Rows format: [["urlkey","timestamp","original","mimetype","statuscode","digest","length"], ...]
    const dataRows = rows.slice(1);
    const snapshots: WaybackSnapshot[] = dataRows.map((r) => {
      const ts = r[1] || '';
      const original = r[2] || cleanTarget;
      const mime = r[3] || 'text/html';
      const status = r[4] || '200';
      const digest = r[5] || '';
      const archiveUrl = `https://web.archive.org/web/${ts}/${original}`;
      return {
        timestamp: ts ? `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)} ${ts.slice(8, 10)}:${ts.slice(10, 12)}` : '',
        originalUrl: original,
        archiveUrl,
        mimeType: mime,
        statusCode: status,
        digest,
      };
    });

    const firstDate = snapshots[0]?.timestamp;
    const latestDate = snapshots[snapshots.length - 1]?.timestamp;
    const latestUrl = snapshots[snapshots.length - 1]?.archiveUrl;

    const result: WaybackAnalysis = {
      target: cleanTarget,
      timestamp: new Date().toISOString(),
      source: 'Internet Archive Wayback Machine',
      sourceUrl,
      status: 'FOUND',
      data: {
        firstSnapshotDate: firstDate,
        latestSnapshotDate: latestDate,
        totalSnapshotsCount: snapshots.length,
        latestArchiveUrl: latestUrl,
        snapshots,
      },
    };

    osintCache.set(cacheKey, result, 60 * 60 * 1000);
    return result;
  } catch (err: any) {
    return {
      target: cleanTarget,
      timestamp: new Date().toISOString(),
      source: 'Internet Archive Wayback Machine',
      sourceUrl,
      status: 'ERROR',
      error: err.message || 'Failed to connect to Internet Archive',
    };
  }
}
