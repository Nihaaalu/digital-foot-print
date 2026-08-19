import React, { useState } from 'react';
import { InvestigationResult } from '../types/osint';
import { OverviewTab } from './tabs/OverviewTab';
import { IdentitiesTab } from './tabs/IdentitiesTab';
import { DomainsDnsTab } from './tabs/DomainsDnsTab';
import { InfrastructureTab } from './tabs/InfrastructureTab';
import { CertificatesTab } from './tabs/CertificatesTab';
import { GitHubTab } from './tabs/GitHubTab';
import { PassiveTechTab } from './tabs/PassiveTechTab';
import { WaybackTab } from './tabs/WaybackTab';
import { ReputationTab } from './tabs/ReputationTab';
import { SourcesTab } from './tabs/SourcesTab';
import { GraphView } from './GraphView';
import { useTheme } from '../utils/theme';
import { FileDown, RefreshCw } from 'lucide-react';

interface DashboardViewProps {
  result: InvestigationResult;
  onOpenScoreBreakdown: () => void;
  onOpenExportModal: () => void;
  onRescanUsername?: (username: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  result,
  onOpenScoreBreakdown,
  onOpenExportModal,
  onRescanUsername,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<string>('overview');

  // Format real duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Format completed time relative / normal
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  // Compute username counts if available
  const usernameProbe = result.modules.usernameProbe;
  const foundCount = usernameProbe?.foundCount ?? result.graph.summary.identitiesCount;
  const unverifiedCount = usernameProbe?.blockedCount ?? 0;
  const notFoundCount = usernameProbe?.notFoundCount ?? 0;

  // Clean, data-driven tabs
  const tabs = [
    { id: 'overview', label: 'Overview' },
    {
      id: 'profiles',
      label: `Profiles (${foundCount})`,
      hidden: !result.modules.usernameProbe && !result.modules.github && !result.modules.email,
    },
    {
      id: 'domains',
      label: 'Domains & DNS',
      hidden: !result.modules.dns && !result.modules.rdap,
    },
    {
      id: 'code',
      label: 'Code',
      hidden: !result.modules.github,
    },
    {
      id: 'infrastructure',
      label: 'Infrastructure',
      hidden: !result.modules.ipinfo,
    },
    {
      id: 'certificates',
      label: 'Certificates',
      hidden: !result.modules.crtsh && !result.modules.tls,
    },
    {
      id: 'graph',
      label: `Graph (${result.graph.nodes.length})`,
    },
    {
      id: 'sources',
      label: `Sources (${result.sources.length})`,
    },
  ].filter((t) => !t.hidden);

  const getScoreRating = (score: number) => {
    if (score > 80) return 'Critical';
    if (score > 60) return 'High';
    if (score > 40) return 'Medium';
    if (score > 20) return 'Low';
    return 'Minimal';
  };

  return (
    <div className="space-y-6 pb-12" id="investigation-dashboard">
      {/* Top Header Row */}
      <div
        className={`p-5 sm:p-6 rounded-xl border transition-colors ${
          isDark
            ? 'bg-[#111214] border-[#222428]'
            : 'bg-white border-[#DDDDD8] shadow-sm'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1
                className={`text-xl sm:text-2xl font-bold tracking-tight ${
                  isDark ? 'text-white' : 'text-zinc-900'
                }`}
              >
                {result.target.normalized}
              </h1>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full ${
                  isDark
                    ? 'bg-zinc-800 text-zinc-300'
                    : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                }`}
              >
                {result.target.type.toLowerCase()}
              </span>
              {result.isDemo && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    isDark
                      ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  Sample data
                </span>
              )}
            </div>

            <div
              className={`text-xs flex items-center gap-2 ${
                isDark ? 'text-zinc-400' : 'text-zinc-500'
              }`}
            >
              <span>Search completed at {formatTime(result.completedAt)}</span>
              <span>·</span>
              <span>Duration: {formatDuration(result.durationMs)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onOpenExportModal}
              className={`px-3.5 py-2 text-xs font-medium rounded-md border transition flex items-center gap-1.5 ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-[#2E3136]'
                  : 'bg-white hover:bg-zinc-50 text-zinc-700 border-[#DDDDD8]'
              }`}
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Export report</span>
            </button>
          </div>
        </div>

        {/* Compact Summary Metrics Bar */}
        <div
          className={`mt-5 pt-4 border-t grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs ${
            isDark ? 'border-[#222428]' : 'border-[#DDDDD8]'
          }`}
        >
          <div>
            <div className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>Found</div>
            <div
              className={`text-lg font-semibold mt-0.5 ${
                isDark ? 'text-emerald-400' : 'text-emerald-600'
              }`}
            >
              {foundCount}
            </div>
          </div>

          <div>
            <div className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
              Could not verify
            </div>
            <div
              className={`text-lg font-semibold mt-0.5 ${
                isDark ? 'text-amber-400' : 'text-amber-600'
              }`}
            >
              {unverifiedCount}
            </div>
          </div>

          <div>
            <div className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>Not found</div>
            <div
              className={`text-lg font-semibold mt-0.5 ${
                isDark ? 'text-zinc-300' : 'text-zinc-700'
              }`}
            >
              {notFoundCount > 0 ? notFoundCount.toLocaleString() : '0'}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
                Exposure score
              </span>
              <button
                onClick={onOpenScoreBreakdown}
                className="text-blue-500 hover:underline text-xs"
              >
                Why?
              </button>
            </div>
            <div className="text-lg font-semibold mt-0.5 flex items-center gap-1.5">
              <span className={isDark ? 'text-white' : 'text-zinc-900'}>
                {result.exposureScore.score} / 100
              </span>
              <span
                className={`text-xs font-normal ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              >
                · {getScoreRating(result.exposureScore.score)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div
        className={`flex items-center gap-1 overflow-x-auto pb-1 border-b ${
          isDark ? 'border-[#222428]' : 'border-[#DDDDD8]'
        }`}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 text-xs font-medium rounded-md whitespace-nowrap transition ${
                isActive
                  ? isDark
                    ? 'bg-zinc-800 text-white font-semibold'
                    : 'bg-zinc-200 text-zinc-900 font-semibold'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active Tab View */}
      <div>
        {activeTab === 'overview' && (
          <OverviewTab
            result={result}
            onSelectTab={setActiveTab}
            onOpenScoreBreakdown={onOpenScoreBreakdown}
          />
        )}
        {activeTab === 'profiles' && (
          <IdentitiesTab result={result} onRescanUsername={onRescanUsername} />
        )}
        {activeTab === 'domains' && <DomainsDnsTab result={result} />}
        {activeTab === 'code' && <GitHubTab result={result} />}
        {activeTab === 'infrastructure' && <InfrastructureTab result={result} />}
        {activeTab === 'certificates' && <CertificatesTab result={result} />}
        {activeTab === 'graph' && <GraphView result={result} />}
        {activeTab === 'sources' && <SourcesTab result={result} />}
      </div>
    </div>
  );
};
