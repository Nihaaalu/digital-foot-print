import React, { useEffect, useState } from 'react';
import { fetchSettingsStatus, testIntegrationService } from '../services/api';
import { SettingsStatusResponse, IntegrationStatus } from '../types/osint';
import { useTheme } from '../utils/theme';
import { RefreshCw, Play, Loader2, Info } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [data, setData] = useState<SettingsStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState<
    Record<string, { testing: boolean; message?: string; success?: boolean }>
  >({});

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await fetchSettingsStatus();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const runTest = async (key: string) => {
    setTestResults((prev) => ({ ...prev, [key]: { testing: true } }));
    try {
      const res = await testIntegrationService(key);
      setTestResults((prev) => ({
        ...prev,
        [key]: { testing: false, success: res.success, message: res.message },
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [key]: {
          testing: false,
          success: false,
          message: err.message || 'Test failed',
        },
      }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" id="settings-view">
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
            Connected services & API status
          </h2>
          <p
            className={`text-xs mt-0.5 ${
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            }`}
          >
            Monitor status for public OSINT registries and optional server API keys
          </p>
        </div>

        <button
          onClick={loadStatus}
          disabled={loading}
          className={`px-3 py-1.5 text-xs font-medium rounded-md border transition flex items-center gap-1.5 self-start sm:self-auto ${
            isDark
              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-[#2E3136]'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh status</span>
        </button>
      </div>

      {/* Security Architecture Notice */}
      <div
        className={`p-4 rounded-xl text-xs flex items-start gap-2.5 border ${
          isDark
            ? 'bg-[#17181A] border-[#2E3136] text-zinc-400'
            : 'bg-zinc-50 border-[#DDDDD8] text-zinc-600'
        }`}
      >
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Security notice:</strong> All API requests and credentials
          (GitHub, IPinfo, AbuseIPDB, VirusTotal) are executed server-side. No
          sensitive credentials or private tokens are sent to the client browser.
        </p>
      </div>

      {/* Service List */}
      <div
        className={`rounded-xl border divide-y transition-colors ${
          isDark
            ? 'bg-[#111214] border-[#222428] divide-[#222428]'
            : 'bg-white border-[#DDDDD8] divide-[#DDDDD8] shadow-sm'
        }`}
      >
        {data &&
          Object.entries(data.integrations).map(
            ([key, info]: [string, IntegrationStatus]) => {
              const test = testResults[key];

              return (
                <div
                  key={key}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    isDark ? 'hover:bg-zinc-800/20' : 'hover:bg-zinc-50/50'
                  }`}
                >
                  <div className="space-y-1 min-w-0 max-w-xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`font-semibold text-sm ${
                          isDark ? 'text-white' : 'text-zinc-900'
                        }`}
                      >
                        {info.name}
                      </span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                          info.status === 'CONNECTED'
                            ? isDark
                              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : info.status === 'OPEN_TIER'
                            ? isDark
                              ? 'bg-blue-950/70 text-blue-300 border border-blue-800/60'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                            : isDark
                            ? 'bg-zinc-800 text-zinc-400'
                            : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {info.status === 'CONNECTED'
                          ? 'Configured'
                          : info.status === 'OPEN_TIER'
                          ? 'Open public tier'
                          : 'Optional / Unset'}
                      </span>
                    </div>

                    <p
                      className={`text-xs ${
                        isDark ? 'text-zinc-400' : 'text-zinc-600'
                      }`}
                    >
                      {info.description}
                    </p>

                    {info.rateLimit && (
                      <div
                        className={`text-xs pt-0.5 ${
                          isDark ? 'text-zinc-400' : 'text-zinc-500'
                        }`}
                      >
                        Rate limit: {info.rateLimit.remaining} /{' '}
                        {info.rateLimit.limit} remaining
                      </div>
                    )}

                    {test?.message && (
                      <div
                        className={`text-xs p-2 rounded border mt-2 ${
                          test.success
                            ? isDark
                              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : isDark
                            ? 'bg-red-950/40 text-red-300 border-red-800/60'
                            : 'bg-red-50 text-red-800 border-red-200'
                        }`}
                      >
                        {test.message}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {['github', 'ipinfo', 'abuseipdb', 'virustotal'].includes(
                      key
                    ) && (
                      <button
                        onClick={() => runTest(key)}
                        disabled={test?.testing}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md border transition flex items-center gap-1.5 ${
                          isDark
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-[#2E3136]'
                            : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200'
                        }`}
                      >
                        {test?.testing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Testing...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 text-blue-500" />
                            <span>Test connection</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            }
          )}
      </div>
    </div>
  );
};
