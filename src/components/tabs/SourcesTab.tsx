import React from 'react';
import { InvestigationResult } from '../../types/osint';
import { useTheme } from '../../utils/theme';
import { ExternalLink } from 'lucide-react';

interface SourcesTabProps {
  result: InvestigationResult;
}

export const SourcesTab: React.FC<SourcesTabProps> = ({ result }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { sources } = result;

  return (
    <div className="space-y-6" id="sources-tab-content">
      <div
        className={`p-5 sm:p-6 rounded-xl border transition-colors space-y-4 ${
          isDark
            ? 'bg-[#111214] border-[#222428]'
            : 'bg-white border-[#DDDDD8] shadow-sm'
        }`}
      >
        <div className="border-b pb-3">
          <h3
            className={`text-sm font-semibold ${
              isDark ? 'text-white' : 'text-zinc-900'
            }`}
          >
            Sources & data attribution ({sources.length} sources queried)
          </h3>
          <p
            className={`text-xs mt-0.5 ${
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            }`}
          >
            Information collected directly from public registers, APIs, and networks.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[500px]">
            <thead>
              <tr
                className={`border-b text-[11px] font-semibold ${
                  isDark
                    ? 'border-[#222428] text-zinc-400'
                    : 'border-[#DDDDD8] text-zinc-500'
                }`}
              >
                <th className="pb-2.5 pr-4">Provider</th>
                <th className="pb-2.5 pr-4">Category</th>
                <th className="pb-2.5 pr-4">Status</th>
                <th className="pb-2.5 pr-4">Time</th>
                <th className="pb-2.5">Feed link</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y text-[11px] ${
                isDark
                  ? 'divide-[#222428] text-zinc-300'
                  : 'divide-[#DDDDD8] text-zinc-700'
              }`}
            >
              {sources.map((src, i) => (
                <tr key={i}>
                  <td className="py-2.5 pr-4 font-medium">{src.name}</td>
                  <td className="py-2.5 pr-4 text-zinc-500">{src.category}</td>
                  <td className="py-2.5 pr-4">
                    <span
                      className={`text-xs ${
                        src.status === 'FOUND'
                          ? 'text-emerald-500'
                          : 'text-zinc-400'
                      }`}
                    >
                      {src.status === 'FOUND' ? 'Responded' : 'No data'}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-zinc-500">
                    {src.timestamp.slice(11, 19)}
                  </td>
                  <td className="py-2.5">
                    {src.sourceUrl ? (
                      <a
                        href={src.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-500 hover:underline flex items-center gap-1"
                      >
                        <span>Source feed</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-zinc-400">Direct query</span>
                    )}
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
