import React from 'react';
import { InvestigationResult } from '../../types/osint';
import { useTheme } from '../../utils/theme';
import { Star, GitFork, ExternalLink, Mail } from 'lucide-react';

interface GitHubTabProps {
  result: InvestigationResult;
}

export const GitHubTab: React.FC<GitHubTabProps> = ({ result }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const gh = result.modules.github;

  if (!gh || gh.status === 'NOT_FOUND' || !gh.profile) {
    return (
      <div
        className={`p-10 text-center rounded-xl border text-xs ${
          isDark
            ? 'bg-[#111214] border-[#222428] text-zinc-500'
            : 'bg-white border-[#DDDDD8] text-zinc-500'
        }`}
      >
        No public GitHub profile found for this target.
      </div>
    );
  }

  return (
    <div className="space-y-6" id="github-tab-content">
      {/* Profile & API Info */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
          isDark
            ? 'bg-[#111214] border-[#222428]'
            : 'bg-white border-[#DDDDD8] shadow-sm'
        }`}
      >
        <div>
          <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
            GitHub profile
          </span>
          <div
            className={`font-semibold text-sm mt-0.5 ${
              isDark ? 'text-white' : 'text-zinc-900'
            }`}
          >
            @{gh.profile.login}
          </div>
        </div>

        <div
          className={`flex items-center gap-3 ${
            isDark ? 'text-zinc-400' : 'text-zinc-500'
          }`}
        >
          <span>
            API requests remaining: {gh.rateLimit.remaining}/{gh.rateLimit.limit}
          </span>
        </div>
      </div>

      {/* Public Repositories */}
      <div
        className={`p-5 sm:p-6 rounded-xl border transition-colors space-y-4 ${
          isDark
            ? 'bg-[#111214] border-[#222428]'
            : 'bg-white border-[#DDDDD8] shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between border-b pb-3">
          <h3
            className={`text-sm font-semibold ${
              isDark ? 'text-white' : 'text-zinc-900'
            }`}
          >
            Public repositories ({gh.repositories.length})
          </h3>
          <span
            className={`text-xs ${
              isDark ? 'text-zinc-400' : 'text-zinc-500'
            }`}
          >
            Total: {gh.profile.publicRepos}
          </span>
        </div>

        {gh.repositories.length === 0 ? (
          <div
            className={`text-center py-6 text-xs ${
              isDark ? 'text-zinc-500' : 'text-zinc-500'
            }`}
          >
            No public repositories found.
          </div>
        ) : (
          <div
            className={`divide-y text-xs ${
              isDark ? 'divide-[#222428]' : 'divide-[#DDDDD8]'
            }`}
          >
            {gh.repositories.map((repo: any, i: number) => (
              <div
                key={i}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <a
                      href={repo.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-blue-500 hover:underline flex items-center gap-1 truncate text-sm"
                    >
                      <span>{repo.name}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                    {repo.isFork && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          isDark
                            ? 'bg-zinc-800 text-zinc-400'
                            : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        Fork
                      </span>
                    )}
                  </div>
                  {repo.description && (
                    <p
                      className={`line-clamp-2 ${
                        isDark ? 'text-zinc-300' : 'text-zinc-700'
                      }`}
                    >
                      {repo.description}
                    </p>
                  )}
                </div>

                <div
                  className={`flex items-center gap-4 shrink-0 text-xs ${
                    isDark ? 'text-zinc-400' : 'text-zinc-500'
                  }`}
                >
                  <span className="font-medium">
                    {repo.language || 'Plain text'}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-500" /> {repo.stars}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="w-3.5 h-3.5 text-zinc-400" /> {repo.forks}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Associated Commit Emails */}
      {gh.publicEventsSummary?.associatedEmails &&
        gh.publicEventsSummary.associatedEmails.length > 0 && (
          <div
            className={`p-5 sm:p-6 rounded-xl border transition-colors space-y-3 ${
              isDark
                ? 'bg-[#111214] border-[#222428]'
                : 'bg-white border-[#DDDDD8] shadow-sm'
            }`}
          >
            <h4
              className={`text-sm font-semibold flex items-center gap-2 ${
                isDark ? 'text-white' : 'text-zinc-900'
              }`}
            >
              <Mail className="w-4 h-4 text-amber-500" />
              <span>
                Public emails from commit logs (
                {gh.publicEventsSummary.associatedEmails.length})
              </span>
            </h4>
            <p
              className={`text-xs ${
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              }`}
            >
              Extracted from public Git commit push events published by this account.
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              {gh.publicEventsSummary.associatedEmails.map((email: string, i: number) => (
                <span
                  key={i}
                  className={`px-3 py-1 font-mono text-xs rounded border ${
                    isDark
                      ? 'bg-[#17181A] border-[#2E3136] text-amber-300'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  {email}
                </span>
              ))}
            </div>
          </div>
        )}
    </div>
  );
};
