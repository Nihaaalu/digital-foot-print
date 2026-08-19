import React from 'react';
import { InvestigationResult } from '../../types/osint';
import { useTheme } from '../../utils/theme';
import { ShieldCheck, ShieldAlert, ArrowRight, Check, X as XIcon } from 'lucide-react';

interface PassiveTechTabProps {
  result: InvestigationResult;
}

export const PassiveTechTab: React.FC<PassiveTechTabProps> = ({ result }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const http = result.modules.passiveHttp;

  if (!http) {
    return (
      <div
        className={`p-12 text-center rounded-xl border text-sm ${
          isDark
            ? 'bg-[#111214] border-[#222428] text-zinc-400'
            : 'bg-white border-[#DDDDD8] text-zinc-600'
        }`}
      >
        No passive HTTP inspection performed for this target.
      </div>
    );
  }

  const { technologies, securityHeaders, headers, redirectChain } = http;

  const securityHeaderItems = [
    {
      name: 'Strict-Transport-Security (HSTS)',
      data: securityHeaders.hsts,
      description: 'Enforces encrypted HTTPS connections',
    },
    {
      name: 'Content-Security-Policy (CSP)',
      data: securityHeaders.csp,
      description: 'Restricts script sources and prevents XSS',
    },
    {
      name: 'X-Frame-Options',
      data: securityHeaders.xFrameOptions,
      description: 'Prevents clickjacking in iframes',
    },
    {
      name: 'X-Content-Type-Options',
      data: securityHeaders.xContentTypeOptions,
      description: 'Blocks MIME type sniffing',
    },
    {
      name: 'Referrer-Policy',
      data: securityHeaders.referrerPolicy,
      description: 'Controls referrer information leakage',
    },
    {
      name: 'Permissions-Policy',
      data: securityHeaders.permissionsPolicy,
      description: 'Controls browser features and APIs',
    },
  ];

  return (
    <div className="space-y-6" id="passive-tech-tab-content">
      {/* Security Headers Summary */}
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
              Security Headers Posture
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Passive inspection of HTTP defense headers
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Header Score:
            </span>
            <span
              className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${
                securityHeaders.score > 60
                  ? isDark
                    ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : isDark
                  ? 'bg-amber-950/70 text-amber-300 border border-amber-800/60'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {securityHeaders.score} / 100
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
          {securityHeaderItems.map((item, i) => (
            <div
              key={i}
              className={`p-3.5 rounded-lg border flex items-start justify-between gap-3 ${
                isDark
                  ? 'bg-[#16181B] border-[#26282E]'
                  : 'bg-[#F9F9F8] border-[#E5E5E0]'
              }`}
            >
              <div className="min-w-0">
                <div className={`text-xs font-semibold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                  {item.name}
                </div>
                <div
                  className={`text-[11px] font-mono mt-1 truncate ${
                    item.data?.present
                      ? isDark
                        ? 'text-zinc-300'
                        : 'text-zinc-700'
                      : isDark
                      ? 'text-zinc-500'
                      : 'text-zinc-400'
                  }`}
                  title={item.data?.value || 'Not configured'}
                >
                  {item.data?.value || 'Not configured'}
                </div>
              </div>
              {item.data?.present ? (
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </span>
              ) : (
                <span className="w-5 h-5 rounded-full bg-zinc-500/10 text-zinc-400 flex items-center justify-center shrink-0">
                  <XIcon className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Detected Technologies */}
      <div
        className={`p-5 sm:p-6 rounded-xl border transition-colors ${
          isDark
            ? 'bg-[#111214] border-[#222428]'
            : 'bg-white border-[#DDDDD8] shadow-sm'
        }`}
      >
        <div className="pb-4 border-b border-inherit flex items-center justify-between">
          <div>
            <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Detected Technologies ({technologies.length})
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Web frameworks, servers, and scripts identified via passive fingerprinting
            </p>
          </div>
        </div>

        {technologies.length === 0 ? (
          <div className={`text-center py-8 text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            No specific technology signatures matched.
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b ${isDark ? 'border-[#222428] text-zinc-400' : 'border-[#DDDDD8] text-zinc-500'}`}>
                  <th className="py-2.5 px-3 font-medium">Technology</th>
                  <th className="py-2.5 px-3 font-medium">Category</th>
                  <th className="py-2.5 px-3 font-medium">Evidence / Header</th>
                  <th className="py-2.5 px-3 font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inherit">
                {technologies.map((tech: any, i: number) => (
                  <tr
                    key={i}
                    className={`transition-colors ${
                      isDark ? 'hover:bg-[#16181B]' : 'hover:bg-[#F9F9F8]'
                    }`}
                  >
                    <td className={`py-3 px-3 font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      {tech.name}
                    </td>
                    <td className={`py-3 px-3 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {tech.category}
                    </td>
                    <td className={`py-3 px-3 font-mono text-[11px] ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      {tech.evidence}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                          tech.confidence === 'Detected'
                            ? isDark
                              ? 'bg-emerald-950/60 text-emerald-300'
                              : 'bg-emerald-50 text-emerald-700'
                            : isDark
                            ? 'bg-zinc-800 text-zinc-300'
                            : 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {tech.confidence}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Redirect Chain & Response Headers Table */}
      <div
        className={`p-5 sm:p-6 rounded-xl border transition-colors ${
          isDark
            ? 'bg-[#111214] border-[#222428]'
            : 'bg-white border-[#DDDDD8] shadow-sm'
        }`}
      >
        <div className="pb-4 border-b border-inherit">
          <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            HTTP Response Headers
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Raw passive header inspection from initial request
          </p>
        </div>

        {redirectChain && redirectChain.length > 1 && (
          <div
            className={`mt-4 p-3 rounded-lg border flex items-center gap-2 text-xs flex-wrap ${
              isDark
                ? 'bg-[#16181B] border-[#26282E] text-zinc-300'
                : 'bg-[#F9F9F8] border-[#E5E5E0] text-zinc-700'
            }`}
          >
            <span className={`font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Redirect Chain:
            </span>
            {redirectChain.map((url: string, i: number) => (
              <React.Fragment key={i}>
                <span className="font-mono text-[11px]">{url}</span>
                {i < redirectChain.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-zinc-400" />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b ${isDark ? 'border-[#222428] text-zinc-400' : 'border-[#DDDDD8] text-zinc-500'}`}>
                <th className="py-2.5 px-3 font-medium w-1/3">Header Name</th>
                <th className="py-2.5 px-3 font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit font-mono text-[11px]">
              {Object.entries(headers).map(([key, val], i) => (
                <tr
                  key={i}
                  className={`transition-colors ${
                    isDark ? 'hover:bg-[#16181B]' : 'hover:bg-[#F9F9F8]'
                  }`}
                >
                  <td className={`py-2.5 px-3 font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    {key}
                  </td>
                  <td className={`py-2.5 px-3 break-all ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    {String(val)}
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
