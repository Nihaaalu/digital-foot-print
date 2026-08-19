import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { LandingView } from './components/LandingView';
import { DashboardView } from './components/DashboardView';
import { InvestigationHistoryView } from './components/InvestigationHistoryView';
import { SettingsView } from './components/SettingsView';
import { ExposureBreakdownModal } from './components/ExposureBreakdownModal';
import { PwnedPasswordModal } from './components/PwnedPasswordModal';
import { ReportExportModal } from './components/ReportExportModal';
import { InvestigationResult, InvestigationHistoryItem, ManualTargetSelection } from './types/osint';
import { launchInvestigation } from './services/api';
import { DEMO_INVESTIGATION_DOMAIN } from './data/demoData';
import { AlertCircle, X } from 'lucide-react';
import { useTheme } from './utils/theme';

const STORAGE_KEY = 'dfi_investigation_history_v1';

export function App() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [currentView, setCurrentView] = useState<'landing' | 'dashboard' | 'history' | 'settings'>('landing');
  const [activeInvestigation, setActiveInvestigation] = useState<InvestigationResult | null>(null);
  const [history, setHistory] = useState<InvestigationHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Modals
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showPwnedModal, setShowPwnedModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load history from localStorage', e);
    }
  }, []);

  // Save history to localStorage
  const saveToHistory = (result: InvestigationResult) => {
    const newItem: InvestigationHistoryItem = {
      id: result.id,
      target: result.target.normalized,
      targetType: result.target.type,
      date: result.completedAt,
      exposureScore: result.exposureScore.score,
      nodesCount: result.graph.nodes.length,
      result,
    };

    setHistory((prev) => {
      const filtered = prev.filter((item) => item.target !== result.target.normalized);
      const next = [newItem, ...filtered].slice(0, 50); // Keep last 50
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save to localStorage', e);
      }
      return next;
    });
  };

  const handleStartInvestigation = async (
    target: string,
    modules?: string[],
    targetType?: ManualTargetSelection
  ) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await launchInvestigation(target, modules, targetType);
      setActiveInvestigation(result);
      saveToHistory(result);
      setCurrentView('dashboard');
    } catch (err: any) {
      setErrorMessage(err.message || 'Search could not be completed. Please check your target and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDemo = () => {
    setActiveInvestigation(DEMO_INVESTIGATION_DOMAIN);
    setCurrentView('dashboard');
    setMobileDrawerOpen(false);
  };

  const handleSelectInvestigation = (result: InvestigationResult) => {
    setActiveInvestigation(result);
    setCurrentView('dashboard');
    setMobileDrawerOpen(false);
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => {
      const next = prev.filter((item) => item.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <div
      className={`min-h-screen flex flex-row font-sans relative overflow-x-hidden selection:bg-blue-500/30 ${
        isDark ? 'bg-[#0B0B0C] text-zinc-100' : 'bg-[#F5F5F3] text-zinc-900'
      }`}
    >
      {/* Mobile Drawer Overlay Backdrop */}
      {mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Desktop Persistent Sidebar & Mobile Slide-over Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 sm:w-80 max-w-[85vw] transform transition-transform duration-200 ease-in-out md:static md:w-64 md:translate-x-0 ${
          mobileDrawerOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <Sidebar
          currentView={currentView}
          onNavigate={(view) => {
            setCurrentView(view);
            setMobileDrawerOpen(false);
          }}
          onOpenPwnedModal={() => {
            setShowPwnedModal(true);
            setMobileDrawerOpen(false);
          }}
          onLoadDemo={handleLoadDemo}
          hasActiveInvestigation={!!activeInvestigation}
          historyCount={history.length}
          onCloseMobileDrawer={() => setMobileDrawerOpen(false)}
        />
      </div>

      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <Navbar
          activeTarget={activeInvestigation?.target}
          isDemo={activeInvestigation?.isDemo}
          onOpenExportModal={() => setShowExportModal(true)}
          onNewInvestigation={() => {
            setCurrentView('landing');
            setMobileDrawerOpen(false);
          }}
          onLoadDemo={handleLoadDemo}
          onToggleMobileMenu={() => setMobileDrawerOpen((prev) => !prev)}
        />

        {/* Global Error Banner */}
        {errorMessage && (
          <div
            className={`border-b px-4 sm:px-6 py-3 flex items-center justify-between text-xs font-medium ${
              isDark
                ? 'bg-red-950/80 border-red-900/60 text-red-200'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-500 hover:opacity-75 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* View Routing */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentView === 'landing' && (
            <LandingView
              onStartInvestigation={handleStartInvestigation}
              isLoading={loading}
              onLoadDemo={handleLoadDemo}
            />
          )}

          {currentView === 'dashboard' && activeInvestigation && (
            <DashboardView
              result={activeInvestigation}
              onOpenScoreBreakdown={() => setShowScoreModal(true)}
              onOpenExportModal={() => setShowExportModal(true)}
              onRescanUsername={(target) => handleStartInvestigation(target, undefined, 'USERNAME')}
            />
          )}

          {currentView === 'history' && (
            <InvestigationHistoryView
              history={history}
              onSelectInvestigation={handleSelectInvestigation}
              onClearHistory={handleClearHistory}
              onDeleteHistoryItem={handleDeleteHistoryItem}
            />
          )}

          {currentView === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Global Modals */}
      {showScoreModal && activeInvestigation && (
        <ExposureBreakdownModal
          scoreData={activeInvestigation.exposureScore}
          onClose={() => setShowScoreModal(false)}
        />
      )}

      {showPwnedModal && (
        <PwnedPasswordModal onClose={() => setShowPwnedModal(false)} />
      )}

      {showExportModal && activeInvestigation && (
        <ReportExportModal
          result={activeInvestigation}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}
export default App;
