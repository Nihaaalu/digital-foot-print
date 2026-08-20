import React from 'react';
import { InvestigationResult } from '../../types/osint';
import { useTheme } from '../../utils/theme';
import { CheckCircle2, AlertTriangle, Info, Globe, Shield, Clock, ExternalLink } from 'lucide-react';

interface DomainsDnsTabProps {
  result: InvestigationResult;
}

export const DomainsDnsTab: React.FC<DomainsDnsTabProps> = ({
  result,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const dns = result.modules.dns;
  const rdap = result.modules.rdap;
  const whois = result.modules.whoisFreaks;

  return (
    <div className="space-y-6" id="domains-dns-tab-content">
      {/* Registration Details (RDAP) */}
      {rdap?.status === 'FOUND' && rdap.data && (
        <div
          className={`p-5 sm:p-6 rounded-xl border transition-colors ${
            isDark
              ? 'bg-[#111214] border-[#222428]'
              : 'bg-white border-[#DDDDD8] shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <h3
              className={`text-sm font-semibold flex items-center gap-2 ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}
            >
              <Globe className="w-4 h-4 text-blue-500" />
              <span>Domain registration (RDAP Registry)</span>
            </h3>
            <span
              className={`text-xs ${
                isDark ? 'text-zinc-400' : 'text-zinc-500'
              }`}
            >
              Source: {rdap.source}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className={isDark ? 'text-zinc-500' : 'text-zinc-500'}>
                Registrar
              </span>
              <div
                className={`font-medium mt-0.5 ${
                  isDark ? 'text-zinc-200' : 'text-zinc-800'
                }`}
              >
                {rdap.data.registrar || 'Protected / Unknown'}
              </div>
            </div>

            <div>
              <span className={isDark ? 'text-zinc-500' : 'text-zinc-500'}>
                Created
              </span>
              <div
                className={`font-medium mt-0.5 ${
                  isDark ? 'text-zinc-200' : 'text-zinc-800'
                }`}
              >
                {rdap.data.creationDate
                  ? new Date(rdap.data.creationDate).toLocaleDateString()
                  : 'N/A'}
              </div>
            </div>

            <div>
              <span className={isDark ? 'text-zinc-500' : 'text-zinc-500'}>
                Expires
              </span>
              <div
                className={`font-medium mt-0.5 ${
                  isDark ? 'text-zinc-200' : 'text-zinc-800'
                }`}
              >
                {rdap.data.expirationDate
                  ? new Date(rdap.data.expirationDate).toLocaleDateString()
                  : 'N/A'}
              </div>
            </div>

            <div>
              <span className={isDark ? 'text-zinc-500' : 'text-zinc-500'}>
                Last updated
              </span>
              <div
                className={`font-medium mt-0.5 ${
                  isDark ? 'text-zinc-200' : 'text-zinc-800'
                }`}
              >
                {rdap.data.updatedDate
                  ? new Date(rdap.data.updatedDate).toLocaleDateString()
                  : 'N/A'}
              </div>
            </div>
          </div>

          {/* Nameservers */}
          {rdap.data.nameservers && rdap.data.nameservers.length > 0 && (
            <div className="mt-4 pt-3 border-t text-xs">
              <span
                className={`block mb-1.5 ${
                  isDark ? 'text-zinc-500' : 'text-zinc-500'
                }`}
              >
                Authoritative nameservers
              </span>
              <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                {rdap.data.nameservers.map((ns: string, i: number) => (
                  <span
                    key={i}
                    className={`px-2 py-0.5 rounded border ${
                      isDark
                        ? 'bg-[#17181A] border-[#2E3136] text-zinc-300'
                        : 'bg-zinc-50 border-[#DDDDD8] text-zinc-700'
                    }`}
                  >
                    {ns}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dedicated Live WHOIS (WhoisFreaks) */}
      {whois && (
        <div
          className={`p-5 sm:p-6 rounded-xl border transition-colors ${
            isDark
              ? 'bg-[#111214] border-[#222428]'
              : 'bg-white border-[#DDDDD8] shadow-sm'
          }`}
          id="whoisfreaks-section"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 mb-4 gap-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <h3
                className={`text-sm font-semibold ${
                  isDark ? 'text-white' : 'text-zinc-900'
                }`}
              >
                Live WHOIS (WhoisFreaks)
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`px-2 py-0.5 rounded font-medium ${
                  whois.status === 'FOUND'
                    ? isDark
                      ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : whois.status === 'CONFIGURATION_MISSING'
                    ? isDark
                      ? 'bg-zinc-800 text-zinc-400'
                      : 'bg-zinc-100 text-zinc-600'
                    : whois.status === 'RATE_LIMITED'
                    ? isDark
                      ? 'bg-amber-950/70 text-amber-300 border border-amber-800/60'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                    : isDark
                    ? 'bg-zinc-800 text-zinc-400'
                    : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                {whois.status === 'FOUND'
                  ? 'WHOIS Record Verified'
                  : whois.status === 'CONFIGURATION_MISSING'
                  ? 'API Key Not Configured'
                  : whois.status === 'RATE_LIMITED'
                  ? 'Rate Limited'
                  : whois.status === 'NOT_FOUND'
                  ? 'No Record Found'
                  : whois.status}
              </span>
              <a
                href={whois.sourceUrl || 'https://whoisfreaks.com'}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center gap-1 hover:underline ${
                  isDark ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              >
                <span>WhoisFreaks API</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {whois.status === 'FOUND' ? (
            <div className="space-y-4 text-xs">
              {/* Primary WHOIS Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className={isDark ? 'text-zinc-500' : 'text-zinc-500'}>
                    Registrar
                  </span>
                  <div
                    className={`font-medium mt-0.5 ${
                      isDark ? 'text-zinc-200' : 'text-zinc-800'
                    }`}
                  >
                    {whois.registrar || 'Not available'}
                    {whois.registrarIanaId && (
                      <span className="text-[10px] text-zinc-500 ml-1">
                        (IANA ID: {whois.registrarIanaId})
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <span className={isDark ? 'text-zinc-500' : 'text-zinc-500'}>
                    Registered On
                  </span>
                  <div
                    className={`font-medium mt-0.5 ${
                      isDark ? 'text-zinc-200' : 'text-zinc-800'
                    }`}
                  >
                    {whois.createdDate
                      ? new Date(whois.createdDate).toLocaleDateString()
                      : 'N/A'}
                  </div>
                </div>

                <div>
                  <span className={isDark ? 'text-zinc-500' : 'text-zinc-500'}>
                    Expires On
                  </span>
                  <div
                    className={`font-medium mt-0.5 ${
                      isDark ? 'text-zinc-200' : 'text-zinc-800'
                    }`}
                  >
                    {whois.expiryDate
                      ? new Date(whois.expiryDate).toLocaleDateString()
                      : 'N/A'}
                  </div>
                </div>

                <div>
                  <span className={isDark ? 'text-zinc-500' : 'text-zinc-500'}>
                    DNSSEC
                  </span>
                  <div
                    className={`font-medium mt-0.5 capitalize ${
                      isDark ? 'text-zinc-200' : 'text-zinc-800'
                    }`}
                  >
                    {whois.dnssec || 'Unsigned'}
                  </div>
                </div>
              </div>

              {/* Registrant / Contact Details (if available) */}
              {whois.registrant && (whois.registrant.organization || whois.registrant.country || whois.registrant.city) && (
                <div className="pt-3 border-t">
                  <span
                    className={`block mb-1.5 font-medium ${
                      isDark ? 'text-zinc-400' : 'text-zinc-600'
                    }`}
                  >
                    Registrant details
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {whois.registrant.organization && (
                      <div>
                        <span className="text-[11px] text-zinc-500">Organization / Company</span>
                        <p className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                          {whois.registrant.organization}
                        </p>
                      </div>
                    )}
                    {(whois.registrant.city || whois.registrant.state) && (
                      <div>
                        <span className="text-[11px] text-zinc-500">Location</span>
                        <p className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                          {[whois.registrant.city, whois.registrant.state].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    )}
                    {whois.registrant.country && (
                      <div>
                        <span className="text-[11px] text-zinc-500">Country</span>
                        <p className={`font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                          {whois.registrant.country}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status Codes */}
              {whois.statusCodes && whois.statusCodes.length > 0 && (
                <div className="pt-3 border-t">
                  <span
                    className={`block mb-1.5 ${
                      isDark ? 'text-zinc-500' : 'text-zinc-500'
                    }`}
                  >
                    Domain status codes
                  </span>
                  <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                    {whois.statusCodes.map((sc, i) => (
                      <span
                        key={i}
                        className={`px-2 py-0.5 rounded border ${
                          isDark
                            ? 'bg-[#17181A] border-[#2E3136] text-zinc-300'
                            : 'bg-zinc-50 border-[#DDDDD8] text-zinc-700'
                        }`}
                      >
                        {sc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Name Servers */}
              {whois.nameServers && whois.nameServers.length > 0 && (
                <div className="pt-3 border-t">
                  <span
                    className={`block mb-1.5 ${
                      isDark ? 'text-zinc-500' : 'text-zinc-500'
                    }`}
                  >
                    WHOIS nameservers
                  </span>
                  <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
                    {whois.nameServers.map((ns, i) => (
                      <span
                        key={i}
                        className={`px-2 py-0.5 rounded border ${
                          isDark
                            ? 'bg-[#17181A] border-[#2E3136] text-zinc-300'
                            : 'bg-zinc-50 border-[#DDDDD8] text-zinc-700'
                        }`}
                      >
                        {ns}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : whois.status === 'CONFIGURATION_MISSING' ? (
            <div
              className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                isDark
                  ? 'bg-[#17181A] border-[#2E3136] text-zinc-400'
                  : 'bg-zinc-50 border-[#DDDDD8] text-zinc-600'
              }`}
            >
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="leading-relaxed">
                  <strong>Optional enrichment:</strong> WhoisFreaks Live WHOIS API key is not configured.
                  RDAP and DNS modules above provide direct registration records.
                </p>
                <p className="text-[11px] opacity-80">
                  To enable live WHOIS lookups, register for a free WhoisFreaks account (500 free credits) and set{' '}
                  <code className="px-1 py-0.5 rounded bg-zinc-200/50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">WHOISFREAKS_API_KEY</code>{' '}
                  in your server environment.
                </p>
              </div>
            </div>
          ) : (
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {whois.error || 'No live WHOIS record data available.'}
            </p>
          )}
        </div>
      )}

      {/* DNS Records & Security Posture */}
      {dns ? (
        <div className="space-y-6">
          {/* Security Posture Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div
              className={`p-4 rounded-xl border transition-colors ${
                isDark
                  ? 'bg-[#111214] border-[#222428]'
                  : 'bg-white border-[#DDDDD8] shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`font-medium ${
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  }`}
                >
                  SPF security
                </span>
                {dns.security.spf.present ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                )}
              </div>
              <div
                className={`font-semibold ${
                  isDark ? 'text-zinc-100' : 'text-zinc-900'
                }`}
              >
                {dns.security.spf.present ? 'Configured' : 'Missing record'}
              </div>
              <p
                className={`text-[11px] truncate mt-1 ${
                  isDark ? 'text-zinc-400' : 'text-zinc-600'
                }`}
              >
                {dns.security.spf.raw || 'No SPF record found'}
              </p>
            </div>

            <div
              className={`p-4 rounded-xl border transition-colors ${
                isDark
                  ? 'bg-[#111214] border-[#222428]'
                  : 'bg-white border-[#DDDDD8] shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`font-medium ${
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  }`}
                >
                  DMARC policy
                </span>
                {dns.security.dmarc.present ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                )}
              </div>
              <div
                className={`font-semibold ${
                  isDark ? 'text-zinc-100' : 'text-zinc-900'
                }`}
              >
                {dns.security.dmarc.present
                  ? `Policy: ${dns.security.dmarc.policy}`
                  : 'Missing record'}
              </div>
              <p
                className={`text-[11px] truncate mt-1 ${
                  isDark ? 'text-zinc-400' : 'text-zinc-600'
                }`}
              >
                {dns.security.dmarc.raw || 'No _dmarc record found'}
              </p>
            </div>

            <div
              className={`p-4 rounded-xl border transition-colors ${
                isDark
                  ? 'bg-[#111214] border-[#222428]'
                  : 'bg-white border-[#DDDDD8] shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`font-medium ${
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  }`}
                >
                  CAA certificate authority
                </span>
                {dns.security.caa.present ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Info className="w-3.5 h-3.5 text-zinc-400" />
                )}
              </div>
              <div
                className={`font-semibold ${
                  isDark ? 'text-zinc-100' : 'text-zinc-900'
                }`}
              >
                {dns.security.caa.present
                  ? `${dns.security.caa.issuers.length} issuer(s) restricted`
                  : 'No CAA restriction'}
              </div>
              <p
                className={`text-[11px] truncate mt-1 ${
                  isDark ? 'text-zinc-400' : 'text-zinc-600'
                }`}
              >
                {dns.security.caa.issuers.join(', ') ||
                  'Any public authority may issue certificates'}
              </p>
            </div>
          </div>

          {/* DNS Records Table */}
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
              DNS records ({dns.domain})
            </h3>

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
                    <th className="pb-2.5 pr-4">Type</th>
                    <th className="pb-2.5 pr-4">Value</th>
                    <th className="pb-2.5">Details</th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y font-mono text-[11px] ${
                    isDark
                      ? 'divide-[#222428] text-zinc-300'
                      : 'divide-[#DDDDD8] text-zinc-700'
                  }`}
                >
                  {dns.records.A.map((ip: string, i: number) => (
                    <tr key={`a-${i}`}>
                      <td className="py-2.5 pr-4 font-semibold text-blue-500">A</td>
                      <td className="py-2.5 pr-4">{ip}</td>
                      <td className="py-2.5 font-sans text-zinc-500">IPv4 address</td>
                    </tr>
                  ))}
                  {dns.records.AAAA.map((ip6: string, i: number) => (
                    <tr key={`aaaa-${i}`}>
                      <td className="py-2.5 pr-4 font-semibold text-indigo-500">AAAA</td>
                      <td className="py-2.5 pr-4">{ip6}</td>
                      <td className="py-2.5 font-sans text-zinc-500">IPv6 address</td>
                    </tr>
                  ))}
                  {dns.records.MX.map((mx: any, i: number) => (
                    <tr key={`mx-${i}`}>
                      <td className="py-2.5 pr-4 font-semibold text-emerald-500">MX</td>
                      <td className="py-2.5 pr-4">{mx.exchange}</td>
                      <td className="py-2.5 font-sans text-zinc-500">Priority: {mx.priority}</td>
                    </tr>
                  ))}
                  {dns.records.NS.map((ns: string, i: number) => (
                    <tr key={`ns-${i}`}>
                      <td className="py-2.5 pr-4 font-semibold text-amber-500">NS</td>
                      <td className="py-2.5 pr-4">{ns}</td>
                      <td className="py-2.5 font-sans text-zinc-500">Nameserver</td>
                    </tr>
                  ))}
                  {dns.records.TXT.map((txt: string, i: number) => (
                    <tr key={`txt-${i}`}>
                      <td className="py-2.5 pr-4 font-semibold text-purple-500">TXT</td>
                      <td className="py-2.5 pr-4 break-all max-w-md">{txt}</td>
                      <td className="py-2.5 font-sans text-zinc-500">
                        {txt.startsWith('v=spf1')
                          ? 'SPF policy'
                          : txt.startsWith('v=DMARC1')
                          ? 'DMARC policy'
                          : 'Text record'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
          No domain or DNS records found for this target.
        </div>
      )}
    </div>
  );
};
