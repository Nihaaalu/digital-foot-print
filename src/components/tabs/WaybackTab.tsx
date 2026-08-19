import React from 'react';
import { InvestigationResult } from '../../types/osint';
import { useTheme } from '../../utils/theme';
import { History, ExternalLink } from 'lucide-react';

interface WaybackTabProps {
  result: InvestigationResult;
}

export const WaybackTab: React.FC<WaybackTabProps> = ({ result }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const wb = result.modules.wayback;

  if (!wb || wb.status === 'NO_ARCHIVES' || !wb.data || wb.data.snapshots.length === 0) {
    return (
      <div
        className={`p-12 text-center rounded-xl border text-sm space-y-2 ${
          isDark
            ? 'bg-[#111214] border-[#222428] text-zinc-400'
            : 'bg-white border-[#DDDDD8] text-zinc-600'
        }`}
      >
        <History className="w-8 h-8 opacity-40 mx-auto" />
        <p className={`font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
          No Historical Archives Found
        </p>
        <p className="text-xs">
          The Internet Archive Wayback Machine returned no historical snapshots for this target.
        </p>
      </div>
    );
  }

  const { data } = wb;

  return (
    <div className="space-y-6" id="wayback-tab-content">
      {/* Overview Stats */}
      <div
        className={`p-5 sm:p-6 rounded-xl border transition-colors ${
          isDark
            ? 'bg-[#111214] border-[#222428]'
            : 'bg-white border-[#DDDDD8] shadow-sm'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-inherit">
          <div>
            <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Internet Archive Wayback Machine
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {wb.source}
            </p>
          </div>
          {wb.sourceUrl && (
            <a
              href={wb.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className={`text-xs flex items-center gap-1 font-medium transition-colors ${
                isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <span>Open Complete Archive</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div
            className={`p-4 rounded-lg border ${
              isDark
                ? 'bg-[#16181B] border-[#26282E]'
                : 'bg-[#F9F9F8] border-[#E5E5E0]'
            }`}
          >
            <div className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              First Known Snapshot
            </div>
            <div className={`text-sm font-semibold mt-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {data.firstSnapshotDate || 'N/A'}
            </div>
            <div className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Earliest archival index
            </div>
          </div>

          <div
            className={`p-4 rounded-lg border ${
              isDark
                ? 'bg-[#16181B] border-[#26282E]'
                : 'bg-[#F9F9F8] border-[#E5E5E0]'
            }`}
          >
            <div className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Latest Known Snapshot
            </div>
            <div className={`text-sm font-semibold mt-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {data.latestSnapshotDate || 'N/A'}
            </div>
            <div className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Most recent crawl
            </div>
          </div>

          <div
            className={`p-4 rounded-lg border ${
              isDark
                ? 'bg-[#16181B] border-[#26282E]'
                : 'bg-[#F9F9F8] border-[#E5E5E0]'
            }`}
          >
            <div className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Indexed Snapshots
            </div>
            <div className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {data.totalSnapshotsCount}
            </div>
            <div className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              CDX API entries retrieved
            </div>
          </div>
        </div>
      </div>

      {/* Snapshots Table */}
      <div
        className={`p-5 sm:p-6 rounded-xl border transition-colors ${
          isDark
            ? 'bg-[#111214] border-[#222428]'
            : 'bg-white border-[#DDDDD8] shadow-sm'
        }`}
      >
        <div className="pb-4 border-b border-inherit">
          <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Historical Snapshot Index
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Direct links to archived versions of the target web assets
          </p>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b ${isDark ? 'border-[#222428] text-zinc-400' : 'border-[#DDDDD8] text-zinc-500'}`}>
                <th className="py-2.5 px-3 font-medium">Timestamp</th>
                <th className="py-2.5 px-3 font-medium">HTTP Status</th>
                <th className="py-2.5 px-3 font-medium">MIME Type</th>
                <th className="py-2.5 px-3 font-medium text-right">Archive Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {data.snapshots.map((snap: any, i: number) => (
                <tr
                  key={i}
                  className={`transition-colors ${
                    isDark ? 'hover:bg-[#16181B]' : 'hover:bg-[#F9F9F8]'
                  }`}
                >
                  <td className={`py-3 px-3 font-mono ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                    {snap.timestamp}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                        snap.statusCode === 200 || snap.statusCode === '200'
                          ? isDark
                            ? 'bg-emerald-950/60 text-emerald-300'
                            : 'bg-emerald-50 text-emerald-700'
                          : isDark
                          ? 'bg-zinc-800 text-zinc-300'
                          : 'bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      {snap.statusCode}
                    </span>
                  </td>
                  <td className={`py-3 px-3 font-mono text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    {snap.mimeType}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <a
                      href={snap.archiveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-500 hover:text-blue-600 inline-flex items-center gap-1 font-medium"
                    >
                      <span>View Snapshot</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
