import React from 'react';
import { InvestigationResult } from '../../types/osint';
import { useTheme } from '../../utils/theme';
import { ExternalLink, CheckCircle2 } from 'lucide-react';

interface CertificatesTabProps {
  result: InvestigationResult;
}

export const CertificatesTab: React.FC<CertificatesTabProps> = ({ result }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const crtsh = result.modules.crtsh;
  const tls = result.modules.tls;

  return (
    <div className="space-y-6" id="certificates-tab-content">
      {/* Live TLS Handshake Details */}
      {tls?.status === 'FOUND' && tls.data && (
        <div
          className={`p-5 sm:p-6 rounded-xl border transition-colors space-y-4 ${
            isDark
              ? 'bg-[#111214] border-[#222428]'
              : 'bg-white border-[#DDDDD8] shadow-sm'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
            <h3
              className={`text-sm font-semibold ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}
            >
              TLS certificate details (Port {tls.port})
            </h3>
            <span
              className={`text-xs ${
                isDark ? 'text-zinc-400' : 'text-zinc-500'
              }`}
            >
              Source: {tls.source}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className={isDark ? 'text-zinc-500' : 'text-zinc-500'}>
                Issuer
              </span>
              <div
                className={`font-medium mt-0.5 truncate ${
                  isDark ? 'text-zinc-200' : 'text-zinc-800'
                }`}
              >
                {tls.data.issuer.O || tls.data.issuer.CN || 'Unknown CA'}
              </div>
            </div>

            <div>
              <span className={isDark ? 'text-zinc-500' : 'text-zinc-500'}>
                Validity
              </span>
              <div
                className={`font-medium mt-0.5 ${
                  tls.data.isExpired
                    ? 'text-red-500'
                    : isDark
                    ? 'text-emerald-400'
                    : 'text-emerald-600'
                }`}
              >
                {tls.data.isExpired
                  ? 'Expired'
                  : `${tls.data.daysRemaining} days remaining`}
              </div>
            </div>

            <div>
              <span className={isDark ? 'text-zinc-500' : 'text-zinc-500'}>
                Protocol & cipher
              </span>
              <div
                className={`font-medium mt-0.5 truncate ${
                  isDark ? 'text-zinc-200' : 'text-zinc-800'
                }`}
              >
                {tls.data.protocol} · {tls.data.cipher}
              </div>
            </div>

            <div>
              <span className={isDark ? 'text-zinc-500' : 'text-zinc-500'}>
                Names
              </span>
              <div
                className={`font-medium mt-0.5 truncate ${
                  isDark ? 'text-zinc-200' : 'text-zinc-800'
                }`}
              >
                {tls.data.isWildcard ? 'Wildcard (*.)' : `${tls.data.sans.length} SANs`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discovered Subdomains via crt.sh */}
      <div
        className={`p-5 sm:p-6 rounded-xl border transition-colors space-y-4 ${
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
              Certificate transparency subdomains ({crtsh?.uniqueSubdomainsCount || 0})
            </h3>
            <p
              className={`text-xs mt-0.5 ${
                isDark ? 'text-zinc-400' : 'text-zinc-500'
              }`}
            >
              Discovered via crt.sh public Certificate Transparency logs
            </p>
          </div>
          {crtsh?.sourceUrl && (
            <a
              href={crtsh.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-500 hover:underline flex items-center gap-1 font-medium"
            >
              <span>View crt.sh query</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {crtsh?.subdomains && crtsh.subdomains.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[480px]">
              <thead>
                <tr
                  className={`border-b text-[11px] font-semibold ${
                    isDark
                      ? 'border-[#222428] text-zinc-400'
                      : 'border-[#DDDDD8] text-zinc-500'
                  }`}
                >
                  <th className="pb-2.5 pr-4">Hostname</th>
                  <th className="pb-2.5 pr-4">Type</th>
                  <th className="pb-2.5 pr-4">Resolution</th>
                  <th className="pb-2.5">Resolved IP</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y text-[11px] ${
                  isDark
                    ? 'divide-[#222428] text-zinc-300'
                    : 'divide-[#DDDDD8] text-zinc-700'
                }`}
              >
                {crtsh.subdomains.map((sub: any, i: number) => (
                  <tr key={i}>
                    <td className="py-2.5 pr-4 font-mono font-medium">
                      {sub.hostname}
                    </td>
                    <td className="py-2.5 pr-4 text-zinc-500">
                      {sub.isWildcard ? 'Wildcard' : 'Standard'}
                    </td>
                    <td className="py-2.5 pr-4">
                      {sub.resolved ? (
                        <span className="text-emerald-500 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Resolved
                        </span>
                      ) : (
                        <span className="text-zinc-500">No A record</span>
                      )}
                    </td>
                    <td className="py-2.5 font-mono text-zinc-500">
                      {sub.ips?.join(', ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            className={`p-6 text-center text-xs ${
              isDark ? 'text-zinc-500' : 'text-zinc-500'
            }`}
          >
            No subdomains discovered in certificate transparency logs.
          </div>
        )}
      </div>
    </div>
  );
};
