import React, { useState, useMemo, useEffect } from 'react';
import {
  PlayerSubmission,
  TournamentScheduleResult,
  CourtMatch,
  ScheduleRound,
} from '../types';
import { BADMINTON_TIERS, getTierByLevel } from '../data/badmintonTiers';
import { SAMPLE_PLAYERS } from '../data/samplePlayers';
import { exportPlayersToCSV } from '../utils/groupingAlgorithms';
import {
  generateFourMatchCourtSchedule,
  validateFivePlayerRule,
  FivePlayerValidationResult,
} from '../utils/courtScheduler';
import {
  Users,
  Search,
  Download,
  Plus,
  Trash2,
  Printer,
  Copy,
  Check,
  Award,
  Sparkles,
  Shield,
  Sliders,
  Layers,
  ArrowUpDown,
  Lock,
  CalendarDays,
  LayoutGrid,
  List,
  CheckCircle2,
  RefreshCw,
  Clock,
  Swords,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';

interface AdminDashboardProps {
  players: PlayerSubmission[];
  onUpdatePlayers: (players: PlayerSubmission[]) => void;
  onViewOfficialChart: () => void;
  onLockAdmin?: () => void;
  onDeletePlayer?: (playerId: string) => Promise<void>;
  onSavePlayer?: (player: PlayerSubmission) => Promise<void>;
  onBatchAddPlayers?: (players: PlayerSubmission[]) => Promise<void>;
  onBatchDeleteSamplePlayers?: (samples: PlayerSubmission[]) => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  players,
  onUpdatePlayers,
  onViewOfficialChart,
  onLockAdmin,
  onDeletePlayer,
  onSavePlayer,
  onBatchAddPlayers,
  onBatchDeleteSamplePlayers,
}) => {
  // Navigation inside Admin: 'schedule' (3-Court) | 'roster' | 'print'
  const [activeAdminTab, setActiveAdminTab] = useState<'schedule' | 'roster' | 'print'>('schedule');

  // Mobile layout view toggle in Roster ('cards' | 'table')
  const [rosterViewMode, setRosterViewMode] = useState<'cards' | 'table'>('cards');

  // 3-Court Schedule state (strictly requires 5-player multiple)
  const [courtSchedule, setCourtSchedule] = useState<TournamentScheduleResult | null>(() => {
    const val = validateFivePlayerRule(players);
    if (val.isValid) {
      return generateFourMatchCourtSchedule(players);
    }
    return null;
  });

  // 5-player round robin validation error modal
  const [isFivePlayerModalOpen, setIsFivePlayerModalOpen] = useState(false);
  const [fivePlayerValidationError, setFivePlayerValidationError] = useState<FivePlayerValidationResult | null>(null);

  // 5-player rule helper
  const fivePlayerStatus = useMemo(() => {
    return validateFivePlayerRule(players);
  }, [players]);

  // Selected court filter in schedule: 0 = all, 1, 2, 3
  const [selectedCourtFilter, setSelectedCourtFilter] = useState<number>(0);
  const [scheduleViewMode, setScheduleViewMode] = useState<'byRound' | 'byPlayer'>('byRound');
  const [expandedPlayerStats, setExpandedPlayerStats] = useState<string | null>(null);

  // Match scores tracking (matchId -> { scoreA, scoreB, completed })
  const [matchScores, setMatchScores] = useState<Record<string, { scoreA?: number; scoreB?: number; completed?: boolean }>>({});

  // Roster search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'level' | 'name' | 'time'>('level');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); // default lowest to highest for tier adjustment

  // Manual player modal state
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerEmail, setNewPlayerEmail] = useState('');
  const [newPlayerLevel, setNewPlayerLevel] = useState(0); // Default Level 0
  const [newPlayerGender, setNewPlayerGender] = useState<'male' | 'female'>('male');

  // Copy notice
  const [hasCopiedText, setHasCopiedText] = useState(false);

  // Detect which of the 16 sample players are present
  const samplePlayersInRoster = useMemo(() => {
    const sampleEmails = new Set(SAMPLE_PLAYERS.map((p) => p.email.toLowerCase()));
    return players.filter(
      (p) => sampleEmails.has(p.email.toLowerCase()) || p.id.startsWith('sample-')
    );
  }, [players]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = players.length;
    if (total === 0) {
      return { total: 0, avgLevel: 0, maleCount: 0, femaleCount: 0, tierCounts: {} };
    }
    const sumLevel = players.reduce((acc, p) => acc + p.level, 0);
    const avgLevel = Number((sumLevel / total).toFixed(1));
    const maleCount = players.filter((p) => p.gender === 'male').length;
    const femaleCount = players.filter((p) => p.gender === 'female').length;

    const tierCounts: Record<string, number> = {};
    BADMINTON_TIERS.forEach((t) => {
      tierCounts[t.name] = players.filter((p) => t.levels.includes(p.level)).length;
    });

    return { total, avgLevel, maleCount, femaleCount, tierCounts };
  }, [players]);

  // Filtered & sorted player roster
  const filteredPlayers = useMemo(() => {
    return players
      .filter((p) => {
        const matchesSearch =
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTier = tierFilter === 'all' || p.tierName === tierFilter;
        const matchesGender = genderFilter === 'all' || p.gender === genderFilter;
        return matchesSearch && matchesTier && matchesGender;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'level') diff = a.level - b.level;
        else if (sortField === 'name') diff = a.name.localeCompare(b.name, 'zh-Hant');
        else if (sortField === 'time') diff = a.submittedAt.localeCompare(b.submittedAt);
        return sortOrder === 'desc' ? -diff : diff;
      });
  }, [players, searchQuery, tierFilter, genderFilter, sortField, sortOrder]);

  // Execute 3-court schedule generation (Strict 5-player rule: 4 matches, zero duplicate partners)
  const handleGenerateCourtSchedule = () => {
    const validation = validateFivePlayerRule(players);
    if (!validation.isValid) {
      setFivePlayerValidationError(validation);
      setIsFivePlayerModalOpen(true);
      return;
    }
    const result = generateFourMatchCourtSchedule(players);
    setCourtSchedule(result);
    setActiveAdminTab('schedule');
  };

  // Preload demo players (15 players = 3 groups of 5)
  const handlePreloadSampleData = async () => {
    if (players.length > 0) {
      if (!confirm('載入示範名單將會寫入 15 位測試球員資料（剛好 3 組，每組 5 人循環制）至雲端資料庫。確定要載入嗎？')) {
        return;
      }
    }
    const existingEmails = new Set(players.map((p) => p.email.toLowerCase()));
    const toAdd = SAMPLE_PLAYERS.filter((p) => !existingEmails.has(p.email.toLowerCase()));
    if (toAdd.length === 0) {
      alert('15 位示範名單已全數在列表中！');
      return;
    }
    if (onBatchAddPlayers) {
      await onBatchAddPlayers(toAdd);
    } else {
      const merged = [...players, ...toAdd];
      onUpdatePlayers(merged);
    }
  };

  // Quick delete the demo players
  const handleDeleteSampleData = async () => {
    const count = samplePlayersInRoster.length;
    const msg =
      count > 0
        ? `確定要一鍵刪除名單內的 ${count} 位預設示範選手嗎？\n此動作將同步從雲端資料庫中移除。`
        : `確定要一鍵清除所有預設的 15 位示範名單嗎？\n此動作將確保雲端資料庫中的示範選手資料被徹底移除。`;

    if (!confirm(msg)) {
      return;
    }

    if (onBatchDeleteSamplePlayers) {
      await onBatchDeleteSamplePlayers(SAMPLE_PLAYERS);
    } else {
      const sampleEmails = new Set(SAMPLE_PLAYERS.map((p) => p.email.toLowerCase()));
      const remaining = players.filter(
        (p) => !sampleEmails.has(p.email.toLowerCase()) && !p.id.startsWith('sample-')
      );
      onUpdatePlayers(remaining);
    }
  };

  // Quick level adjust (+1 or -1) by organizer (Supports Level 0 to 18)
  const handleQuickLevelChange = async (playerId: string, delta: number) => {
    const target = players.find((p) => p.id === playerId);
    if (!target) return;
    const newLvl = Math.max(0, Math.min(18, target.level + delta));
    const tier = getTierByLevel(newLvl);
    const updatedPlayer = {
      ...target,
      level: newLvl,
      tierName: tier.name,
      updatedAt: new Date().toISOString(),
    };
    if (onSavePlayer) {
      await onSavePlayer(updatedPlayer);
    } else {
      onUpdatePlayers(players.map((p) => (p.id === playerId ? updatedPlayer : p)));
    }
  };

  // Delete a single player
  const handleDeletePlayer = async (playerId: string) => {
    if (confirm('確定要移除此選手的報名資料嗎？移除後將同步從雲端資料庫刪除。')) {
      if (onDeletePlayer) {
        await onDeletePlayer(playerId);
      } else {
        onUpdatePlayers(players.filter((p) => p.id !== playerId));
      }
    }
  };

  // Add manual player (Supports Level 0)
  const handleAddManualPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    const tier = getTierByLevel(newPlayerLevel);
    const cleanEmail = newPlayerEmail.trim().toLowerCase() || `player_${Date.now()}@badminton.local`;
    const docId = cleanEmail.replace(/[^a-zA-Z0-9_-]/g, '_');
    const newPlayer: PlayerSubmission = {
      id: docId,
      name: newPlayerName.trim(),
      email: cleanEmail,
      gender: newPlayerGender,
      dominantHand: 'right',
      level: newPlayerLevel,
      tierName: tier.name,
      assessmentMode: 'direct',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (onSavePlayer) {
      await onSavePlayer(newPlayer);
    } else {
      onUpdatePlayers([...players, newPlayer]);
    }
    setIsAddPlayerOpen(false);
    setNewPlayerName('');
    setNewPlayerEmail('');
    setNewPlayerLevel(0);
  };

  // Update match score in schedule
  const handleUpdateMatchScore = (matchId: string, team: 'A' | 'B', score: number) => {
    setMatchScores((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [team === 'A' ? 'scoreA' : 'scoreB']: score,
      },
    }));
  };

  const handleToggleMatchComplete = (matchId: string) => {
    setMatchScores((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        completed: !prev[matchId]?.completed,
      },
    }));
  };

  // Copy schedule text to clipboard
  const handleCopySchedule = () => {
    if (!courtSchedule || courtSchedule.rounds.length === 0) return;
    let text = `🏸 【義鼎杯羽球賽 · 3 場地循環賽程表】\n賽制：同級循環每人打滿 4 場 · 嚴格防撞場\n`;
    text += `總選手數：${players.length} 人 · 總輪次：${courtSchedule.rounds.length} 輪\n\n`;

    courtSchedule.rounds.forEach((round) => {
      text += `━━━━━━━━━━━━━━━\n📍 第 ${round.roundNumber} 輪\n━━━━━━━━━━━━━━━\n`;
      round.matches.forEach((m) => {
        text += `  場地 ${m.courtNumber} [${m.tierGroupLabel}]: ${m.teamA[0].name} & ${m.teamA[1].name} vs ${m.teamB[0].name} & ${m.teamB[1].name}\n`;
      });
      if (round.restingPlayers.length > 0) {
        text += `  💤 本輪輪休：${round.restingPlayers.map((p) => p.name).join('、')}\n`;
      }
      text += '\n';
    });

    navigator.clipboard.writeText(text);
    setHasCopiedText(true);
    setTimeout(() => setHasCopiedText(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* Top Banner & Control Deck */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4 sm:space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-[11px] font-bold">
                賽事主辦人後台
              </span>
              <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-medium">
                3 場地循環 · 每組 5 人 · 每人 4 場 0 重複搭檔
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
              羽球錦標賽名單與賽程中控台
            </h1>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleGenerateCourtSchedule}
              className="px-3 sm:px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>一鍵排定 3 場地賽程</span>
            </button>

            <button
              type="button"
              onClick={handlePreloadSampleData}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>載入 15 位示範名單 (3組5人)</span>
            </button>

            {samplePlayersInRoster.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteSampleData}
                title="一鍵清除所有預設的測試示範選手名單"
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 transition-all flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>一鍵刪除示範名單 ({samplePlayersInRoster.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsAddPlayerOpen(true)}
              className="px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>手動新增</span>
            </button>

            <button
              type="button"
              onClick={() => exportPlayersToCSV(players)}
              disabled={players.length === 0}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">匯出 CSV</span>
            </button>

            {onLockAdmin && (
              <button
                type="button"
                onClick={onLockAdmin}
                title="重新鎖定後台"
                className="px-2.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">鎖定</span>
              </button>
            )}
          </div>
        </div>

        {/* 5-Player Tournament Rule Live Status Bar */}
        <div
          className={`p-3 sm:p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-all ${
            fivePlayerStatus.isValid
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              : 'bg-amber-50/90 border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex items-start sm:items-center gap-2">
            {fivePlayerStatus.isValid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm">
                  {fivePlayerStatus.isValid
                    ? `人數符合同階級 5 人循環制：共 ${players.length} 人（已組成 ${fivePlayerStatus.groupCount} 組，各階級每組 5 位，絕不跨階）`
                    : `階級人數未符 5 人循環制：目前 ${players.length} 人（同階級配對人員一定要五位，不可跨階湊人）`}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    fivePlayerStatus.isValid
                      ? 'bg-emerald-200/70 text-emerald-800'
                      : 'bg-amber-200/80 text-amber-900'
                  }`}
                >
                  {fivePlayerStatus.isValid ? '✓ 可排定賽程' : `尚差 ${fivePlayerStatus.missingCount} 人成組`}
                </span>
              </div>
              <p className="text-[11px] opacity-85 mt-0.5">
                {fivePlayerStatus.isValid
                  ? '四大賽事保證：① 每人打滿 4 場 ② 隊友 0 重複配對 ③ 3 場地零撞場 ④ 每位選手排程至少隔一場輪休'
                  : '同階級配對人員一定要五位，沒五位就無法成組，且不能跨階配對。請點擊「一鍵排定 3 場地賽程」檢視詳細階級人數缺額。'}
              </p>
            </div>
          </div>

          {!fivePlayerStatus.isValid && (
            <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto pt-1 sm:pt-0">
              <button
                type="button"
                onClick={() => setIsAddPlayerOpen(true)}
                className="px-2.5 py-1 text-xs font-bold bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors cursor-pointer"
              >
                手動補選手
              </button>
              <button
                type="button"
                onClick={handlePreloadSampleData}
                className="px-2.5 py-1 text-xs font-bold bg-white border border-amber-300 text-amber-900 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
              >
                載入 15 人示範名單
              </button>
            </div>
          )}
        </div>

        {/* Real-time Tournament Analytics KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium">總報名人數</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 tabular-nums">
              {stats.total} <span className="text-xs font-normal text-slate-500">人</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block truncate">
              男 {stats.maleCount} 人 · 女 {stats.femaleCount} 人
            </span>
          </div>

          <div className="p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium">平均戰力分級</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5 tabular-nums">
              Lv {stats.avgLevel || 0}
            </div>
            <span className="text-[10px] text-emerald-600 mt-0.5 block truncate">
              {getTierByLevel(Math.round(stats.avgLevel)).name}
            </span>
          </div>

          <div className="p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium">排定循環總場次</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 tabular-nums">
              {courtSchedule ? courtSchedule.totalMatchesScheduled : Math.round((stats.total * 4) / 4)}{' '}
              <span className="text-xs font-normal text-slate-500">場</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block truncate">
              每人固定打滿 4 場輪迴賽
            </span>
          </div>

          <div className="p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium">場地調度</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 tabular-nums">
              3 <span className="text-xs font-normal text-slate-500">個場地開打</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block truncate">
              共 {courtSchedule ? courtSchedule.rounds.length : 0} 輪次 · 嚴格防撞場
            </span>
          </div>
        </div>

        {/* Tier Distribution Mini Bar */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-[11px] text-slate-600">
            <span className="font-semibold">選手分級分佈 (0~18級)：</span>
            <button
              onClick={onViewOfficialChart}
              className="text-emerald-700 hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <Award className="w-3 h-3" />
              對照制度說明
            </button>
          </div>
          <div className="flex items-center h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
            {BADMINTON_TIERS.map((tier) => {
              const count = stats.tierCounts[tier.name] || 0;
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={tier.tierId}
                  style={{ width: `${pct}%` }}
                  title={`${tier.name}: ${count}人 (${pct.toFixed(0)}%)`}
                  className={`h-full transition-all ${tier.colorClass.badge}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Admin Functional Navigation Tabs */}
      <div className="flex items-center gap-1 sm:gap-2 border-b border-slate-200 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setActiveAdminTab('schedule')}
          className={`py-2 px-3 sm:px-4 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            activeAdminTab === 'schedule'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>3 場地循環排程表</span>
          {courtSchedule && (
            <span className="px-1.5 py-0.2 text-[10px] bg-white text-emerald-800 rounded-full font-black">
              {courtSchedule.rounds.length}輪
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveAdminTab('roster')}
          className={`py-2 px-3 sm:px-4 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            activeAdminTab === 'roster'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>選手名單與等級微調</span>
          <span className="px-1.5 py-0.2 text-[10px] bg-slate-700 text-slate-100 rounded-full font-black">
            {players.length}
          </span>
        </button>

        <button
          onClick={() => setActiveAdminTab('print')}
          className={`py-2 px-3 sm:px-4 text-xs sm:text-sm font-medium rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            activeAdminTab === 'print'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>列印公布排版</span>
        </button>
      </div>

      {/* Tab 1: 3-Court Schedule Engine */}
      {activeAdminTab === 'schedule' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Header Controls for Schedule */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>3 個場地 · 同等級 5 人循環賽程</span>
                <span className="text-xs font-normal text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md font-semibold">
                  每組 5 人 · 每人 4 場 · 隊友 0 重複搭檔
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                依據 5 人雙打完全輪迴定理（C(5,2)=10 種配對），每人固定出賽 4 場（輪休 1 場），與同組其他 4 人各搭檔 1 次，實現 0 重複配對。
              </p>
              {courtSchedule && courtSchedule.tierDivisions && courtSchedule.tierDivisions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-600">循環組別：</span>
                  {courtSchedule.tierDivisions.map((div, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-medium"
                    >
                      {div.tierLabel}（{div.players.map((p) => p.name).join('、')}）
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleGenerateCourtSchedule}
                className="px-3.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>重新一鍵排定</span>
              </button>

              <button
                type="button"
                onClick={handleCopySchedule}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              >
                {hasCopiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{hasCopiedText ? '已複製賽程！' : '複製對戰文字表'}</span>
              </button>

              {/* View Switcher: byRound vs byPlayer */}
              <div className="bg-slate-100 p-0.5 rounded-xl flex items-center text-xs">
                <button
                  type="button"
                  onClick={() => setScheduleViewMode('byRound')}
                  className={`px-3 py-1 font-bold rounded-lg transition-all cursor-pointer ${
                    scheduleViewMode === 'byRound'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  輪次場地表
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleViewMode('byPlayer')}
                  className={`px-3 py-1 font-bold rounded-lg transition-all cursor-pointer ${
                    scheduleViewMode === 'byPlayer'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  選手出賽檢核
                </button>
              </div>
            </div>
          </div>

          {/* Court Filter Tabs */}
          {scheduleViewMode === 'byRound' && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 0, label: '全部場地 (1~3)' },
                { id: 1, label: '🏸 場地 1' },
                { id: 2, label: '🏸 場地 2' },
                { id: 3, label: '🏸 場地 3' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCourtFilter(c.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all whitespace-nowrap cursor-pointer ${
                    selectedCourtFilter === c.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {/* Content: byRound View */}
          {scheduleViewMode === 'byRound' && courtSchedule && (
            <div className="space-y-4 sm:space-y-6">
              {courtSchedule.rounds.map((round) => {
                const matchesToShow =
                  selectedCourtFilter === 0
                    ? round.matches
                    : round.matches.filter((m) => m.courtNumber === selectedCourtFilter);

                if (matchesToShow.length === 0 && selectedCourtFilter !== 0) {
                  return null;
                }

                return (
                  <div
                    key={round.roundNumber}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
                  >
                    {/* Round Header */}
                    <div className="bg-slate-50 px-4 sm:px-6 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
                          {round.roundNumber}
                        </span>
                        <h4 className="font-black text-sm text-slate-900">
                          第 {round.roundNumber} 輪次對戰 (Round {round.roundNumber})
                        </h4>
                        <span className="text-[11px] text-slate-500 hidden sm:inline">
                          · 同時進行最多 3 場雙打
                        </span>
                      </div>

                      {/* Resting Players */}
                      {round.restingPlayers.length > 0 && (
                        <div className="text-[11px] text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5 overflow-hidden">
                          <span className="font-semibold text-slate-600 shrink-0">💤 本輪輪休：</span>
                          <span className="truncate">
                            {round.restingPlayers.map((p) => `${p.name}`).join('、')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Court Matches Grid (3 Courts) */}
                    <div className="p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
                      {matchesToShow.map((match) => {
                        const scoreData = matchScores[match.id] || {};
                        const isDone = Boolean(scoreData.completed);

                        return (
                          <div
                            key={match.id}
                            className={`rounded-2xl border p-4 space-y-3 transition-all flex flex-col justify-between ${
                              isDone
                                ? 'bg-slate-50/80 border-slate-200'
                                : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                            }`}
                          >
                            {/* Court Number Tag & Tier label */}
                            <div className="flex items-center justify-between">
                              <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-slate-900 text-white flex items-center gap-1">
                                <span>場地 {match.courtNumber}</span>
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium truncate max-w-[150px]">
                                {match.tierGroupLabel}
                              </span>
                            </div>

                            {/* Versus Battle Block */}
                            <div className="space-y-2">
                              {/* Team A */}
                              <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center justify-between">
                                <div className="space-y-0.5 truncate">
                                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                                    隊伍 A
                                  </span>
                                  <div className="text-xs font-extrabold text-slate-900 truncate">
                                    {match.teamA[0].name}{' '}
                                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/80 px-1 rounded">
                                      Lv{match.teamA[0].level}
                                    </span>{' '}
                                    & {match.teamA[1].name}{' '}
                                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/80 px-1 rounded">
                                      Lv{match.teamA[1].level}
                                    </span>
                                  </div>
                                </div>
                                <input
                                  type="number"
                                  placeholder="得分"
                                  value={scoreData.scoreA ?? ''}
                                  onChange={(e) =>
                                    handleUpdateMatchScore(match.id, 'A', Number(e.target.value))
                                  }
                                  className="w-14 text-center py-1 text-xs font-bold bg-white border border-emerald-300 rounded-lg shrink-0 ml-2"
                                />
                              </div>

                              <div className="text-center">
                                <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                  VS
                                </span>
                              </div>

                              {/* Team B */}
                              <div className="p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center justify-between">
                                <div className="space-y-0.5 truncate">
                                  <span className="text-[10px] font-bold text-blue-800 uppercase block">
                                    隊伍 B
                                  </span>
                                  <div className="text-xs font-extrabold text-slate-900 truncate">
                                    {match.teamB[0].name}{' '}
                                    <span className="text-[10px] font-mono text-blue-700 bg-blue-100/80 px-1 rounded">
                                      Lv{match.teamB[0].level}
                                    </span>{' '}
                                    & {match.teamB[1].name}{' '}
                                    <span className="text-[10px] font-mono text-blue-700 bg-blue-100/80 px-1 rounded">
                                      Lv{match.teamB[1].level}
                                    </span>
                                  </div>
                                </div>
                                <input
                                  type="number"
                                  placeholder="得分"
                                  value={scoreData.scoreB ?? ''}
                                  onChange={(e) =>
                                    handleUpdateMatchScore(match.id, 'B', Number(e.target.value))
                                  }
                                  className="w-14 text-center py-1 text-xs font-bold bg-white border border-blue-300 rounded-lg shrink-0 ml-2"
                                />
                              </div>
                            </div>

                            {/* Status Checkbox */}
                            <div className="pt-1 flex items-center justify-between text-xs border-t border-slate-100">
                              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-600 select-none">
                                <input
                                  type="checkbox"
                                  checked={isDone}
                                  onChange={() => handleToggleMatchComplete(match.id)}
                                  className="rounded text-emerald-600 focus:ring-emerald-500"
                                />
                                <span>{isDone ? '✓ 本場已完賽' : '標記完賽'}</span>
                              </label>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {match.id}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Content: byPlayer View */}
          {scheduleViewMode === 'byPlayer' && courtSchedule && (
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="font-bold text-sm text-slate-900">
                  選手出賽完整檢核表（每人固定 4 場循環賽）
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  點擊選手可展開查看 4 場出賽的輪次、場地編號、搭檔與交手對手。
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.values(courtSchedule.playerStats).map((stat) => {
                  const isExpanded = expandedPlayerStats === stat.player.id;
                  const tier = getTierByLevel(stat.player.level);

                  return (
                    <div
                      key={stat.player.id}
                      className="border border-slate-200 rounded-xl p-3 sm:p-4 space-y-2 hover:border-slate-300 transition-all bg-slate-50/50"
                    >
                      <div
                        onClick={() =>
                          setExpandedPlayerStats(isExpanded ? null : stat.player.id)
                        }
                        className="flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">
                            {stat.player.name}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${tier.colorClass.badge}`}>
                            Lv {stat.player.level} {tier.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            已排 {stat.totalMatches} / 4 場
                          </span>
                          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 border border-teal-200 text-teal-800">
                            4搭檔 0重複
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Match List */}
                      {isExpanded && (
                        <div className="pt-2 border-t border-slate-200 space-y-1.5 text-xs animate-in fade-in">
                          {stat.matches.map((m, idx) => (
                            <div
                              key={m.matchId}
                              className="p-2 bg-white rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.2 rounded">
                                  第 {idx + 1} 場
                                </span>
                                <span className="font-bold text-emerald-700">
                                  第 {m.roundNumber} 輪 · 場地 {m.courtNumber}
                                </span>
                              </div>
                              <div className="text-slate-600">
                                搭檔：<strong className="text-slate-900">{m.partner.name}</strong> vs{' '}
                                <span className="text-slate-700">
                                  {m.opponents[0].name} & {m.opponents[1].name}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state if not generated or invalid count */}
          {(!courtSchedule || courtSchedule.rounds.length === 0) && (
            <div className="bg-white rounded-2xl p-6 sm:p-10 text-center border border-dashed border-slate-300 space-y-4">
              <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${
                fivePlayerStatus.isValid ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
              }`}>
                {fivePlayerStatus.isValid ? <CalendarDays className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
              </div>

              <div className="space-y-1.5 max-w-lg mx-auto">
                <h4 className="text-base font-extrabold text-slate-900">
                  {fivePlayerStatus.isValid
                    ? `人數合格，可一鍵排定 ${fivePlayerStatus.groupCount} 組 3 場地賽程`
                    : `同組配對人員一定要五位（目前 ${players.length} 人，尚差 ${fivePlayerStatus.missingCount} 人）`}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {fivePlayerStatus.isValid
                    ? `目前名單共有 ${players.length} 位選手（每組剛好 5 位）。點擊下方按鈕，系統將自動分組並排定「每人 4 場輪迴賽、隊友 0 重複配對」之 3 場地賽程！`
                    : `賽事要求每人固定出賽 4 場且隊友不重複。依數學定理，同組配對人數必須剛好為 5 位（每組打 5 場，每人輪休 1 場）。請補齊至 5 的倍數後即可排程。`}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {fivePlayerStatus.isValid ? (
                  <button
                    type="button"
                    onClick={handleGenerateCourtSchedule}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>立即一鍵排定 3 場地賽程</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveAdminTab('roster')}
                      className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                    >
                      前往選手名單補人
                    </button>
                    <button
                      type="button"
                      onClick={handlePreloadSampleData}
                      className="px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-colors cursor-pointer"
                    >
                      載入 15 位示範名單 (3組5人)
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Full Player Roster & Quick Level Adjust */}
      {activeAdminTab === 'roster' && (
        <div className="space-y-4">
          {/* Search, Filter & Mobile View Toggle */}
          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋選手姓名或 Email..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-between md:justify-end">
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
                >
                  <option value="all">所有階層 ({players.length})</option>
                  {BADMINTON_TIERS.map((t) => (
                    <option key={t.tierId} value={t.name}>
                      {t.name} ({stats.tierCounts[t.name] || 0})
                    </option>
                  ))}
                </select>

                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
                >
                  <option value="all">所有性別</option>
                  <option value="male">男士 ({stats.maleCount})</option>
                  <option value="female">女士 ({stats.femaleCount})</option>
                </select>

                <button
                  type="button"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 flex items-center gap-1 font-medium cursor-pointer"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>級數: {sortOrder === 'asc' ? '0級起' : '高階起'}</span>
                </button>
              </div>

              {/* View toggle (Mobile card view vs Table) */}
              <div className="bg-slate-100 p-0.5 rounded-lg flex items-center text-xs">
                <button
                  type="button"
                  onClick={() => setRosterViewMode('cards')}
                  title="手機卡片好滑模式"
                  className={`px-2.5 py-1 font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                    rosterViewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">卡片</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRosterViewMode('table')}
                  title="詳細表格模式"
                  className={`px-2.5 py-1 font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                    rosterViewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">表格</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sample players in roster notice */}
          {samplePlayersInRoster.length > 0 && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl px-3 sm:px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-amber-900 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span>
                  目前名單中含有 <strong>{samplePlayersInRoster.length} 位預設示範選手</strong>（供測試分組用途）。
                </span>
              </div>
              <button
                type="button"
                onClick={handleDeleteSampleData}
                className="text-xs font-bold text-rose-700 hover:text-rose-900 bg-white hover:bg-rose-50 border border-rose-300 rounded-lg px-2.5 py-1 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>一鍵刪除 16 位示範名單</span>
              </button>
            </div>
          )}

          {/* Mode 1: Mobile Friendly Card View */}
          {rosterViewMode === 'cards' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredPlayers.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                  查無符合條件的羽球選手
                </div>
              ) : (
                filteredPlayers.map((player) => {
                  const tier = getTierByLevel(player.level);
                  return (
                    <div
                      key={player.id}
                      className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 hover:border-slate-300 shadow-xs transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-extrabold text-slate-900 truncate">
                            {player.name}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${tier.colorClass.badge}`}>
                            {tier.name}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-500 truncate" title={player.email}>
                          {player.email}
                        </p>
                        <div className="text-[11px] text-slate-600 flex items-center gap-2">
                          <span>{player.gender === 'male' ? '男士' : '女士'}</span>
                          <span>·</span>
                          <span>{player.dominantHand === 'left' ? '左手' : '右手'}</span>
                          {player.notes && (
                            <>
                              <span>·</span>
                              <span className="truncate max-w-[120px] text-slate-400" title={player.notes}>
                                {player.notes}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Organizer Level Adjust Buttons */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-slate-500">戰力級數:</span>
                          <span className="font-black text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                            Lv {player.level}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="降 1 級"
                            disabled={player.level <= 0}
                            onClick={() => handleQuickLevelChange(player.id, -1)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 font-extrabold flex items-center justify-center text-xs cursor-pointer"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            title="升 1 級"
                            disabled={player.level >= 18}
                            onClick={() => handleQuickLevelChange(player.id, 1)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 font-extrabold flex items-center justify-center text-xs cursor-pointer"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePlayer(player.id)}
                            title="移除此選手"
                            className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Mode 2: Table View */}
          {rosterViewMode === 'table' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-bold">
                    <tr>
                      <th className="py-3 px-4">選手姓名</th>
                      <th className="py-3 px-4">聯絡信箱 (Email)</th>
                      <th className="py-3 px-4">性別 / 慣用手</th>
                      <th className="py-3 px-4 text-center">戰力級數 (0-18)</th>
                      <th className="py-3 px-4">官方階級</th>
                      <th className="py-3 px-4">特殊需求/叮嚀</th>
                      <th className="py-3 px-4">人工微調等級</th>
                      <th className="py-3 px-4 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPlayers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          查無符合篩選條件的羽球選手
                        </td>
                      </tr>
                    ) : (
                      filteredPlayers.map((player) => {
                        const tier = getTierByLevel(player.level);
                        return (
                          <tr key={player.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                              {player.name}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                              {player.email}
                            </td>
                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                              {player.gender === 'male' ? '男' : '女'} ·{' '}
                              {player.dominantHand === 'left' ? '左手' : '右手'}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <span className="inline-block px-2.5 py-0.5 rounded-md font-mono font-black text-slate-900 bg-slate-100">
                                Lv {player.level}
                              </span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${tier.colorClass.badge}`}>
                                {tier.name}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={player.notes || '無'}>
                              {player.notes || '-'}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  title="減少1級"
                                  disabled={player.level <= 0}
                                  onClick={() => handleQuickLevelChange(player.id, -1)}
                                  className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 font-bold flex items-center justify-center text-xs cursor-pointer"
                                >
                                  -
                                </button>
                                <button
                                  type="button"
                                  title="增加1級"
                                  disabled={player.level >= 18}
                                  onClick={() => handleQuickLevelChange(player.id, 1)}
                                  className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 text-slate-700 font-bold flex items-center justify-center text-xs cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleDeletePlayer(player.id)}
                                title="移除此選手"
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Print View */}
      {activeAdminTab === 'print' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-center justify-between no-print">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                錦標賽名單公布與列印版型
              </h4>
              <p className="text-xs text-slate-500">
                本頁已針對 A4 紙張與球場公布欄進行版面優化，點擊下方即可直接列印或另存 PDF。
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>啟動瀏覽器列印 (Print)</span>
            </button>
          </div>

          {/* Printable Sheet */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
            <div className="text-center border-b-2 border-slate-900 pb-4">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                🏸 義鼎杯羽球錦標賽 · 賽程分組公告表
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                賽制：3個場地循環賽 · 同級選手每人打滿 4 場 · 參賽選手：{players.length} 人
              </p>
            </div>

            {courtSchedule && courtSchedule.rounds.length > 0 ? (
              <div className="space-y-6">
                {courtSchedule.rounds.map((round) => (
                  <div key={round.roundNumber} className="border border-slate-300 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="font-extrabold text-base text-slate-900">
                        📍 第 {round.roundNumber} 輪次對戰表
                      </span>
                      {round.restingPlayers.length > 0 && (
                        <span className="text-xs text-slate-500">
                          輪休：{round.restingPlayers.map((p) => p.name).join('、')}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {round.matches.map((m) => (
                        <div key={m.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                          <span className="font-bold text-slate-800 block text-[11px]">
                            場地 {m.courtNumber} ({m.tierGroupLabel})
                          </span>
                          <div className="font-semibold text-slate-900">
                            {m.teamA[0].name} & {m.teamA[1].name}
                          </div>
                          <div className="text-slate-400 font-bold text-center">VS</div>
                          <div className="font-semibold text-slate-900">
                            {m.teamB[0].name} & {m.teamB[1].name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-400 py-8 text-xs">
                尚未排定賽程，請先至「3 場地循環排程表」點選「一鍵排定 3 場地賽程」。
              </p>
            )}

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
              <span>列印時間：{new Date().toLocaleString('zh-TW')}</span>
              <span>主辦單位敬啟 · 祝各位同仁以球會友、盡情揮灑汗水！</span>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Player Modal */}
      {isAddPlayerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">手動新增選手</h3>
            <form onSubmit={handleAddManualPlayer} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  選手姓名 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="例如：王小明 或 Kevin"
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  聯絡 Email (選填)
                </label>
                <input
                  type="email"
                  value={newPlayerEmail}
                  onChange={(e) => setNewPlayerEmail(e.target.value)}
                  placeholder="選手 Email (留空將自動生成)"
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    初始戰力等級 (0~18級)
                  </label>
                  <select
                    value={newPlayerLevel}
                    onChange={(e) => setNewPlayerLevel(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50"
                  >
                    {Array.from({ length: 19 }, (_, i) => i).map((lvl) => {
                      const tier = getTierByLevel(lvl);
                      return (
                        <option key={lvl} value={lvl}>
                          Lv {lvl} ({lvl === 0 ? '超新手' : tier.name})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">性別</label>
                  <select
                    value={newPlayerGender}
                    onChange={(e) => setNewPlayerGender(e.target.value as 'male' | 'female')}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50"
                  >
                    <option value="male">男士 (Male)</option>
                    <option value="female">女士 (Female)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddPlayerOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  確認新增
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5-Player Rule Validation Error Modal */}
      {isFivePlayerModalOpen && fivePlayerValidationError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-rose-200 overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-base text-slate-900">
                  賽程排定失敗：同階級配對人員一定要五位
                </h3>
                <p className="text-xs text-rose-600 font-bold">
                  嚴格禁止跨階配對 · 各階級必須獨立湊滿 5 人（或 5 的倍數）
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 space-y-3">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span>📌 各階級選手人數檢查結果：</span>
              </div>
              <div className="space-y-1.5">
                {fivePlayerValidationError.tierDetails && fivePlayerValidationError.tierDetails.length > 0 ? (
                  fivePlayerValidationError.tierDetails.map((td) => (
                    <div
                      key={td.tierId}
                      className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                        td.isValid
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                          : 'bg-rose-50 border-rose-200 text-rose-950 font-bold'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {td.isValid ? (
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>【{td.tierName}】目前 {td.count} 人</span>
                      </div>
                      <span className="text-[11px]">
                        {td.isValid
                          ? `✓ 已成 ${td.count / 5} 組 (每組5人)`
                          : td.count < 5
                          ? `不足 1 組（尚差 ${td.missingCount} 人）`
                          : `多出 ${td.remainder} 人（尚差 ${td.missingCount} 人湊滿整組）`}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500">目前名單中尚無選手，請先報名或新增選手。</p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200 text-slate-800 space-y-1.5 leading-relaxed">
                <div className="font-bold text-slate-900">🏸 本次大會專屬賽制規定：</div>
                <div className="text-[11px] text-slate-600 space-y-1 pl-1">
                  <div>• <strong>每人打四場輪迴賽</strong>：每位選手恰出賽 4 場（輪休 1 場）。</div>
                  <div>• <strong>隊友零重複配對</strong>：同組 5 人中，與其餘 4 人各搭檔 1 次，零重複搭檔。</div>
                  <div>• <strong>同階級剛好五位</strong>：各階級必須為 5 的倍數，不可跨階混合組隊。</div>
                  <div>• <strong>嚴格防撞場與體力輪休</strong>：同一位選手絕不同時出現在兩個場地，且<strong>每位選手排程至少隔一場才能再次上場</strong>！</div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsFivePlayerModalOpen(false);
                  handlePreloadSampleData();
                }}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-colors cursor-pointer"
              >
                載入 15 位示範名單 (3組5人)
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsFivePlayerModalOpen(false);
                  setActiveAdminTab('roster');
                }}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                前往選手名單微調等級/補人
              </button>
              <button
                type="button"
                onClick={() => setIsFivePlayerModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
