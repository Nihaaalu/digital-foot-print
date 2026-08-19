import React, { useState } from 'react';
import { checkPwnedPasswordApi } from '../services/api';
import { useTheme } from '../utils/theme';
import {
  Lock,
  CheckCircle2,
  AlertTriangle,
  X,
  Eye,
  EyeOff,
  Loader2,
  KeyRound,
} from 'lucide-react';

interface PwnedPasswordModalProps {
  onClose: () => void;
}

export const PwnedPasswordModal: React.FC<PwnedPasswordModalProps> = ({
  onClose,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await checkPwnedPasswordApi(password);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Check failed');
    } finally {
      setLoading(false);
    }
  };

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
            <KeyRound className="w-4 h-4 text-blue-500" />
            <h3
              className={`text-base font-semibold ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}
            >
              Breach password check
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

        {/* Info */}
        <p
          className={`text-xs leading-relaxed ${
            isDark ? 'text-zinc-400' : 'text-zinc-600'
          }`}
        >
          Check if a password appears in known public breach compilations. Your raw
          password is never sent over the network; only a partial 5-character hash
          prefix is queried using k-anonymity.
        </p>

        {/* Input Form */}
        <form onSubmit={handleCheck} className="space-y-3">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password to check..."
              className={`w-full rounded-md px-3.5 py-2 text-xs focus:outline-none transition border pr-10 ${
                isDark
                  ? 'bg-[#17181A] border-[#2E3136] text-white placeholder-zinc-500 focus:border-blue-500'
                  : 'bg-white border-[#DDDDD8] text-zinc-900 placeholder-zinc-400 focus:border-blue-600'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600"
            >
              {showPassword ? (
                <EyeOff className="w-3.5 h-3.5" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium rounded-md transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Checking breach database...</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Check password</span>
              </>
            )}
          </button>
        </form>

        {error && (
          <div
            className={`p-3 rounded-md text-xs ${
              isDark
                ? 'bg-red-950/40 text-red-300 border border-red-800/60'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            Error: {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div
            className={`p-4 rounded-lg border space-y-2 text-xs ${
              isDark
                ? 'bg-[#17181A] border-[#2E3136]'
                : 'bg-zinc-50 border-[#DDDDD8]'
            }`}
          >
            {result.isPwned ? (
              <div className="flex items-start gap-2 text-red-500">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-sm">
                    Exposed ({result.pwnedCount.toLocaleString()} times)
                  </div>
                  <p
                    className={`mt-0.5 leading-relaxed ${
                      isDark ? 'text-zinc-400' : 'text-zinc-600'
                    }`}
                  >
                    This password appears in public breach records and should not
                    be used for important accounts.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-emerald-500">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-sm">
                    No breach occurrences found
                  </div>
                  <p
                    className={`mt-0.5 leading-relaxed ${
                      isDark ? 'text-zinc-400' : 'text-zinc-600'
                    }`}
                  >
                    This exact string was not found in the indexed public breach
                    data.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t">
          <button
            onClick={onClose}
            className={`px-4 py-1.5 text-xs font-medium rounded-md ${
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
