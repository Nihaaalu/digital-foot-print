import React, { useState, useMemo } from 'react';
import { InvestigationResult, UsernameProbeResult } from '../../types/osint';
import { useTheme } from '../../utils/theme';
import {
  Search,
  ExternalLink,
  RefreshCw,
  X,
  SlidersHorizontal,
  ChevronRight,
  Info,
} from 'lucide-react';

interface IdentitiesTabProps {
  result: InvestigationResult;
  onRescanUsername?: (username: string) => void;
}

export const IdentitiesTab: React.FC<IdentitiesTabProps> = ({
  result,
  onRescanUsername,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [selectedStatus, setSelectedStatus] = useState<
    'FOUND' | 'COULD_NOT_VERIFY' | 'NOT_FOUND' | 'ALL'
  >('FOUND');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [inspectAccount, setInspectAccount] = useState<UsernameProbeResult | null>(null);

  const usernameProbe = result.modules.usernameProbe;
  const accounts: UsernameProbeResult[] = usernameProbe?.results || [];

  // Categorize accounts
  const foundAccounts = useMemo(
    () => accounts.filter((a) => a.status === 'FOUND'),
    [accounts]
  );
  const unverifiedAccounts = useMemo(
    () =>
      accounts.filter(
        (a) =>
          a.status === 'COULD_NOT_VERIFY' ||
          a.status === 'RATE_LIMITED' ||
          a.status === 'TIMEOUT' ||
          a.status === 'ERROR'
      ),
    [accounts]
  );
  const notFoundAccounts = useMemo(
    () => accounts.filter((a) => a.status === 'NOT_FOUND'),
    [accounts]
  );

  // Extract available categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    accounts.forEach((a) => {
      if (a.category) set.add(a.category);
    });
    return Array.from(set).sort();
  }, [accounts]);

  // Filter list
  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      // Status filter
      if (selectedStatus === 'FOUND' && account.status !== 'FOUND') return false;
      if (
        selectedStatus === 'COULD_NOT_VERIFY' &&
        account.status !== 'COULD_NOT_VERIFY' &&
        account.status !== 'RATE_LIMITED' &&
        account.status !== 'TIMEOUT' &&
        account.status !== 'ERROR'
      )
        return false;
      if (selectedStatus === 'NOT_FOUND' && account.status !== 'NOT_FOUND')
        return false;

      // Category filter
      if (
        selectedCategory !== 'ALL' &&
        account.category?.toLowerCase() !== selectedCategory.toLowerCase()
      ) {
        return false;
      }

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesPlatform = account.platform.toLowerCase().includes(q);
        const matchesUrl = account.url.toLowerCase().includes(q);
        const matchesUsername = account.username.toLowerCase().includes(q);
        const matchesEvidence = (account.evidence || '').toLowerCase().includes(q);
        if (!matchesPlatform && !matchesUrl && !matchesUsername && !matchesEvidence) {
          return false;
        }
      }

      return true;
    });
  }, [accounts, selectedStatus, selectedCategory, searchQuery]);

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'FOUND':
        return <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />;
      case 'COULD_NOT_VERIFY':
      case 'RATE_LIMITED':
      case 'TIMEOUT':
        return <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />;
      case 'ERROR':
        return <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />;
      case 'NOT_FOUND':
      default:
        return <span className="w-2 h-2 rounded-full bg-zinc-400 shrink-0" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'FOUND':
        return 'Found';
      case 'COULD_NOT_VERIFY':
        return 'Could not verify';
      case 'RATE_LIMITED':
        return 'Rate limited';
      case 'TIMEOUT':
        return 'Timeout';
      case 'ERROR':
        return 'Error';
      case 'NOT_FOUND':
        return 'Not found';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-4" id="profiles-tab-content">
      {/* Top Filter & Search Bar */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-colors ${
          isDark
            ? 'bg-[#111214] border-[#222428]'
            : 'bg-white border-[#DDDDD8] shadow-sm'
        }`}
      >
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedStatus('FOUND')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
              selectedStatus === 'FOUND'
                ? isDark
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'bg-zinc-200 text-zinc-900 font-semibold'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-200'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Found ({foundAccounts.length})</span>
          </button>

          <button
            onClick={() => setSelectedStatus('COULD_NOT_VERIFY')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
              selectedStatus === 'COULD_NOT_VERIFY'
                ? isDark
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'bg-zinc-200 text-zinc-900 font-semibold'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-200'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Could not verify ({unverifiedAccounts.length})</span>
          </button>

          <button
            onClick={() => setSelectedStatus('NOT_FOUND')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
              selectedStatus === 'NOT_FOUND'
                ? isDark
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'bg-zinc-200 text-zinc-900 font-semibold'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-200'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-zinc-400" />
            <span>Not found ({notFoundAccounts.length})</span>
          </button>

          <button
            onClick={() => setSelectedStatus('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition shrink-0 ${
              selectedStatus === 'ALL'
                ? isDark
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'bg-zinc-200 text-zinc-900 font-semibold'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-200'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <span>All ({accounts.length})</span>
          </button>
        </div>

        {/* Search & Category Inputs */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search
              className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              }`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter platforms..."
              className={`w-full text-xs rounded-md pl-8 pr-3 py-1.5 focus:outline-none transition border ${
                isDark
                  ? 'bg-[#17181A] border-[#2E3136] text-white placeholder-zinc-500 focus:border-blue-500'
                  : 'bg-white border-[#DDDDD8] text-zinc-900 placeholder-zinc-400 focus:border-blue-600'
              }`}
            />
          </div>

          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`text-xs rounded-md px-2.5 py-1.5 focus:outline-none transition border cursor-pointer ${
                isDark
                  ? 'bg-[#17181A] border-[#2E3136] text-zinc-200 focus:border-blue-500'
                  : 'bg-white border-[#DDDDD8] text-zinc-700 focus:border-blue-600'
              }`}
            >
              <option value="ALL">All categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Profile List / Results */}
      {filteredAccounts.length === 0 ? (
        <div
          className={`p-12 text-center rounded-xl border text-xs ${
            isDark
              ? 'bg-[#111214] border-[#222428] text-zinc-500'
              : 'bg-white border-[#DDDDD8] text-zinc-500'
          }`}
        >
          No accounts match the current filter.
        </div>
      ) : (
        <div
          className={`rounded-xl border divide-y transition-colors ${
            isDark
              ? 'bg-[#111214] border-[#222428] divide-[#222428]'
              : 'bg-white border-[#DDDDD8] divide-[#DDDDD8] shadow-sm'
          }`}
        >
          {filteredAccounts.map((account) => {
            const isFound = account.status === 'FOUND';
            const sourcesList =
              account.sources && account.sources.length > 0
                ? account.sources.join(' · ')
                : 'Direct check';

            return (
              <div
                key={account.id}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  isDark ? 'hover:bg-zinc-800/30' : 'hover:bg-zinc-50'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="mt-1 sm:mt-0">{getStatusDot(account.status)}</div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-semibold truncate ${
                          isDark ? 'text-zinc-100' : 'text-zinc-900'
                        }`}
                      >
                        {account.platform}
                      </span>
                      <span
                        className={`text-xs ${
                          isDark ? 'text-zinc-400' : 'text-zinc-500'
                        }`}
                      >
                        @{account.username}
                      </span>
                      {account.category && (
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded ${
                            isDark
                              ? 'bg-zinc-800 text-zinc-400'
                              : 'bg-zinc-100 text-zinc-600'
                          }`}
                        >
                          {account.category}
                        </span>
                      )}
                    </div>

                    <div
                      className={`text-xs mt-0.5 flex flex-wrap items-center gap-2 ${
                        isDark ? 'text-zinc-400' : 'text-zinc-500'
                      }`}
                    >
                      <span>Status: {getStatusLabel(account.status)}</span>
                      {isFound && (
                        <>
                          <span>·</span>
                          <span>Verified by: {sourcesList}</span>
                        </>
                      )}
                      {account.latencyMs !== undefined && (
                        <>
                          <span>·</span>
                          <span>{account.latencyMs}ms</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  {account.evidence && (
                    <button
                      onClick={() => setInspectAccount(account)}
                      className={`px-2.5 py-1 text-xs rounded-md border transition ${
                        isDark
                          ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-[#2E3136]'
                          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200'
                      }`}
                    >
                      Details
                    </button>
                  )}

                  <a
                    href={account.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`px-3 py-1 text-xs font-medium rounded-md transition flex items-center gap-1 ${
                      isFound
                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                        : isDark
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                    }`}
                  >
                    <span>Open profile</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Account Inspection Details Drawer/Modal */}
      {inspectAccount && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setInspectAccount(null)}
        >
          <div
            className={`w-full max-w-lg rounded-xl border p-5 space-y-4 transition-colors ${
              isDark
                ? 'bg-[#111214] border-[#222428] text-zinc-200'
                : 'bg-white border-[#DDDDD8] text-zinc-800 shadow-xl'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                {getStatusDot(inspectAccount.status)}
                <h3 className="font-semibold text-sm">
                  {inspectAccount.platform} Verification Details
                </h3>
              </div>
              <button
                onClick={() => setInspectAccount(null)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-zinc-500 block mb-0.5">Profile URL</span>
                <a
                  href={inspectAccount.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline font-mono break-all"
                >
                  {inspectAccount.url}
                </a>
              </div>

              <div>
                <span className="text-zinc-500 block mb-0.5">Status</span>
                <span className="font-medium">{getStatusLabel(inspectAccount.status)}</span>
              </div>

              <div>
                <span className="text-zinc-500 block mb-0.5">Verification Evidence</span>
                <div
                  className={`p-2.5 rounded-lg font-mono text-[11px] leading-relaxed border ${
                    isDark
                      ? 'bg-[#17181A] border-[#2E3136] text-zinc-300'
                      : 'bg-zinc-50 border-[#DDDDD8] text-zinc-800'
                  }`}
                >
                  {inspectAccount.evidence || 'No detailed evidence recorded.'}
                </div>
              </div>

              {inspectAccount.sources && (
                <div>
                  <span className="text-zinc-500 block mb-0.5">Sources</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {inspectAccount.sources.map((s, idx) => (
                      <span
                        key={idx}
                        className={`px-2 py-0.5 rounded text-[11px] ${
                          isDark
                            ? 'bg-zinc-800 text-zinc-300'
                            : 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                onClick={() => setInspectAccount(null)}
                className={`px-4 py-1.5 text-xs font-medium rounded-md ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
