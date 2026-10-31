import React from 'react';
import { UserAccount } from '../types';
import { Award, FileSpreadsheet, Sparkles, Lock, CalendarDays } from 'lucide-react';

interface HeaderProps {
  currentTab: 'assessment' | 'admin' | 'chart' | 'schedule';
  onSelectTab: (tab: 'assessment' | 'admin' | 'chart' | 'schedule') => void;
  user: UserAccount | null;
  onLogout: () => void;
  onOpenDeployGuide?: () => void;
  submissionCount: number;
  isAdminAuthenticated?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  user,
  onLogout,
  submissionCount,
  isAdminAuthenticated = false,
}) => {
  const hasUser = Boolean(user?.name && user.name.trim());

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
          
          {/* Brand */}
          <div
            onClick={() => onSelectTab('assessment')}
            className="flex items-center gap-2 sm:gap-3 shrink-0 cursor-pointer select-none"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xs">
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight whitespace-nowrap">
                <span className="hidden sm:inline">義鼎杯羽球賽事 · 智慧分組系統</span>
                <span className="sm:hidden">義鼎杯羽球賽</span>
              </span>
              <span className="text-[10px] text-slate-500 hidden sm:inline leading-none mt-0.5">
                台灣羽協 0-18 級 · 3 場地循環賽程
              </span>
            </div>
          </div>

          {/* Desktop/Tablet Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => onSelectTab('assessment')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                currentTab === 'assessment'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold'
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
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>0~18級對照圖</span>
            </button>

            <button
              onClick={() => onSelectTab('schedule')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                currentTab === 'schedule'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
              <span>大會即時賽程</span>
            </button>

            <button
              onClick={() => onSelectTab('admin')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                currentTab === 'admin'
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {!isAdminAuthenticated ? (
                <Lock className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>主辦後台與排程</span>
              {submissionCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-emerald-500 text-white rounded-full font-bold">
                  {submissionCount}
                </span>
              )}
            </button>
          </nav>

          {/* Right Status / Player Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {hasUser ? (
              <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 border-l border-slate-200">
                <div className="flex items-center gap-1.5 max-w-[110px] sm:max-w-[180px]">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0">
                    {user?.name ? user.name.charAt(0) : 'U'}
                  </div>
                  <div className="flex flex-col text-left truncate">
                    <span className="text-xs font-semibold text-slate-800 truncate leading-tight">
                      {user?.name}
                    </span>
                    <span className="text-[10px] text-slate-500 truncate hidden sm:inline" title={user?.email}>
                      {user?.email}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  title="切換選手"
                  className="text-[10px] text-slate-400 hover:text-slate-700 px-1.5 py-1 hover:bg-slate-100 rounded transition-colors"
                >
                  切換
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Mobile Navigation Strip (Under Brand) */}
        <div className="flex md:hidden items-center justify-between gap-1 py-1.5 border-t border-slate-100 overflow-x-auto no-scrollbar">
          <button
            onClick={() => onSelectTab('assessment')}
            className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg text-center whitespace-nowrap transition-colors flex items-center justify-center gap-1 cursor-pointer ${
              currentTab === 'assessment'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>自評表</span>
          </button>

          <button
            onClick={() => onSelectTab('schedule')}
            className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg text-center whitespace-nowrap transition-colors flex items-center justify-center gap-1 cursor-pointer ${
              currentTab === 'schedule'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CalendarDays className="w-3 h-3" />
            <span>賽程表</span>
          </button>

          <button
            onClick={() => onSelectTab('chart')}
            className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg text-center whitespace-nowrap transition-colors flex items-center justify-center gap-1 cursor-pointer ${
              currentTab === 'chart'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Award className="w-3 h-3" />
            <span>0~18級圖</span>
          </button>

          <button
            onClick={() => onSelectTab('admin')}
            className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg text-center whitespace-nowrap transition-colors flex items-center justify-center gap-1 cursor-pointer ${
              currentTab === 'admin'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {!isAdminAuthenticated ? (
              <Lock className="w-3 h-3 text-amber-400" />
            ) : (
              <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
            )}
            <span>後台排程</span>
            {submissionCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[9px] bg-emerald-500 text-white rounded-full font-bold">
                {submissionCount}
              </span>
            )}
          </button>
        </div>

      </div>
    </header>
  );
};
