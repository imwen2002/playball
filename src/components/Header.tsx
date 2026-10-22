import React from 'react';
import { UserAccount } from '../types';
import { Award, FileSpreadsheet, Sparkles, HelpCircle, User, Lock, Cloud, Check } from 'lucide-react';

interface HeaderProps {
  currentTab: 'assessment' | 'admin' | 'chart';
  onSelectTab: (tab: 'assessment' | 'admin' | 'chart') => void;
  user: UserAccount | null;
  onLogout: () => void;
  onOpenDeployGuide: () => void;
  submissionCount: number;
  isAdminAuthenticated?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  user,
  onLogout,
  onOpenDeployGuide,
  submissionCount,
  isAdminAuthenticated = false,
}) => {
  const hasUser = Boolean(user?.name && user.name.trim());

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Zone 1: Brand Zone */}
          <div
            onClick={() => onSelectTab('assessment')}
            className="flex items-center gap-3 shrink-0 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-200">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-slate-900 tracking-tight whitespace-nowrap">
                義鼎杯羽球賽事程度自評與智慧分組
              </span>
              <span className="text-xs text-slate-500 hidden sm:inline">
                台灣羽協 1-18 級 · 雲端資料庫即時同步
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => onSelectTab('assessment')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                currentTab === 'assessment'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>程度自評表</span>
            </button>

            <button
              onClick={() => onSelectTab('chart')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                currentTab === 'chart'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>1~18級對照圖</span>
            </button>

            <button
              onClick={() => onSelectTab('admin')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                currentTab === 'admin'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {!isAdminAuthenticated ? (
                <Lock className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>主辦後台名單與分組</span>
              {submissionCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-emerald-500 text-white rounded-full font-bold">
                  {submissionCount}
                </span>
              )}
            </button>
          </nav>

          {/* Zone 3: Cloud Status & Player Profile */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Realtime Cloud indicator */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Cloud className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-medium">雲端同步</span>
            </div>

            {hasUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="flex items-center gap-2 max-w-[140px] sm:max-w-[180px]">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0">
                    {user?.name ? user.name.charAt(0) : 'U'}
                  </div>
                  <div className="flex flex-col text-left truncate">
                    <span className="text-xs font-semibold text-slate-800 truncate leading-tight">
                      {user?.name}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate" title={user?.email}>
                      {user?.email}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  title="清除本機選手快取"
                  className="text-[10px] text-slate-400 hover:text-slate-600 px-1.5 py-1 hover:bg-slate-100 rounded transition-colors"
                >
                  切換
                </button>
              </div>
            ) : null}

            <button
              onClick={onOpenDeployGuide}
              title="部署說明"
              className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
              <span>部署說明</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
