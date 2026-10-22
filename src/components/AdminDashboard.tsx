import React, { useState, useMemo } from 'react';
import { PlayerSubmission, TournamentGroup, TeamPair } from '../types';
import { BADMINTON_TIERS, getTierByLevel } from '../data/badmintonTiers';
import { SAMPLE_PLAYERS } from '../data/samplePlayers';
import {
  generateBalancedDoubles,
  generateTieredDivisions,
  generateBalancedMixedDoubles,
  exportPlayersToCSV,
} from '../utils/groupingAlgorithms';
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
  Lock
} from 'lucide-react';

interface AdminDashboardProps {
  players: PlayerSubmission[];
  onUpdatePlayers: (players: PlayerSubmission[]) => void;
  onViewOfficialChart: () => void;
  onLockAdmin?: () => void;
  onDeletePlayer?: (playerId: string) => Promise<void>;
  onSavePlayer?: (player: PlayerSubmission) => Promise<void>;
  onBatchAddPlayers?: (players: PlayerSubmission[]) => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  players,
  onUpdatePlayers,
  onViewOfficialChart,
  onLockAdmin,
  onDeletePlayer,
  onSavePlayer,
  onBatchAddPlayers,
}) => {
  // Navigation inside Admin
  const [activeAdminTab, setActiveAdminTab] = useState<'roster' | 'grouping' | 'print'>('grouping');

  // Roster search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'level' | 'name' | 'time'>('level');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Grouping configuration
  const [groupingAlgorithm, setGroupingAlgorithm] = useState<'balanced' | 'tiered' | 'mixed'>('balanced');
  const [teamsPerGroup, setTeamsPerGroup] = useState<number>(4);
  const [generatedGroups, setGeneratedGroups] = useState<TournamentGroup[]>([]);
  const [remainingPlayers, setRemainingPlayers] = useState<PlayerSubmission[]>([]);

  // Manual player modal state
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerEmail, setNewPlayerEmail] = useState('');
  const [newPlayerLevel, setNewPlayerLevel] = useState(4);
  const [newPlayerGender, setNewPlayerGender] = useState<'male' | 'female'>('male');

  // Copy notice
  const [hasCopiedText, setHasCopiedText] = useState(false);

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

  // Execute grouping algorithm
  const handleExecuteGrouping = () => {
    if (players.length < 2) {
      alert('選手人數不足（至少需 2 人），請先填寫或點擊「預載示範名單」！');
      return;
    }

    if (groupingAlgorithm === 'balanced') {
      const { groups, remainingPlayers: leftovers } = generateBalancedDoubles(players, teamsPerGroup);
      setGeneratedGroups(groups);
      setRemainingPlayers(leftovers);
    } else if (groupingAlgorithm === 'tiered') {
      const { groups, remainingPlayers: leftovers } = generateTieredDivisions(players);
      setGeneratedGroups(groups);
      setRemainingPlayers(leftovers);
    } else if (groupingAlgorithm === 'mixed') {
      const { groups, remainingPlayers: leftovers } = generateBalancedMixedDoubles(players);
      setGeneratedGroups(groups);
      setRemainingPlayers(leftovers);
    }
    setActiveAdminTab('grouping');
  };

  // Preload demo players
  const handlePreloadSampleData = async () => {
    if (players.length > 0) {
      if (!confirm('載入示範名單將會寫入 16 位測試球員資料至雲端資料庫。確定要載入嗎？')) {
        return;
      }
    }
    const existingEmails = new Set(players.map((p) => p.email.toLowerCase()));
    const toAdd = SAMPLE_PLAYERS.filter((p) => !existingEmails.has(p.email.toLowerCase()));
    if (toAdd.length === 0) {
      alert('示範名單已全數在列表中！');
      return;
    }
    if (onBatchAddPlayers) {
      await onBatchAddPlayers(toAdd);
    } else {
      const merged = [...players, ...toAdd];
      onUpdatePlayers(merged);
    }
  };

  // Quick level adjust (+1 or -1) by organizer
  const handleQuickLevelChange = async (playerId: string, delta: number) => {
    const target = players.find((p) => p.id === playerId);
    if (!target) return;
    const newLvl = Math.max(1, Math.min(18, target.level + delta));
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

  // Add manual player
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
  };

  // Copy schedule text to clipboard
  const handleCopySchedule = () => {
    if (generatedGroups.length === 0) return;
    let text = `🏸 【義鼎杯羽球錦標賽 分組對抗賽程表】\n分組基準：台灣羽協1-18級實力平衡演算法\n`;
    text += `總參賽人數：${players.length} 人 · 平均級數：Lv ${stats.avgLevel}\n\n`;

    generatedGroups.forEach((group) => {
      text += `━━━━━━━━━━━━━━━\n📍 ${group.groupName} (${group.divisionLabel})\n━━━━━━━━━━━━━━━\n`;
      group.teams.forEach((team, idx) => {
        text += `  隊伍 ${idx + 1}：${team.player1.name} (Lv${team.player1.level}) & ${team.player2.name} (Lv${team.player2.level}) [戰力值: ${team.totalScore}]\n`;
      });
      text += '\n';
    });

    if (remainingPlayers.length > 0) {
      text += `\n備用/單打選手：${remainingPlayers.map((p) => `${p.name} (Lv${p.level})`).join(', ')}\n`;
    }

    navigator.clipboard.writeText(text);
    setHasCopiedText(true);
    setTimeout(() => setHasCopiedText(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Banner & Control Deck */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-xs font-bold">
                賽事主辦人後台
              </span>
              <span className="text-xs text-slate-500">
                實力防虐殺 · 雙打均衡分組中控台
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              羽球錦標賽名單與智慧分組系統
            </h1>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePreloadSampleData}
              className="px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>載入 16 位同事示範名單</span>
            </button>

            <button
              type="button"
              onClick={() => exportPlayersToCSV(players)}
              disabled={players.length === 0}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>匯出 Excel (CSV)</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddPlayerOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>手動新增選手</span>
            </button>

            {onLockAdmin && (
              <button
                type="button"
                onClick={onLockAdmin}
                title="重新鎖定後台，需再輸入密碼才能檢視"
                className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>鎖定後台</span>
              </button>
            )}
          </div>
        </div>

        {/* Real-time Tournament Analytics KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-xs text-slate-500 font-medium">總報名人數</span>
            <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
              {stats.total} <span className="text-xs font-normal text-slate-500">人</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              男 {stats.maleCount} 人 · 女 {stats.femaleCount} 人
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-xs text-slate-500 font-medium">全體平均戰力級數</span>
            <div className="text-2xl font-black text-emerald-700 mt-1 tabular-nums">
              Lv {stats.avgLevel || 0}
            </div>
            <span className="text-[11px] text-emerald-600 mt-0.5 block">
              {stats.avgLevel ? getTierByLevel(Math.round(stats.avgLevel)).name : '暫無數據'}
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-xs text-slate-500 font-medium">可配成雙打隊數</span>
            <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
              {Math.floor(stats.total / 2)} <span className="text-xs font-normal text-slate-500">隊</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              {stats.total % 2 === 0 ? '人數剛好配對成雙' : '單數 1 人待排輪轉'}
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-xs text-slate-500 font-medium">新手 / 菁英分佈</span>
            <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
              {stats.tierCounts['新手階'] || 0} <span className="text-xs font-normal text-slate-400">/</span> {stats.tierCounts['中階'] || 0}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              新手階 / 中階以上人數
            </span>
          </div>
        </div>

        {/* Tier Distribution Mini Bar */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold">各階層選手比例分佈：</span>
            <button
              onClick={onViewOfficialChart}
              className="text-emerald-700 hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <Award className="w-3.5 h-3.5" />
              對照 1-18 級制度說明
            </button>
          </div>
          <div className="flex items-center h-3 w-full bg-slate-100 rounded-full overflow-hidden">
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
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
            {BADMINTON_TIERS.map((tier) => (
              <span key={tier.tierId} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${tier.colorClass.badge}`} />
                <span>{tier.name} ({stats.tierCounts[tier.name] || 0}人)</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Admin Functional Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveAdminTab('grouping')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeAdminTab === 'grouping'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>智慧平衡分組引擎</span>
          {generatedGroups.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800">
              已產出 {generatedGroups.length} 組
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveAdminTab('roster')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeAdminTab === 'roster'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>全體報名名單與程度微調</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700">
            {players.length}
          </span>
        </button>

        <button
          onClick={() => setActiveAdminTab('print')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeAdminTab === 'print'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>比賽公布與列印排版</span>
        </button>
      </div>

      {/* Tab 1: Grouping Engine */}
      {activeAdminTab === 'grouping' && (
        <div className="space-y-6">
          
          {/* Algorithm Strategy Panel */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  選擇雙打分組策略演算法
                </h3>
                <p className="text-xs text-slate-500">
                  羽球教練專業設計：避免實力懸殊引發挫折，兼顧精彩度與公平性
                </p>
              </div>

              <button
                type="button"
                onClick={handleExecuteGrouping}
                className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>立即執行分組演算法</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Option A: S-Curve Balanced Doubles */}
              <div
                onClick={() => setGroupingAlgorithm('balanced')}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                  groupingAlgorithm === 'balanced'
                    ? 'bg-emerald-50/70 border-emerald-600 ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    【推薦】強弱互補公平雙打
                  </span>
                  {groupingAlgorithm === 'balanced' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  將高階種子選手與初階/新手搭檔（例如 Lv 10 配 Lv 2 = 12分，Lv 7 配 Lv 5 = 12分），每組隊伍戰力極為接近，拉鋸刺激！
                </p>
              </div>

              {/* Option B: Tiered Divisions */}
              <div
                onClick={() => setGroupingAlgorithm('tiered')}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                  groupingAlgorithm === 'tiered'
                    ? 'bg-emerald-50/70 border-emerald-600 ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" />
                    同級實力分組 (甲/乙/丙組)
                  </span>
                  {groupingAlgorithm === 'tiered' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  切分成「甲組菁英 (7+級)」、「乙組挑戰 (4-6級)」、「丙組新手 (1-3級)」，新手對新手、高手打高手，絕無被電壓力！
                </p>
              </div>

              {/* Option C: Mixed Doubles */}
              <div
                onClick={() => setGroupingAlgorithm('mixed')}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                  groupingAlgorithm === 'mixed'
                    ? 'bg-emerald-50/70 border-emerald-600 ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-pink-600" />
                    男女混雙戰力平衡配對
                  </span>
                  {groupingAlgorithm === 'mixed' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  男選手與女選手進行交叉平衡配對（男強配女初、女強配男初），打造歡樂又公平的混雙賽制。
                </p>
              </div>

            </div>

            {groupingAlgorithm === 'balanced' && (
              <div className="flex items-center gap-4 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="font-semibold">每小組隊數上限：</span>
                {[3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setTeamsPerGroup(num)}
                    className={`px-3 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                      teamsPerGroup === num
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {num} 隊 / 組
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Grouping Results Display */}
          {generatedGroups.length > 0 ? (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      智慧分組產出成功（共 {generatedGroups.length} 個分組，包含 {generatedGroups.reduce((acc, g) => acc + g.teams.length, 0)} 對雙打）
                    </h4>
                    <p className="text-xs text-slate-500">
                      各隊積分與平均實力皆已最佳化平衡
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySchedule}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {hasCopiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{hasCopiedText ? '已複製賽程文字' : '一鍵複製賽程文字'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveAdminTab('print')}
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>列印 / 預覽名單</span>
                  </button>
                </div>
              </div>

              {/* Groups Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {generatedGroups.map((group) => {
                  const groupTotalScore = group.teams.reduce((acc, t) => acc + t.totalScore, 0);
                  const groupAvgTeamScore = group.teams.length > 0 ? (groupTotalScore / group.teams.length).toFixed(1) : 0;

                  return (
                    <div
                      key={group.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col"
                    >
                      {/* Group Header */}
                      <div
                        className="px-5 py-3.5 border-b flex items-center justify-between text-white"
                        style={{ backgroundColor: group.color || '#0f172a' }}
                      >
                        <div>
                          <h4 className="font-extrabold text-sm sm:text-base">
                            {group.groupName}
                          </h4>
                          <span className="text-[11px] text-white/80 block">
                            {group.divisionLabel}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold bg-white/20 px-2 py-0.5 rounded-full">
                          隊伍均戰力: {groupAvgTeamScore}
                        </span>
                      </div>

                      {/* Teams List */}
                      <div className="p-4 space-y-3 flex-1">
                        {group.teams.length === 0 ? (
                          <p className="text-xs text-slate-400 py-6 text-center">
                            尚無配對選手
                          </p>
                        ) : (
                          group.teams.map((team, tIdx) => (
                            <div
                              key={team.id}
                              className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/90 transition-all space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800">
                                  第 {tIdx + 1} 隊
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                    合力值: {team.totalScore} 分 (均 {team.avgScore})
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {/* Player 1 */}
                                <div className="p-2 bg-white rounded-lg border border-slate-200">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-900 truncate">
                                      {team.player1.name}
                                    </span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-white">
                                      Lv {team.player1.level}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                                    <span>{team.player1.gender === 'male' ? '男' : '女'} · {team.player1.dominantHand === 'left' ? '左手' : '右手'}</span>
                                    <span className="font-medium text-emerald-700">{team.player1.tierName}</span>
                                  </div>
                                </div>

                                {/* Player 2 */}
                                <div className="p-2 bg-white rounded-lg border border-slate-200">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-900 truncate">
                                      {team.player2.name}
                                    </span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-white">
                                      Lv {team.player2.level}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                                    <span>{team.player2.gender === 'male' ? '男' : '女'} · {team.player2.dominantHand === 'left' ? '左手' : '右手'}</span>
                                    <span className="font-medium text-emerald-700">{team.player2.tierName}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Remaining players alert */}
              {remainingPlayers.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                  <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-amber-950">
                      單數待安排選手（共 {remainingPlayers.length} 位）：
                    </h5>
                    <p className="text-xs text-amber-800 mt-0.5">
                      {remainingPlayers.map((p) => `${p.name} (Lv ${p.level} ${p.tierName})`).join('、')}
                    </p>
                    <p className="text-[11px] text-amber-700 mt-1">
                      建議安排為種子選手代打輪空位、或作為第 3 人輪替替補。
                    </p>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Sliders className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-800">
                尚未執行智慧平衡分組
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                請在上方挑選您欲使用的羽球雙打分組策略，然後點擊「立即執行分組演算法」。目前名單內共有 {players.length} 位選手。
              </p>
              <button
                type="button"
                onClick={handleExecuteGrouping}
                className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>立即開始自動分組</span>
              </button>
            </div>
          )}

        </div>
      )}

      {/* Tab 2: Full Player Roster & Quick Level Adjust */}
      {activeAdminTab === 'roster' && (
        <div className="space-y-4">
          
          {/* Search & Filter Toolbar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋選手姓名或 Google 信箱..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
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
                onClick={() => {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                }}
                className="px-2.5 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 flex items-center gap-1 font-medium cursor-pointer"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>級數排序: {sortOrder === 'desc' ? '由高到低' : '由低到高'}</span>
              </button>
            </div>
          </div>

          {/* Roster Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-bold">
                  <tr>
                    <th className="py-3 px-4">選手姓名</th>
                    <th className="py-3 px-4">Google 綁定信箱</th>
                    <th className="py-3 px-4">性別 / 慣用手</th>
                    <th className="py-3 px-4 text-center">戰力級數 (1-18)</th>
                    <th className="py-3 px-4">官方階級</th>
                    <th className="py-3 px-4">特殊需求/叮嚀</th>
                    <th className="py-3 px-4">主辦微調戰力</th>
                    <th className="py-3 px-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPlayers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
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
                                onClick={() => handleQuickLevelChange(player.id, -1)}
                                className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs cursor-pointer"
                              >
                                -
                              </button>
                              <button
                                type="button"
                                title="增加1級"
                                onClick={() => handleQuickLevelChange(player.id, 1)}
                                className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs cursor-pointer"
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
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
            <div className="text-center border-b-2 border-slate-900 pb-4">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                🏸 義鼎杯羽球錦標賽 · 賽程分組公告表
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                評估制度：台灣羽球推廣協會 1~18 級實力平衡 · 參賽人數：{players.length} 人 · 賽事公平防虐殺分組
              </p>
            </div>

            {generatedGroups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {generatedGroups.map((g) => (
                  <div key={g.id} className="border border-slate-300 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="font-extrabold text-base text-slate-900">
                        {g.groupName} ({g.divisionLabel})
                      </span>
                      <span className="text-xs font-mono text-slate-600">
                        隊數：{g.teams.length} 隊
                      </span>
                    </div>

                    <div className="space-y-2">
                      {g.teams.map((t, idx) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-xs"
                        >
                          <span className="font-bold text-slate-800">
                            隊伍 {idx + 1}
                          </span>
                          <span className="font-semibold text-slate-900">
                            {t.player1.name} (Lv {t.player1.level}) & {t.player2.name} (Lv {t.player2.level})
                          </span>
                          <span className="font-mono text-slate-500">
                            合力值: {t.totalScore}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-400 py-8 text-xs">
                尚未產出分組，請先至「智慧平衡分組引擎」點選「立即執行分組演算法」。
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
                  placeholder="例如：張國榮 或 Kevin"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Google Mail / 電子信箱
                </label>
                <input
                  type="email"
                  value={newPlayerEmail}
                  onChange={(e) => setNewPlayerEmail(e.target.value)}
                  placeholder="例如：leslie@company.com"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">性別</label>
                  <select
                    value={newPlayerGender}
                    onChange={(e) => setNewPlayerGender(e.target.value as 'male' | 'female')}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="male">男</option>
                    <option value="female">女</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    指定戰力級數 (1-18)
                  </label>
                  <select
                    value={newPlayerLevel}
                    onChange={(e) => setNewPlayerLevel(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold"
                  >
                    {Array.from({ length: 18 }, (_, i) => i + 1).map((lvl) => (
                      <option key={lvl} value={lvl}>
                        第 {lvl} 級 ({getTierByLevel(lvl).name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddPlayerOpen(false)}
                  className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                >
                  新增選手
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
