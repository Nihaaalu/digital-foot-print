import React from 'react';
import { InvestigationResult } from '../types/osint';
import {
  exportInvestigationJson,
  exportInvestigationCsv,
  printInvestigationReport,
} from '../utils/exportUtils';
import { useTheme } from '../utils/theme';
import { Table, Printer, X, FileCode, FileDown } from 'lucide-react';

interface ReportExportModalProps {
  result: InvestigationResult;
  onClose: () => void;
}

export const ReportExportModal: React.FC<ReportExportModalProps> = ({
  result,
  onClose,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-lg rounded-xl border p-5 sm:p-6 space-y-4 shadow-2xl transition-colors ${
          isDark
            ? 'bg-[#111214] border-[#222428] text-zinc-200'
            : 'bg-white border-[#DDDDD8] text-zinc-800'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <FileDown className="w-4 h-4 text-blue-500" />
            <h3
              className={`text-base font-semibold ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}
            >
              Export report
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 p-1"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target summary */}
        <div
          className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
            isDark
              ? 'bg-[#17181A] border-[#2E3136]'
              : 'bg-zinc-50 border-[#DDDDD8]'
          }`}
        >
          <div className="flex justify-between">
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
              Target:
            </span>
            <span
              className={`font-semibold ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}
            >
              {result.target.normalized}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
              Type:
            </span>
            <span>{result.target.type.toLowerCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
              Discovered findings:
            </span>
            <span>{result.graph.nodes.length} nodes</span>
          </div>
        </div>

        {/* Export format buttons */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <button
            onClick={() => exportInvestigationJson(result)}
            className={`p-4 rounded-xl border text-center transition flex flex-col items-center justify-center gap-2 ${
              isDark
                ? 'bg-[#17181A] hover:bg-zinc-800 border-[#2E3136]'
                : 'bg-zinc-50 hover:bg-zinc-100 border-[#DDDDD8]'
            }`}
          >
            <FileCode className="w-5 h-5 text-blue-500" />
            <div
              className={`text-xs font-semibold ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}
            >
              JSON
            </div>
            <span
              className={`text-[10px] ${
                isDark ? 'text-zinc-400' : 'text-zinc-500'
              }`}
            >
              Raw data
            </span>
          </button>

          <button
            onClick={() => exportInvestigationCsv(result)}
            className={`p-4 rounded-xl border text-center transition flex flex-col items-center justify-center gap-2 ${
              isDark
                ? 'bg-[#17181A] hover:bg-zinc-800 border-[#2E3136]'
                : 'bg-zinc-50 hover:bg-zinc-100 border-[#DDDDD8]'
            }`}
          >
            <Table className="w-5 h-5 text-emerald-500" />
            <div
              className={`text-xs font-semibold ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}
            >
              CSV
            </div>
            <span
              className={`text-[10px] ${
                isDark ? 'text-zinc-400' : 'text-zinc-500'
              }`}
            >
              Spreadsheet
            </span>
          </button>

          <button
            onClick={() => printInvestigationReport()}
            className={`p-4 rounded-xl border text-center transition flex flex-col items-center justify-center gap-2 ${
              isDark
                ? 'bg-[#17181A] hover:bg-zinc-800 border-[#2E3136]'
                : 'bg-zinc-50 hover:bg-zinc-100 border-[#DDDDD8]'
            }`}
          >
            <Printer className="w-5 h-5 text-purple-500" />
            <div
              className={`text-xs font-semibold ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}
            >
              Print / PDF
            </div>
            <span
              className={`text-[10px] ${
                isDark ? 'text-zinc-400' : 'text-zinc-500'
              }`}
            >
              Print view
            </span>
          </button>
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
