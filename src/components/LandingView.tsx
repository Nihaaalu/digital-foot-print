import React from 'react';
import { InvestigationInput } from './InvestigationInput';
import { ManualTargetSelection } from '../types/osint';
import { useTheme } from '../utils/theme';
import { User, Globe, Server, Lock } from 'lucide-react';

interface LandingViewProps {
  onStartInvestigation: (target: string, selectedModules: string[], targetType?: ManualTargetSelection) => void;
  isLoading: boolean;
  onLoadDemo: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onStartInvestigation,
  isLoading,
  onLoadDemo,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-16 px-4 space-y-12" id="landing-view">
      {/* Search Header */}
      <div className="text-center space-y-3 max-w-xl mx-auto">
        <h1
          className={`text-2xl sm:text-3xl font-semibold tracking-tight ${
            isDark ? 'text-white' : 'text-zinc-900'
          }`}
        >
          Digital footprint investigator
        </h1>
        <p
          className={`text-sm sm:text-base leading-relaxed ${
            isDark ? 'text-zinc-400' : 'text-zinc-600'
          }`}
        >
          Search public information about a username, email, domain, IP address, or URL.
        </p>
      </div>

      {/* Main Search Input Form */}
      <div
        className={`p-6 sm:p-8 rounded-xl border transition-colors ${
          isDark
            ? 'bg-[#111214] border-[#222428]'
            : 'bg-white border-[#DDDDD8] shadow-sm'
        }`}
      >
        <InvestigationInput
          onStartInvestigation={onStartInvestigation}
          isLoading={isLoading}
          onLoadDemo={onLoadDemo}
        />
      </div>

      {/* Target Types Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
        <div
          className={`p-4 rounded-lg border transition-colors ${
            isDark
              ? 'bg-[#111214]/60 border-[#222428]'
              : 'bg-white border-[#DDDDD8]'
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <User className="w-4 h-4 text-blue-500" />
            <h2
              className={`text-sm font-semibold ${
                isDark ? 'text-zinc-200' : 'text-zinc-900'
              }`}
            >
              Usernames
            </h2>
          </div>
          <p
            className={`text-xs leading-relaxed ${
              isDark ? 'text-zinc-400' : 'text-zinc-600'
            }`}
          >
            Verified profile discovery across social networks and developer platforms.
          </p>
        </div>

        <div
          className={`p-4 rounded-lg border transition-colors ${
            isDark
              ? 'bg-[#111214]/60 border-[#222428]'
              : 'bg-white border-[#DDDDD8]'
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Globe className="w-4 h-4 text-emerald-500" />
            <h2
              className={`text-sm font-semibold ${
                isDark ? 'text-zinc-200' : 'text-zinc-900'
              }`}
            >
              Domains
            </h2>
          </div>
          <p
            className={`text-xs leading-relaxed ${
              isDark ? 'text-zinc-400' : 'text-zinc-600'
            }`}
          >
            DNS records, mail server configuration, RDAP registration, and security records.
          </p>
        </div>

        <div
          className={`p-4 rounded-lg border transition-colors ${
            isDark
              ? 'bg-[#111214]/60 border-[#222428]'
              : 'bg-white border-[#DDDDD8]'
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Server className="w-4 h-4 text-indigo-500" />
            <h2
              className={`text-sm font-semibold ${
                isDark ? 'text-zinc-200' : 'text-zinc-900'
              }`}
            >
              IP addresses
            </h2>
          </div>
          <p
            className={`text-xs leading-relaxed ${
              isDark ? 'text-zinc-400' : 'text-zinc-600'
            }`}
          >
            ASN information, reverse PTR hostnames, geolocation, and network ranges.
          </p>
        </div>

        <div
          className={`p-4 rounded-lg border transition-colors ${
            isDark
              ? 'bg-[#111214]/60 border-[#222428]'
              : 'bg-white border-[#DDDDD8]'
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Lock className="w-4 h-4 text-amber-500" />
            <h2
              className={`text-sm font-semibold ${
                isDark ? 'text-zinc-200' : 'text-zinc-900'
              }`}
            >
              Certificates & web
            </h2>
          </div>
          <p
            className={`text-xs leading-relaxed ${
              isDark ? 'text-zinc-400' : 'text-zinc-600'
            }`}
          >
            Certificate transparency logs, discovered subdomains, and web technology headers.
          </p>
        </div>
      </div>
    </div>
  );
};
