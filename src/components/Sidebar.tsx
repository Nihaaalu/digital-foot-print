import React from 'react';
import {
  Search,
  History,
  KeyRound,
  Settings,
  Sparkles,
  Sun,
  Moon,
  X,
  Compass,
} from 'lucide-react';
import { useTheme } from '../utils/theme';

interface SidebarProps {
  currentView: 'landing' | 'dashboard' | 'history' | 'settings';
  onNavigate: (view: 'landing' | 'dashboard' | 'history' | 'settings') => void;
  onOpenPwnedModal: () => void;
  onLoadDemo: () => void;
  hasActiveInvestigation: boolean;
  historyCount: number;
  onCloseMobileDrawer?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  onOpenPwnedModal,
  onLoadDemo,
  hasActiveInvestigation,
  historyCount,
  onCloseMobileDrawer,
}) => {
  const { theme, toggleTheme } = useTheme();

  const handleNavClick = (view: 'landing' | 'dashboard' | 'history' | 'settings') => {
    onNavigate(view);
    if (onCloseMobileDrawer) onCloseMobileDrawer();
  };

  const handlePwnedClick = () => {
    onOpenPwnedModal();
    if (onCloseMobileDrawer) onCloseMobileDrawer();
  };

  const handleDemoClick = () => {
    onLoadDemo();
    if (onCloseMobileDrawer) onCloseMobileDrawer();
  };

  const isDark = theme === 'dark';

  return (
    <aside
      id="main-sidebar"
      className={`w-full md:w-60 flex flex-col justify-between h-full select-none border-r transition-colors ${
        isDark
          ? 'bg-[#111214] border-[#222428] text-zinc-300'
          : 'bg-[#FFFFFF] border-[#DDDDD8] text-zinc-700'
      }`}
    >
      {/* Brand Header */}
      <div>
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isDark ? 'border-[#222428]' : 'border-[#DDDDD8]'
          }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-bold tracking-tight ${
                  isDark ? 'text-white' : 'text-zinc-900'
                }`}
              >
                FOOTPRINT OSINT
              </span>
            </div>
            <div
              className={`text-xs mt-0.5 ${
                isDark ? 'text-zinc-500' : 'text-zinc-500'
              }`}
            >
              OSINT investigation
            </div>
          </div>

          {/* Close button for mobile drawer */}
          {onCloseMobileDrawer && (
            <button
              onClick={onCloseMobileDrawer}
              className={`md:hidden p-1.5 rounded-md transition ${
                isDark
                  ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Primary Navigation Links */}
        <nav className="p-3 space-y-1">
          <button
            id="nav-new-investigation"
            onClick={() => handleNavClick('landing')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition ${
              currentView === 'landing'
                ? isDark
                  ? 'bg-[#1D4ED8]/20 text-blue-400 font-semibold'
                  : 'bg-blue-50 text-blue-700 font-semibold'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-4 h-4" />
              <span>Search</span>
            </div>
          </button>

          {hasActiveInvestigation && (
            <button
              id="nav-dashboard"
              onClick={() => handleNavClick('dashboard')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition ${
                currentView === 'dashboard'
                  ? isDark
                    ? 'bg-[#1D4ED8]/20 text-blue-400 font-semibold'
                    : 'bg-blue-50 text-blue-700 font-semibold'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Compass className="w-4 h-4" />
                <span>Active search</span>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            </button>
          )}

          <button
            id="nav-history"
            onClick={() => handleNavClick('history')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition ${
              currentView === 'history'
                ? isDark
                  ? 'bg-[#1D4ED8]/20 text-blue-400 font-semibold'
                  : 'bg-blue-50 text-blue-700 font-semibold'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <History className="w-4 h-4" />
              <span>Saved searches</span>
            </div>
            {historyCount > 0 && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  isDark
                    ? 'bg-zinc-800 text-zinc-300'
                    : 'bg-zinc-200 text-zinc-700'
                }`}
              >
                {historyCount}
              </span>
            )}
          </button>

          <div
            className={`text-xs font-semibold px-3 pt-4 pb-1.5 ${
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            }`}
          >
            Tools
          </div>

          <button
            id="nav-pwned-passwords"
            onClick={handlePwnedClick}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition ${
              isDark
                ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-4 h-4" />
              <span>Password breach check</span>
            </div>
          </button>

          <button
            id="nav-load-demo"
            onClick={handleDemoClick}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition ${
              isDark
                ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4" />
              <span>Load sample target</span>
            </div>
          </button>

          <button
            id="nav-settings"
            onClick={() => handleNavClick('settings')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition ${
              currentView === 'settings'
                ? isDark
                  ? 'bg-[#1D4ED8]/20 text-blue-400 font-semibold'
                  : 'bg-blue-50 text-blue-700 font-semibold'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4" />
              <span>API keys & settings</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Footer Note, Theme Switcher & Settings */}
      <div
        className={`p-3 border-t space-y-3 ${
          isDark ? 'border-[#222428]' : 'border-[#DDDDD8]'
        }`}
      >
        <div className="flex items-center justify-between px-2">
          <span
            className={`text-xs ${
              isDark ? 'text-zinc-500' : 'text-zinc-500'
            }`}
          >
            Theme
          </span>
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition ${
              isDark
                ? 'bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200'
            }`}
            title="Toggle theme"
          >
            {isDark ? (
              <>
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5" />
                <span>Light</span>
              </>
            )}
          </button>
        </div>

        <p
          className={`text-[11px] leading-snug px-2 ${
            isDark ? 'text-zinc-500' : 'text-zinc-500'
          }`}
        >
          For authorized research and security testing.
        </p>
      </div>
    </aside>
  );
};
