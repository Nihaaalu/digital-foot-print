import React from 'react';
import { InvestigationResult } from '../../types/osint';
import { useTheme } from '../../utils/theme';
import { ChevronRight } from 'lucide-react';

interface OverviewTabProps {
  result: InvestigationResult;
  onSelectTab: (tabId: string) => void;
  onOpenScoreBreakdown: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  result,
  onSelectTab,
  onOpenScoreBreakdown,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { exposureScore, graph, modules } = result;

  const formatTargetType = (type: string) => {
    switch (type) {
      case 'USERNAME':
        return 'Username';
      case 'EMAIL':
        return 'Email';
      case 'DOMAIN':
        return 'Domain';
      case 'IPV4':
      case 'IPV6':
        return 'IP';
      case 'URL':
        return 'URL';
      default:
        return type;
    }
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'CRITICAL':
        return (
          <span
            className={`text-xs px-2 py-0.5 rounded font-medium ${
              isDark
                ? 'bg-red-950/70 text-red-300 border border-red-800/60'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            Critical
          </span>
        );
      case 'WARNING':
        return (
          <span
            className={`text-xs px-2 py-0.5 rounded font-medium ${
              isDark
                ? 'bg-amber-950/70 text-amber-300 border border-amber-800/60'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            Warning
          </span>
        );
      case 'POSITIVE':
        return (
          <span
            className={`text-xs px-2 py-0.5 rounded font-medium ${
              isDark
                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            Secured
          </span>
        );
      default:
        return (
          <span
            className={`text-xs px-2 py-0.5 rounded font-medium ${
              isDark
                ? 'bg-zinc-800 text-zinc-300'
                : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
            }`}
          >
            Observed
          </span>
        );
    }
  };

  const identitiesCount = graph.summary.identitiesCount;
  const domainsCount = graph.summary.domainsCount;
  const ipsCount = graph.summary.ipsCount;
  const repositoriesCount = graph.summary.repositoriesCount;
  const subdomainsCount = graph.summary.subdomainsCount;

  return (
    <div className="space-y-6" id="overview-tab-content">
      {/* Overview Card */}
      <div
        className={`p-5 sm:p-6 rounded-xl border transition-colors ${
          isDark
            ? 'bg-[#111214] border-[#222428]'
            : 'bg-white border-[#DDDDD8] shadow-sm'
        }`}
      >
        <div className="space-y-4">
          <div>
            <h2
              className={`text-base font-semibold ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}
            >
              Overview
            </h2>
            <p
              className={`text-xs mt-1 ${
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              }`}
            >
              Based on the public information found during this search.
            </p>
          </div>

          <div
            className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t text-xs ${
              isDark ? 'border-[#222428]' : 'border-[#DDDDD8]'
            }`}
          >
            <div>
              <span className={isDark ? 'text-zinc-500' : 'text-zinc-500'}>
                Target
              </span>
              <div
                className={`font-medium mt-0.5 truncate ${
                  isDark ? 'text-zinc-200' : 'text-zinc-800'
                }`}
              >
                {result.target.normalized}
              </div>
            </div>

            <div>
              <span className={isDark ? 'text-zinc-500' : 'text-zinc-500'}>
                Type
              </span>
              <div
                className={`font-medium mt-0.5 ${
                  isDark ? 'text-zinc-200' : 'text-zinc-800'
                }`}
              >
                {formatTargetType(result.target.type)}
              </div>
            </div>

            <div>
              <span className={isDark ? 'text-zinc-500' : 'text-zinc-500'}>
                Results
              </span>
              <div
                className={`font-medium mt-0.5 ${
                  isDark ? 'text-zinc-200' : 'text-zinc-800'
                }`}
              >
                {identitiesCount} found
              </div>
            </div>

            <div>
              <span className={isDark ? 'text-zinc-500' : 'text-zinc-500'}>
                Exposure score
              </span>
              <div
                className={`font-medium mt-0.5 flex items-center gap-1.5 ${
                  isDark ? 'text-zinc-200' : 'text-zinc-800'
                }`}
              >
                <span>{exposureScore.score} / 100</span>
                <button
                  onClick={onOpenScoreBreakdown}
                  className="text-blue-500 hover:underline text-xs"
                >
                  (Why?)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary of Data Categories (Clean Rows & List) */}
      <div
        className={`p-5 sm:p-6 rounded-xl border transition-colors ${
          isDark
            ? 'bg-[#111214] border-[#222428]'
            : 'bg-white border-[#DDDDD8] shadow-sm'
        }`}
      >
        <h3
          className={`text-sm font-semibold mb-3 ${
            isDark ? 'text-white' : 'text-zinc-900'
          }`}
        >
          Discovered findings
        </h3>

        <div
          className={`divide-y text-xs ${
            isDark ? 'divide-[#222428]' : 'divide-[#DDDDD8]'
          }`}
        >
          {/* Profiles Row */}
          <div className="py-3 flex items-center justify-between">
            <div>
              <span
                className={`font-medium ${
                  isDark ? 'text-zinc-200' : 'text-zinc-800'
                }`}
              >
                Verified profiles
              </span>
              <div
                className={`text-[11px] mt-0.5 ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              >
                {identitiesCount > 0
                  ? `${identitiesCount} public profile(s) verified across social networks & registries`
                  : 'No public profiles confirmed'}
              </div>
            </div>
            {identitiesCount > 0 && (
              <button
                onClick={() => onSelectTab('profiles')}
                className="text-blue-500 hover:underline text-xs flex items-center gap-0.5 font-medium"
              >
                <span>View {identitiesCount} profiles</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Domains Row */}
          <div className="py-3 flex items-center justify-between">
            <div>
              <span
                className={`font-medium ${
                  isDark ? 'text-zinc-200' : 'text-zinc-800'
                }`}
              >
                Domains & DNS
              </span>
              <div
                className={`text-[11px] mt-0.5 ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              >
                {domainsCount > 0
                  ? `${domainsCount} domain(s) and DNS records resolved`
                  : 'No domains associated'}
              </div>
            </div>
            {domainsCount > 0 && (
              <button
                onClick={() => onSelectTab('domains')}
                className="text-blue-500 hover:underline text-xs flex items-center gap-0.5 font-medium"
              >
                <span>View domains</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Infrastructure Row */}
          <div className="py-3 flex items-center justify-between">
            <div>
              <span
                className={`font-medium ${
                  isDark ? 'text-zinc-200' : 'text-zinc-800'
                }`}
              >
                IP & Infrastructure
              </span>
              <div
                className={`text-[11px] mt-0.5 ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              >
                {ipsCount > 0
                  ? `${ipsCount} IP address(es) and ASN data mapped`
                  : 'No IP infrastructure resolved'}
              </div>
            </div>
            {ipsCount > 0 && (
              <button
                onClick={() => onSelectTab('infrastructure')}
                className="text-blue-500 hover:underline text-xs flex items-center gap-0.5 font-medium"
              >
                <span>View infrastructure</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Certificates Row */}
          <div className="py-3 flex items-center justify-between">
            <div>
              <span
                className={`font-medium ${
                  isDark ? 'text-zinc-200' : 'text-zinc-800'
                }`}
              >
                Certificates & Subdomains
              </span>
              <div
                className={`text-[11px] mt-0.5 ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              >
                {subdomainsCount > 0
                  ? `${subdomainsCount} subdomains discovered from Certificate Transparency`
                  : 'No certificate transparency subdomains'}
              </div>
            </div>
            {subdomainsCount > 0 && (
              <button
                onClick={() => onSelectTab('certificates')}
                className="text-blue-500 hover:underline text-xs flex items-center gap-0.5 font-medium"
              >
                <span>View certificates</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Code / Repositories Row */}
          <div className="py-3 flex items-center justify-between">
            <div>
              <span
                className={`font-medium ${
                  isDark ? 'text-zinc-200' : 'text-zinc-800'
                }`}
              >
                Public repositories
              </span>
              <div
                className={`text-[11px] mt-0.5 ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              >
                {repositoriesCount > 0
                  ? `${repositoriesCount} public repository findings`
                  : 'No public repositories found'}
              </div>
            </div>
            {repositoriesCount > 0 && (
              <button
                onClick={() => onSelectTab('code')}
                className="text-blue-500 hover:underline text-xs flex items-center gap-0.5 font-medium"
              >
                <span>View code</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Exposure Score Factors Table */}
      {exposureScore.factors && exposureScore.factors.length > 0 && (
        <div
          className={`p-5 sm:p-6 rounded-xl border transition-colors ${
            isDark
              ? 'bg-[#111214] border-[#222428]'
              : 'bg-white border-[#DDDDD8] shadow-sm'
          }`}
        >
          <div className="mb-4">
            <h3
              className={`text-sm font-semibold ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}
            >
              Observed factors
            </h3>
            <p
              className={`text-xs mt-0.5 ${
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              }`}
            >
              This score is an estimate based on the information found in this search. It is not a standard security rating.
            </p>
          </div>

          <div
            className={`divide-y text-xs ${
              isDark ? 'divide-[#222428]' : 'divide-[#DDDDD8]'
            }`}
          >
            {exposureScore.factors.map((factor, idx) => (
              <div
                key={idx}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    {getImpactBadge(factor.impact)}
                    <span
                      className={`font-medium ${
                        isDark ? 'text-zinc-100' : 'text-zinc-900'
                      }`}
                    >
                      {factor.name}
                    </span>
                    <span
                      className={`text-[11px] ${
                        isDark ? 'text-zinc-500' : 'text-zinc-400'
                      }`}
                    >
                      · {factor.category}
                    </span>
                  </div>
                  <p className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
                    {factor.description}
                  </p>
                  {factor.evidence && (
                    <div
                      className={`text-[11px] font-mono mt-1 ${
                        isDark ? 'text-zinc-400' : 'text-zinc-600'
                      }`}
                    >
                      Evidence: {factor.evidence}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`font-medium ${
                      isDark ? 'text-zinc-400' : 'text-zinc-600'
                    }`}
                  >
                    {factor.points > 0 ? `+${factor.points} pts` : 'Secured'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
