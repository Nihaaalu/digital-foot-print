import React, { useState, useEffect } from 'react';
import { TargetAnalysis, ManualTargetSelection, TargetType } from '../types/osint';
import { detectTarget } from '../services/api';
import { Search, ChevronDown, Loader2 } from 'lucide-react';
import { useTheme } from '../utils/theme';

interface InvestigationInputProps {
  onStartInvestigation: (target: string, selectedModules: string[], targetType?: ManualTargetSelection) => void;
  isLoading: boolean;
  onLoadDemo: () => void;
}

export const InvestigationInput: React.FC<InvestigationInputProps> = ({
  onStartInvestigation,
  isLoading,
  onLoadDemo,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [inputVal, setInputVal] = useState('');
  const [targetType, setTargetType] = useState<ManualTargetSelection>('AUTO');
  const [targetAnalysis, setTargetAnalysis] = useState<TargetAnalysis | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  // Debounced real-time target detection
  useEffect(() => {
    const clean = inputVal.trim();
    if (!clean) {
      setTargetAnalysis(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsDetecting(true);
      try {
        const analysis = await detectTarget(clean, targetType);
        setTargetAnalysis(analysis);
      } catch {
        // Fallback
      } finally {
        setIsDetecting(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [inputVal, targetType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isLoading) return;
    onStartInvestigation(inputVal.trim(), [], targetType);
  };

  const getEffectiveType = (): TargetType | 'UNKNOWN' => {
    if (targetType !== 'AUTO') {
      if (targetType === 'IP') return 'IPV4';
      return targetType as TargetType;
    }
    return targetAnalysis?.type || 'UNKNOWN';
  };

  const getTypeLabel = (type: TargetType | 'UNKNOWN') => {
    switch (type) {
      case 'USERNAME':
        return 'username';
      case 'EMAIL':
        return 'email';
      case 'DOMAIN':
        return 'domain';
      case 'IPV4':
      case 'IPV6':
        return 'IP address';
      case 'URL':
        return 'URL';
      case 'PHONE':
        return 'phone';
      default:
        return 'unknown';
    }
  };

  const effectiveType = getEffectiveType();

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4" id="investigation-input-panel">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Input Bar */}
        <div className="flex flex-col sm:flex-row items-stretch gap-2">
          {/* Main Target Text Input */}
          <div className="relative flex-1">
            <input
              id="target-input-field"
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Enter a target..."
              disabled={isLoading}
              className={`w-full rounded-lg px-4 py-3 text-sm focus:outline-none transition border ${
                isDark
                  ? 'bg-[#17181A] border-[#2E3136] text-white placeholder-zinc-500 focus:border-blue-500'
                  : 'bg-white border-[#DDDDD8] text-zinc-900 placeholder-zinc-400 focus:border-blue-600'
              }`}
            />
          </div>

          {/* Target Type Selector */}
          <div className="relative min-w-[120px] sm:w-36">
            <select
              id="target-type-selector"
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as ManualTargetSelection)}
              disabled={isLoading}
              className={`w-full appearance-none rounded-lg py-3 pl-3.5 pr-8 text-xs font-medium focus:outline-none transition border cursor-pointer ${
                isDark
                  ? 'bg-[#17181A] border-[#2E3136] text-zinc-200 focus:border-blue-500'
                  : 'bg-white border-[#DDDDD8] text-zinc-700 focus:border-blue-600'
              }`}
            >
              <option value="AUTO">Auto</option>
              <option value="USERNAME">Username</option>
              <option value="EMAIL">Email</option>
              <option value="DOMAIN">Domain</option>
              <option value="IP">IP</option>
              <option value="URL">URL</option>
            </select>
            <ChevronDown
              className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                isDark ? 'text-zinc-500' : 'text-zinc-400'
              }`}
            />
          </div>

          {/* Search Launch Button */}
          <button
            id="btn-launch-investigation"
            type="submit"
            disabled={isLoading || !inputVal.trim()}
            className="px-6 py-3 min-h-[44px] bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/40 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg transition flex items-center justify-center gap-2 shadow-sm shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Search</span>
              </>
            )}
          </button>
        </div>

        {/* Quiet Target Detection */}
        {inputVal.trim() && (
          <div
            className={`flex items-center justify-between text-xs px-1 ${
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            }`}
          >
            <div>
              {targetType === 'AUTO' ? (
                <span>
                  Detected as{' '}
                  <strong className={isDark ? 'text-zinc-200' : 'text-zinc-800'}>
                    {getTypeLabel(effectiveType)}
                  </strong>
                </span>
              ) : (
                <span>
                  Searching as{' '}
                  <strong className={isDark ? 'text-blue-400' : 'text-blue-600'}>
                    {getTypeLabel(effectiveType)}
                  </strong>{' '}
                  (manual)
                </span>
              )}
            </div>

            {targetType !== 'AUTO' && (
              <button
                type="button"
                onClick={() => setTargetType('AUTO')}
                className="hover:underline text-xs"
              >
                Reset to Auto
              </button>
            )}
          </div>
        )}
      </form>

      {/* Subtle sample quick links */}
      <div
        className={`pt-2 flex items-center justify-center gap-2 text-xs ${
          isDark ? 'text-zinc-500' : 'text-zinc-500'
        }`}
      >
        <span>Sample target:</span>
        <button
          type="button"
          onClick={onLoadDemo}
          className="text-blue-500 hover:underline font-medium"
        >
          demo.example.com
        </button>
      </div>
    </div>
  );
};
