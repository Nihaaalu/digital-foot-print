import React from 'react';
import { InvestigationResult } from '../../types/osint';
import { useTheme } from '../../utils/theme';
import { ExternalLink, Info } from 'lucide-react';

interface InfrastructureTabProps {
  result: InvestigationResult;
}

export const InfrastructureTab: React.FC<InfrastructureTabProps> = ({ result }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const ipinfo = result.modules.ipinfo;
  const abuse = result.modules.abuseipdb;

  return (
    <div className="space-y-6" id="infrastructure-tab-content">
      {ipinfo?.status === 'FOUND' && ipinfo.data ? (
        <div
          className={`p-5 sm:p-6 rounded-xl border transition-colors space-y-6 ${
            isDark
              ? 'bg-[#111214] border-[#222428]'
              : 'bg-white border-[#DDDDD8] shadow-sm'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
            <div>
              <h3
                className={`text-sm font-semibold ${
                  isDark ? 'text-white' : 'text-zinc-900'
                }`}
              >
                IP intelligence & routing ({ipinfo.ip})
              </h3>
              <p
                className={`text-xs mt-0.5 ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              >
                Source: {ipinfo.source}
              </p>
            </div>
            {ipinfo.sourceUrl && (
              <a
                href={ipinfo.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-500 hover:underline flex items-center gap-1 font-medium"
              >
                <span>View on IPinfo</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div
              className={`p-3.5 rounded-lg border ${
                isDark
                  ? 'bg-[#17181A] border-[#2E3136]'
                  : 'bg-zinc-50 border-[#DDDDD8]'
              }`}
            >
              <span className={isDark ? 'text-zinc-500' : 'text-zinc-500'}>
                Autonomous System (ASN)
              </span>
              <div
                className={`font-semibold font-mono text-sm mt-0.5 ${
                  isDark ? 'text-zinc-100' : 'text-zinc-900'
                }`}
              >
                {ipinfo.data.asn || 'N/A'}
              </div>
              <div
                className={`text-[11px] truncate mt-0.5 ${
                  isDark ? 'text-zinc-400' : 'text-zinc-600'
                }`}
              >
                {ipinfo.data.asName || 'Autonomous System Network'}
              </div>
            </div>

            <div
              className={`p-3.5 rounded-lg border ${
                isDark
                  ? 'bg-[#17181A] border-[#2E3136]'
                  : 'bg-zinc-50 border-[#DDDDD8]'
              }`}
            >
              <span className={isDark ? 'text-zinc-500' : 'text-zinc-500'}>
                Organization / ISP
              </span>
              <div
                className={`font-semibold text-sm mt-0.5 truncate ${
                  isDark ? 'text-zinc-100' : 'text-zinc-900'
                }`}
              >
                {ipinfo.data.org || 'Unspecified ISP'}
              </div>
              <div
                className={`text-[11px] mt-0.5 ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              >
                BGP announced route owner
              </div>
            </div>

            <div
              className={`p-3.5 rounded-lg border ${
                isDark
                  ? 'bg-[#17181A] border-[#2E3136]'
                  : 'bg-zinc-50 border-[#DDDDD8]'
              }`}
            >
              <span className={isDark ? 'text-zinc-500' : 'text-zinc-500'}>
                Hostname / Reverse DNS
              </span>
              <div
                className={`font-semibold font-mono text-sm mt-0.5 truncate ${
                  isDark ? 'text-zinc-100' : 'text-zinc-900'
                }`}
              >
                {ipinfo.data.hostname || 'No PTR Record'}
              </div>
              <div
                className={`text-[11px] mt-0.5 ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              >
                Reverse DNS PTR lookup
              </div>
            </div>

            <div
              className={`p-3.5 rounded-lg border ${
                isDark
                  ? 'bg-[#17181A] border-[#2E3136]'
                  : 'bg-zinc-50 border-[#DDDDD8]'
              }`}
            >
              <span className={isDark ? 'text-zinc-500' : 'text-zinc-500'}>
                Approximate location
              </span>
              <div
                className={`font-semibold text-sm mt-0.5 ${
                  isDark ? 'text-zinc-100' : 'text-zinc-900'
                }`}
              >
                {[ipinfo.data.city, ipinfo.data.region, ipinfo.data.country]
                  .filter(Boolean)
                  .join(', ') || 'Unknown'}
              </div>
              <div
                className={`text-[11px] mt-0.5 ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              >
                Country: {ipinfo.data.countryCode || 'N/A'}
              </div>
            </div>

            <div
              className={`p-3.5 rounded-lg border ${
                isDark
                  ? 'bg-[#17181A] border-[#2E3136]'
                  : 'bg-zinc-50 border-[#DDDDD8]'
              }`}
            >
              <span className={isDark ? 'text-zinc-500' : 'text-zinc-500'}>
                Coordinates & timezone
              </span>
              <div
                className={`font-semibold font-mono text-sm mt-0.5 ${
                  isDark ? 'text-zinc-100' : 'text-zinc-900'
                }`}
              >
                {ipinfo.data.loc || 'N/A'}
              </div>
              <div
                className={`text-[11px] mt-0.5 ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              >
                Timezone: {ipinfo.data.timezone || 'N/A'}
              </div>
            </div>

            <div
              className={`p-3.5 rounded-lg border ${
                isDark
                  ? 'bg-[#17181A] border-[#2E3136]'
                  : 'bg-zinc-50 border-[#DDDDD8]'
              }`}
            >
              <span className={isDark ? 'text-zinc-500' : 'text-zinc-500'}>
                Abuse reputation
              </span>
              <div
                className={`font-semibold text-sm mt-0.5 ${
                  abuse?.data && abuse.data.abuseConfidenceScore > 20
                    ? 'text-red-500'
                    : 'text-emerald-500'
                }`}
              >
                {abuse?.status === 'FOUND' && abuse.data
                  ? `${abuse.data.abuseConfidenceScore}% confidence score`
                  : 'Clean / No reports'}
              </div>
              <div
                className={`text-[11px] mt-0.5 ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              >
                {abuse?.data
                  ? `${abuse.data.totalReports} reports in AbuseIPDB`
                  : 'AbuseIPDB status'}
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div
            className={`p-3 rounded-lg text-xs flex items-start gap-2 border ${
              isDark
                ? 'bg-[#17181A] border-[#2E3136] text-zinc-400'
                : 'bg-zinc-50 border-[#DDDDD8] text-zinc-600'
            }`}
          >
            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Notice:</strong> {ipinfo.data.disclaimer}
            </p>
          </div>
        </div>
      ) : (
        <div
          className={`p-8 text-center rounded-xl border text-xs ${
            isDark
              ? 'bg-[#111214] border-[#222428] text-zinc-500'
              : 'bg-white border-[#DDDDD8] text-zinc-500'
          }`}
        >
          No IP infrastructure information found for this target.
        </div>
      )}
    </div>
  );
};
