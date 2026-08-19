import React from 'react';
import { ExposureScoreResult } from '../types/osint';
import { useTheme } from '../utils/theme';
import { X, Info } from 'lucide-react';

interface ExposureBreakdownModalProps {
  scoreData: ExposureScoreResult;
  onClose: () => void;
}

export const ExposureBreakdownModal: React.FC<ExposureBreakdownModalProps> = ({
  scoreData,
  onClose,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'CRITICAL':
        return (
          <span
            className={`text-xs px-2 py-0.5 rounded font-medium ${
              isDark
                ? 'bg-red-950/70 text-red-300 border border-red-800/60'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            Critical
          </span>
        );
      case 'WARNING':
        return (
          <span
            className={`text-xs px-2 py-0.5 rounded font-medium ${
              isDark
                ? 'bg-amber-950/70 text-amber-300 border border-amber-800/60'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            Warning
          </span>
        );
      case 'POSITIVE':
        return (
          <span
            className={`text-xs px-2 py-0.5 rounded font-medium ${
              isDark
                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            Secured
          </span>
        );
      default:
        return (
          <span
            className={`text-xs px-2 py-0.5 rounded font-medium ${
              isDark
                ? 'bg-zinc-800 text-zinc-300'
                : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
            }`}
          >
            Observed
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-xl border p-5 sm:p-6 space-y-5 transition-colors shadow-2xl ${
          isDark
            ? 'bg-[#111214] border-[#222428] text-zinc-200'
            : 'bg-white border-[#DDDDD8] text-zinc-800'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3
              className={`text-base font-semibold ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}
            >
              Exposure score breakdown
            </h3>
            <p
              className={`text-xs mt-0.5 ${
                isDark ? 'text-zinc-400' : 'text-zinc-500'
              }`}
            >
              Estimated exposure calculated from observed public factors
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 p-1"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score Top Box */}
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            isDark
              ? 'bg-[#17181A] border-[#2E3136]'
              : 'bg-zinc-50 border-[#DDDDD8]'
          }`}
        >
          <div>
            <span
              className={`text-xs ${
                isDark ? 'text-zinc-400' : 'text-zinc-500'
              }`}
            >
              Exposure rating
            </span>
            <div
              className={`text-2xl font-bold mt-0.5 ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}
            >
              {scoreData.score} / 100
            </div>
            <div
              className={`text-xs mt-0.5 ${
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              }`}
            >
              {scoreData.ratingLabel}
            </div>
          </div>

          <div className="text-right">
            <span
              className={`text-xs ${
                isDark ? 'text-zinc-400' : 'text-zinc-500'
              }`}
            >
              Observed factors
            </span>
            <div
              className={`text-lg font-semibold mt-0.5 ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}
            >
              {scoreData.factors.length}
            </div>
          </div>
        </div>

        {/* Factors List */}
        <div className="space-y-3">
          <h4
            className={`text-xs font-semibold ${
              isDark ? 'text-zinc-400' : 'text-zinc-600'
            }`}
          >
            Factor details
          </h4>

          <div
            className={`divide-y text-xs ${
              isDark ? 'divide-[#222428]' : 'divide-[#DDDDD8]'
            }`}
          >
            {scoreData.factors.map((factor, idx) => (
              <div key={idx} className="py-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getImpactBadge(factor.impact)}
                    <span
                      className={`font-medium ${
                        isDark ? 'text-zinc-100' : 'text-zinc-900'
                      }`}
                    >
                      {factor.name}
                    </span>
                  </div>
                  <span
                    className={`font-semibold ${
                      isDark ? 'text-zinc-400' : 'text-zinc-600'
                    }`}
                  >
                    {factor.points > 0 ? `+${factor.points} pts` : 'Secured'}
                  </span>
                </div>

                <p className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
                  {factor.description}
                </p>

                {factor.evidence && (
                  <div
                    className={`p-2 rounded font-mono text-[11px] break-all border ${
                      isDark
                        ? 'bg-[#17181A] border-[#2E3136] text-zinc-300'
                        : 'bg-zinc-50 border-[#DDDDD8] text-zinc-700'
                    }`}
                  >
                    Evidence: {factor.evidence}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Heuristic Disclaimer */}
        <div
          className={`p-3 rounded-lg text-xs flex items-start gap-2 border ${
            isDark
              ? 'bg-[#17181A] border-[#2E3136] text-zinc-400'
              : 'bg-zinc-50 border-[#DDDDD8] text-zinc-600'
          }`}
        >
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {scoreData.disclaimer ||
              'This score is an estimate based on the information found in this search. It is not a standard security rating.'}
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t">
          <button
            onClick={onClose}
            className={`px-4 py-2 text-xs font-medium rounded-md ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
