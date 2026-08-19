import React from 'react';
import { InvestigationResult } from '../../types/osint';
import { useTheme } from '../../utils/theme';
import { ExternalLink } from 'lucide-react';

interface ReputationTabProps {
  result: InvestigationResult;
}

export const ReputationTab: React.FC<ReputationTabProps> = ({ result }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const abuse = result.modules.abuseipdb;
  const vt = result.modules.virustotal;

  if (!abuse && !vt) {
    return (
      <div
        className={`p-12 text-center rounded-xl border text-sm ${
          isDark
            ? 'bg-[#111214] border-[#222428] text-zinc-400'
            : 'bg-white border-[#DDDDD8] text-zinc-600'
        }`}
      >
        No reputation intelligence gathered for this target.
      </div>
    );
  }

  return (
    <div className="space-y-6" id="reputation-tab-content">
      {/* AbuseIPDB Card */}
      {abuse && (
        <div
          className={`p-5 sm:p-6 rounded-xl border transition-colors ${
            isDark
              ? 'bg-[#111214] border-[#222428]'
              : 'bg-white border-[#DDDDD8] shadow-sm'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-inherit">
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  AbuseIPDB Threat Intelligence
                </h2>
                <span className={`text-xs px-2 py-0.5 rounded font-mono ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'}`}>
                  {abuse.ip}
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {abuse.source}
              </p>
            </div>
            {abuse.sourceUrl && (
              <a
                href={abuse.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className={`text-xs flex items-center gap-1 font-medium transition-colors ${
                  isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <span>View on AbuseIPDB</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {abuse.status === 'OPTIONAL_NOT_CONFIGURED' ? (
            <div
              className={`mt-4 p-4 rounded-lg border text-xs ${
                isDark
                  ? 'bg-[#16181B] border-[#26282E] text-zinc-400'
                  : 'bg-[#F9F9F8] border-[#E5E5E0] text-zinc-600'
              }`}
            >
              <div className={`font-semibold mb-1 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                AbuseIPDB API key not configured
              </div>
              <p>{abuse.error || 'Optional API key can be configured in Settings to enable direct IP threat intelligence checks.'}</p>
            </div>
          ) : abuse.data ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div
                className={`p-4 rounded-lg border ${
                  isDark
                    ? 'bg-[#16181B] border-[#26282E]'
                    : 'bg-[#F9F9F8] border-[#E5E5E0]'
                }`}
              >
                <div className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Abuse Confidence Score
                </div>
                <div
                  className={`text-2xl font-bold mt-1 ${
                    abuse.data.abuseConfidenceScore > 20
                      ? 'text-red-500'
                      : 'text-emerald-500'
                  }`}
                >
                  {abuse.data.abuseConfidenceScore}%
                </div>
                <div className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Calculated abuse likelihood
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
                  Total Reports
                </div>
                <div className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {abuse.data.totalReports}
                </div>
                <div className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  By {abuse.data.numDistinctUsers} distinct users
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
                  Last Reported
                </div>
                <div className={`text-sm font-semibold mt-2 truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {abuse.data.lastReportedAt
                    ? new Date(abuse.data.lastReportedAt).toLocaleDateString()
                    : 'Never'}
                </div>
                <div className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {abuse.data.usageType || 'Public Host'}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* VirusTotal Card */}
      {vt && (
        <div
          className={`p-5 sm:p-6 rounded-xl border transition-colors ${
            isDark
              ? 'bg-[#111214] border-[#222428]'
              : 'bg-white border-[#DDDDD8] shadow-sm'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-inherit">
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  VirusTotal Community Intelligence
                </h2>
                <span className={`text-xs px-2 py-0.5 rounded font-mono ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'}`}>
                  {vt.target}
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {vt.source}
              </p>
            </div>
            {vt.sourceUrl && (
              <a
                href={vt.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className={`text-xs flex items-center gap-1 font-medium transition-colors ${
                  isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <span>View on VirusTotal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {vt.status === 'OPTIONAL_NOT_CONFIGURED' ? (
            <div
              className={`mt-4 p-4 rounded-lg border text-xs ${
                isDark
                  ? 'bg-[#16181B] border-[#26282E] text-zinc-400'
                  : 'bg-[#F9F9F8] border-[#E5E5E0] text-zinc-600'
              }`}
            >
              <div className={`font-semibold mb-1 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                VirusTotal API key not configured
              </div>
              <p>{vt.error || 'Optional API key can be configured in Settings to enable direct VirusTotal multi-engine scans.'}</p>
            </div>
          ) : vt.data ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div
                className={`p-4 rounded-lg border ${
                  isDark
                    ? 'bg-[#16181B] border-[#26282E]'
                    : 'bg-[#F9F9F8] border-[#E5E5E0]'
                }`}
              >
                <div className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Malicious Detections
                </div>
                <div
                  className={`text-2xl font-bold mt-1 ${
                    vt.data.lastAnalysisStats.malicious > 0
                      ? 'text-red-500'
                      : 'text-emerald-500'
                  }`}
                >
                  {vt.data.lastAnalysisStats.malicious} / {vt.data.lastAnalysisStats.harmless + vt.data.lastAnalysisStats.undetected + vt.data.lastAnalysisStats.malicious}
                </div>
                <div className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Security engines flagged
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
                  Reputation Score
                </div>
                <div className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {vt.data.reputation}
                </div>
                <div className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Community votes balance
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
                  Analysis Timestamp
                </div>
                <div className={`text-sm font-semibold mt-2 truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {vt.data.lastAnalysisDate || 'Recent'}
                </div>
                <div className={`text-[11px] mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Engine scan date
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
