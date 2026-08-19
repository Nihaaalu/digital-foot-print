import React from 'react';
import { Search, FileDown, Menu, Sun, Moon } from 'lucide-react';
import { TargetAnalysis } from '../types/osint';
import { useTheme } from '../utils/theme';

interface NavbarProps {
  activeTarget?: TargetAnalysis;
  onOpenExportModal?: () => void;
  onNewInvestigation: () => void;
  onLoadDemo: () => void;
  isDemo?: boolean;
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTarget,
  onOpenExportModal,
  onNewInvestigation,
  isDemo,
  onToggleMobileMenu,
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

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
      case 'PHONE':
        return 'Phone';
      default:
        return type;
    }
  };

  return (
    <header
      id="main-navbar"
      className={`h-14 border-b px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shrink-0 transition-colors ${
        isDark
          ? 'bg-[#111214]/90 backdrop-blur border-[#222428]'
          : 'bg-[#FFFFFF]/95 backdrop-blur border-[#DDDDD8]'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Hamburger Button */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className={`md:hidden p-2 rounded-md transition min-w-[40px] min-h-[40px] flex items-center justify-center -ml-2 ${
              isDark
                ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {activeTarget ? (
          <div className="flex items-center gap-2 truncate">
            <span
              className={`text-xs ${
                isDark ? 'text-zinc-400' : 'text-zinc-500'
              } hidden sm:inline`}
            >
              Target:
            </span>
            <span
              className={`text-sm font-semibold truncate ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}
            >
              {activeTarget.normalized}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                isDark
                  ? 'bg-zinc-800 text-zinc-300'
                  : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
              }`}
            >
              {formatTargetType(activeTarget.type)}
            </span>
            {isDemo && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  isDark
                    ? 'bg-amber-950/60 text-amber-300 border border-amber-800/50'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                Sample target
              </span>
            )}
          </div>
        ) : (
          <div
            className={`text-sm font-medium ${
              isDark ? 'text-zinc-400' : 'text-zinc-600'
            }`}
          >
            Footprint OSINT
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-md transition ${
            isDark
              ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
          }`}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle color theme"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {activeTarget && onOpenExportModal && (
          <button
            id="btn-export-dossier-nav"
            onClick={onOpenExportModal}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition flex items-center gap-1.5 ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-[#2E3136]'
                : 'bg-white hover:bg-zinc-50 text-zinc-700 border-[#DDDDD8]'
            }`}
          >
            <FileDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export report</span>
          </button>
        )}

        <button
          onClick={onNewInvestigation}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1.5 shadow-sm ${
            isDark
              ? 'bg-blue-600 hover:bg-blue-500 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>New search</span>
        </button>
      </div>
    </header>
  );
};
