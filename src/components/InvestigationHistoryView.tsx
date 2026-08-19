import React, { useState } from 'react';
import { InvestigationHistoryItem, InvestigationResult } from '../types/osint';
import { useTheme } from '../utils/theme';
import { Search, Trash2, ArrowRight } from 'lucide-react';

interface InvestigationHistoryViewProps {
  history: InvestigationHistoryItem[];
  onSelectInvestigation: (result: InvestigationResult) => void;
  onClearHistory: () => void;
  onDeleteHistoryItem: (id: string) => void;
}

export const InvestigationHistoryView: React.FC<InvestigationHistoryViewProps> = ({
  history,
  onSelectInvestigation,
  onClearHistory,
  onDeleteHistoryItem,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const filtered = history.filter((item) => {
    const matchesSearch = item.target.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'ALL' || item.targetType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6" id="history-view">
      {/* Header */}
      <div
        className={`p-5 sm:p-6 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
          isDark
            ? 'bg-[#111214] border-[#222428]'
            : 'bg-white border-[#DDDDD8] shadow-sm'
        }`}
      >
        <div>
          <h2
            className={`text-lg sm:text-xl font-bold tracking-tight ${
              isDark ? 'text-white' : 'text-zinc-900'
            }`}
          >
            Saved searches
          </h2>
          <p
            className={`text-xs mt-0.5 ${
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            }`}
          >
            Recent investigations saved locally in this browser ({history.length})
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition flex items-center gap-1.5 self-start sm:self-auto ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-red-400 border-[#2E3136]'
                : 'bg-zinc-100 hover:bg-zinc-200 text-red-600 border-zinc-200'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear all</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search
            className={`w-4 h-4 absolute left-3.5 top-3 ${
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            }`}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved targets (username, domain, IP)..."
            className={`w-full rounded-md pl-10 pr-4 py-2 text-xs focus:outline-none transition border ${
              isDark
                ? 'bg-[#111214] border-[#222428] text-white placeholder-zinc-500 focus:border-blue-500'
                : 'bg-white border-[#DDDDD8] text-zinc-900 placeholder-zinc-400 focus:border-blue-600 shadow-sm'
            }`}
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className={`text-xs rounded-md px-3 py-2 focus:outline-none transition border cursor-pointer ${
            isDark
              ? 'bg-[#111214] border-[#222428] text-zinc-200 focus:border-blue-500'
              : 'bg-white border-[#DDDDD8] text-zinc-700 focus:border-blue-600 shadow-sm'
          }`}
        >
          <option value="ALL">All types</option>
          <option value="USERNAME">Username</option>
          <option value="EMAIL">Email</option>
          <option value="DOMAIN">Domain</option>
          <option value="IPV4">IP</option>
          <option value="URL">URL</option>
        </select>
      </div>

      {/* History Items List */}
      {filtered.length === 0 ? (
        <div
          className={`p-12 text-center rounded-xl border text-xs ${
            isDark
              ? 'bg-[#111214] border-[#222428] text-zinc-500'
              : 'bg-white border-[#DDDDD8] text-zinc-500'
          }`}
        >
          No saved investigations match your query.
        </div>
      ) : (
        <div
          className={`rounded-xl border divide-y transition-colors ${
            isDark
              ? 'bg-[#111214] border-[#222428] divide-[#222428]'
              : 'bg-white border-[#DDDDD8] divide-[#DDDDD8] shadow-sm'
          }`}
        >
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                isDark ? 'hover:bg-zinc-800/30' : 'hover:bg-zinc-50'
              }`}
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-semibold text-sm truncate ${
                      isDark ? 'text-white' : 'text-zinc-900'
                    }`}
                  >
                    {item.target}
                  </span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded ${
                      isDark
                        ? 'bg-zinc-800 text-zinc-400'
                        : 'bg-zinc-100 text-zinc-600'
                    }`}
                  >
                    {item.targetType.toLowerCase()}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-2 text-xs ${
                    isDark ? 'text-zinc-400' : 'text-zinc-500'
                  }`}
                >
                  <span>
                    {new Date(item.date).toLocaleDateString()} at{' '}
                    {new Date(item.date).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span>·</span>
                  <span>{item.nodesCount} findings</span>
                  <span>·</span>
                  <span>Score: {item.exposureScore} / 100</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onSelectInvestigation(item.result)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-md transition flex items-center gap-1"
                >
                  <span>Open report</span>
                  <ArrowRight className="w-3 h-3" />
                </button>

                <button
                  onClick={() => onDeleteHistoryItem(item.id)}
                  className={`p-1.5 rounded-md transition ${
                    isDark
                      ? 'text-zinc-500 hover:text-red-400 hover:bg-zinc-800'
                      : 'text-zinc-400 hover:text-red-600 hover:bg-zinc-100'
                  }`}
                  title="Delete record"
                  aria-label="Delete record"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
