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
import { subscribeToTournamentState, saveTournamentState } from '../firebase';
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
  Trophy,
  Medal,
  Flame,
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
  // Navigation inside Admin: 'schedule' (3-Court) | 'scores' (Prize leaderboard) | 'roster' | 'print'
  const [activeAdminTab, setActiveAdminTab] = useState<'schedule' | 'scores' | 'roster' | 'print'>('schedule');

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

  // Cloud realtime sync status
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string | null>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);

  // Score bracket filter: 'all' | 4 | 3 | 2 | 1 | 0
  const [selectedScoreBracket, setSelectedScoreBracket] = useState<'all' | number>('all');

  // Realtime subscription to tournament cloud state (schedule, scores, completion)
  useEffect(() => {
    const unsubscribe = subscribeToTournamentState(
      (cloudState) => {
        if (cloudState) {
          if (cloudState.courtSchedule) {
            setCourtSchedule(cloudState.courtSchedule);
          }
          if (cloudState.matchScores) {
            setMatchScores(cloudState.matchScores);
          }
          if (cloudState.updatedAt) {
            setLastCloudSyncTime(new Date(cloudState.updatedAt).toLocaleTimeString('zh-TW'));
          }
        }
      },
      (err) => {
        console.warn('Realtime tournament sync error:', err);
      }
    );
    return () => unsubscribe();
  }, []);

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
  const handleGenerateCourtSchedule = async () => {
    const validation = validateFivePlayerRule(players);
    if (!validation.isValid) {
      setFivePlayerValidationError(validation);
      setIsFivePlayerModalOpen(true);
      return;
    }
    const result = generateFourMatchCourtSchedule(players);
    setCourtSchedule(result);
    setActiveAdminTab('schedule');
    setIsCloudSyncing(true);
    try {
      await saveTournamentState(result, matchScores);
      setLastCloudSyncTime(new Date().toLocaleTimeString('zh-TW'));
    } catch (err) {
      console.warn('Failed saving generated schedule to cloud:', err);
    } finally {
      setIsCloudSyncing(false);
    }
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

  // Update match score in schedule (Strictly 0 or 1, mutually exclusive, locked if completed, auto cloud-saved)
  const handleUpdateMatchScore = async (matchId: string, team: 'A' | 'B', score: number) => {
    const current = matchScores[matchId] || { scoreA: 0, scoreB: 0, completed: false };
    if (current.completed) return; // Locked when completed!

    let nextA = current.scoreA ?? 0;
    let nextB = current.scoreB ?? 0;

    if (team === 'A') {
      if (score === 1) {
        nextA = 1;
        nextB = 0; // Mutually exclusive: Team B cannot also be 1
      } else {
        nextA = 0;
      }
    } else {
      if (score === 1) {
        nextB = 1;
        nextA = 0; // Mutually exclusive: Team A cannot also be 1
      } else {
        nextB = 0;
      }
    }

    const updated = {
      ...matchScores,
      [matchId]: {
        ...current,
        scoreA: nextA,
        scoreB: nextB,
      },
    };
    setMatchScores(updated);
    try {
      await saveTournamentState(courtSchedule, updated);
      setLastCloudSyncTime(new Date().toLocaleTimeString('zh-TW'));
    } catch (err) {
      console.warn('Failed saving score to cloud:', err);
    }
  };

  const handleToggleMatchComplete = async (matchId: string) => {
    const current = matchScores[matchId] || { scoreA: 0, scoreB: 0, completed: false };
    const nextCompleted = !current.completed;
    const updated = {
      ...matchScores,
      [matchId]: {
        scoreA: current.scoreA ?? 0,
        scoreB: current.scoreB ?? 0,
        ...current,
        completed: nextCompleted,
      },
    };
    setMatchScores(updated);
    try {
      await saveTournamentState(courtSchedule, updated);
      setLastCloudSyncTime(new Date().toLocaleTimeString('zh-TW'));
    } catch (err) {
      console.warn('Failed saving completion to cloud:', err);
    }
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

  // Expanded player ID in Score Leaderboard for inspecting match breakdown
  const [expandedScorePlayerId, setExpandedScorePlayerId] = useState<string | null>(null);
  const [scoreSortMetric, setScoreSortMetric] = useState<'points' | 'diff' | 'wins' | 'level'>('points');
  const [scoreSearchQuery, setScoreSearchQuery] = useState('');

  // Real-time calculation of individual player score statistics for tournament prize payout
  const playerScoreStats = useMemo(() => {
    interface PlayerScoreRecord {
      player: PlayerSubmission;
      tierGroupLabel: string;
      matchesPlayed: number;
      totalMatchesAssigned: number;
      totalPointsWon: number;
      totalPointsLost: number;
      pointDifferential: number;
      wins: number;
      losses: number;
      draws: number;
      winRate: number;
      history: {
        matchId: string;
        roundNumber: number;
        courtNumber: number;
        partnerName: string;
        partnerLevel: number;
        opponentsText: string;
        myTeamScore: number;
        oppTeamScore: number;
        result: 'win' | 'loss' | 'draw' | 'pending';
        completed: boolean;
      }[];
    }

    const map = new Map<string, PlayerScoreRecord>();

    players.forEach((p) => {
      map.set(p.id, {
        player: p,
        tierGroupLabel: '',
        matchesPlayed: 0,
        totalMatchesAssigned: 4,
        totalPointsWon: 0,
        totalPointsLost: 0,
        pointDifferential: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        history: [],
      });
    });

    if (!courtSchedule || courtSchedule.rounds.length === 0) {
      return Array.from(map.values());
    }

    courtSchedule.rounds.forEach((round) => {
      round.matches.forEach((m) => {
        const score = matchScores[m.id];
        const hasScoreA = score?.scoreA !== undefined && score?.scoreA !== null && !isNaN(Number(score?.scoreA));
        const hasScoreB = score?.scoreB !== undefined && score?.scoreB !== null && !isNaN(Number(score?.scoreB));
        const scoreA = hasScoreA ? Number(score.scoreA) : 0;
        const scoreB = hasScoreB ? Number(score.scoreB) : 0;
        const isCompleted = Boolean(score?.completed);
        const isCounted = isCompleted || hasScoreA || hasScoreB;

        const sides = [
          { player: m.teamA[0], partner: m.teamA[1], opp: m.teamB, myScore: scoreA, oppScore: scoreB },
          { player: m.teamA[1], partner: m.teamA[0], opp: m.teamB, myScore: scoreA, oppScore: scoreB },
          { player: m.teamB[0], partner: m.teamB[1], opp: m.teamA, myScore: scoreB, oppScore: scoreA },
          { player: m.teamB[1], partner: m.teamB[0], opp: m.teamA, myScore: scoreB, oppScore: scoreA },
        ];

        sides.forEach(({ player, partner, opp, myScore, oppScore }) => {
          let rec = map.get(player.id);
          if (!rec) {
            rec = {
              player,
              tierGroupLabel: m.tierGroupLabel,
              matchesPlayed: 0,
              totalMatchesAssigned: 4,
              totalPointsWon: 0,
              totalPointsLost: 0,
              pointDifferential: 0,
              wins: 0,
              losses: 0,
              draws: 0,
              winRate: 0,
              history: [],
            };
            map.set(player.id, rec);
          }

          if (!rec.tierGroupLabel) {
            rec.tierGroupLabel = m.tierGroupLabel;
          }

          let result: 'win' | 'loss' | 'draw' | 'pending' = 'pending';
          if (isCounted && (myScore > 0 || oppScore > 0 || isCompleted)) {
            rec.matchesPlayed += 1;
            rec.totalPointsWon += myScore;
            rec.totalPointsLost += oppScore;
            rec.pointDifferential += (myScore - oppScore);

            if (myScore > oppScore) {
              rec.wins += 1;
              result = 'win';
            } else if (myScore < oppScore) {
              rec.losses += 1;
              result = 'loss';
            } else {
              rec.draws += 1;
              result = 'draw';
            }
          }

          rec.history.push({
            matchId: m.id,
            roundNumber: m.roundNumber,
            courtNumber: m.courtNumber,
            partnerName: partner.name,
            partnerLevel: partner.level,
            opponentsText: `${opp[0].name}(Lv${opp[0].level}) & ${opp[1].name}(Lv${opp[1].level})`,
            myTeamScore: myScore,
            oppTeamScore: oppScore,
            result,
            completed: isCompleted,
          });
        });
      });
    });

    const list = Array.from(map.values()).map((rec) => {
      const totalDecided = rec.wins + rec.losses;
      const winRate = totalDecided > 0 ? Math.round((rec.wins / totalDecided) * 100) : 0;
      return {
        ...rec,
        winRate,
      };
    });

    return list.sort((a, b) => {
      if (scoreSortMetric === 'points') {
        if (b.totalPointsWon !== a.totalPointsWon) return b.totalPointsWon - a.totalPointsWon;
        if (b.pointDifferential !== a.pointDifferential) return b.pointDifferential - a.pointDifferential;
        return b.wins - a.wins;
      }
      if (scoreSortMetric === 'diff') {
        if (b.pointDifferential !== a.pointDifferential) return b.pointDifferential - a.pointDifferential;
        return b.totalPointsWon - a.totalPointsWon;
      }
      if (scoreSortMetric === 'wins') {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.totalPointsWon - a.totalPointsWon;
      }
      return b.player.level - a.player.level;
    });
  }, [players, courtSchedule, matchScores, scoreSortMetric]);

  // Export individual player score leaderboard to CSV for prize payouts
  const exportPlayerScoresToCSV = (statsList: typeof playerScoreStats) => {
    const headers = [
      '獎金排名',
      '選手姓名',
      '戰力等級',
      '官方階級',
      '性別',
      '所屬循環組別',
      '個人總得分 (獎金依據)',
      '個人總失分',
      '淨勝分差',
      '勝場',
      '敗場',
      '和局',
      '勝率(%)',
      '已賽場次',
      'Email',
    ];

    const rows = statsList.map((s, idx) => [
      `第 ${idx + 1} 名`,
      s.player.name,
      `Lv ${s.player.level}`,
      s.player.tierName,
      s.player.gender === 'male' ? '男' : '女',
      s.tierGroupLabel || '-',
      s.totalPointsWon,
      s.totalPointsLost,
      s.pointDifferential > 0 ? `+${s.pointDifferential}` : s.pointDifferential,
      s.wins,
      s.losses,
      s.draws,
      `${s.winRate}%`,
      `${s.matchesPlayed}/${s.totalMatchesAssigned}`,
      s.player.email,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `羽球錦標賽_個人得分獎金結算名冊_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

          {/* Top Right Action: Cloud Sync Status & Lock Admin */}
          <div className="flex items-center gap-2 flex-wrap shrink-0 self-start md:self-auto">
            <div className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50/90 text-emerald-900 text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
              <span className={`w-2 h-2 rounded-full ${isCloudSyncing ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
              <span>{isCloudSyncing ? '雲端同步存檔中...' : '雲端自動存檔'}</span>
              <span className="text-[11px] text-emerald-700 font-normal">
                {lastCloudSyncTime ? `(即時同步 ${lastCloudSyncTime})` : '(跨裝置已連線)'}
              </span>
            </div>

            {onLockAdmin && (
              <button
                type="button"
                onClick={onLockAdmin}
                title="重新鎖定後台"
                className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>鎖定後台</span>
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

      {/* Central Action Toolbar: Moved from top header */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-emerald-600" />
            <span>賽事操作中樞：</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleGenerateCourtSchedule}
            className="px-3.5 sm:px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
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
            <span>手動新增選手</span>
          </button>

          <button
            type="button"
            onClick={() => exportPlayersToCSV(players)}
            disabled={players.length === 0}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">匯出選手名單 CSV</span>
          </button>
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
          onClick={() => setActiveAdminTab('scores')}
          className={`py-2 px-3 sm:px-4 text-xs sm:text-sm font-bold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
            activeAdminTab === 'scores'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>每位選手統計得分區</span>
          <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
            activeAdminTab === 'scores' ? 'bg-white text-amber-800' : 'bg-amber-100 text-amber-800'
          }`}>
            個人獎金榜
          </span>
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
                        const scoreA = Number(scoreData.scoreA) === 1 ? 1 : 0;
                        const scoreB = Number(scoreData.scoreB) === 1 ? 1 : 0;

                        return (
                          <div
                            key={match.id}
                            className={`rounded-2xl transition-all flex flex-col justify-between p-4 space-y-3.5 ${
                              isDone
                                ? 'bg-emerald-50/90 border-2 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                                : 'bg-white border border-slate-200 hover:border-slate-300 shadow-xs'
                            }`}
                          >
                            {/* Court Number Tag, Tier label & Live Status */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2.5 py-0.5 rounded-lg text-xs font-black flex items-center gap-1 ${
                                    isDone ? 'bg-emerald-800 text-white' : 'bg-slate-900 text-white'
                                  }`}
                                >
                                  <span>場地 {match.courtNumber}</span>
                                </span>
                                {isDone ? (
                                  <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-emerald-600 text-white flex items-center gap-1 shadow-2xs">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>✓ 已完賽</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                    進行中 / 待比
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 font-medium truncate max-w-[140px]">
                                {match.tierGroupLabel}
                              </span>
                            </div>

                            {/* Versus Battle Block */}
                            <div className="space-y-2">
                              {/* Team A */}
                              <div
                                className={`p-2.5 rounded-xl flex items-center justify-between transition-all ${
                                  isDone
                                    ? scoreA === 1
                                      ? 'bg-emerald-100 border-2 border-emerald-500 shadow-2xs'
                                      : 'bg-white/80 border border-slate-200 opacity-70'
                                    : 'bg-emerald-50/70 border border-emerald-200/80'
                                }`}
                              >
                                <div className="space-y-0.5 truncate pr-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-black text-emerald-800 uppercase block">
                                      隊伍 A
                                    </span>
                                    {isDone && scoreA === 1 && (
                                      <span className="px-1.5 py-0.2 bg-emerald-600 text-white text-[9px] font-black rounded">
                                        🏆 勝出
                                      </span>
                                    )}
                                  </div>
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

                                {/* Score 0 / 1 Selector */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    disabled={isDone}
                                    onClick={() => handleUpdateMatchScore(match.id, 'A', 0)}
                                    title={isDone ? '本場已完賽，比分已鎖定 (需點擊下方解鎖才可修改)' : '0 分 (未得勝場)'}
                                    className={`w-7 h-7 text-xs font-black rounded-lg transition-all flex items-center justify-center ${
                                      isDone ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                                    } ${
                                      scoreA === 0
                                        ? 'bg-slate-700 text-white shadow-xs'
                                        : 'bg-white border border-slate-300 text-slate-400 hover:bg-slate-100'
                                    }`}
                                  >
                                    0
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isDone}
                                    onClick={() => handleUpdateMatchScore(match.id, 'A', 1)}
                                    title={isDone ? '本場已完賽，比分已鎖定 (需點擊下方解鎖才可修改)' : '1 分 (獲勝 1 場，將自動重設對方為 0 分)'}
                                    className={`w-7 h-7 text-xs font-black rounded-lg transition-all flex items-center justify-center ${
                                      isDone ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                                    } ${
                                      scoreA === 1
                                        ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400'
                                        : 'bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                                    }`}
                                  >
                                    1
                                  </button>
                                </div>
                              </div>

                              <div className="text-center">
                                <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                  VS
                                </span>
                              </div>

                              {/* Team B */}
                              <div
                                className={`p-2.5 rounded-xl flex items-center justify-between transition-all ${
                                  isDone
                                    ? scoreB === 1
                                      ? 'bg-blue-100 border-2 border-blue-500 shadow-2xs'
                                      : 'bg-white/80 border border-slate-200 opacity-70'
                                    : 'bg-blue-50/70 border border-blue-200/80'
                                }`}
                              >
                                <div className="space-y-0.5 truncate pr-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-black text-blue-800 uppercase block">
                                      隊伍 B
                                    </span>
                                    {isDone && scoreB === 1 && (
                                      <span className="px-1.5 py-0.2 bg-blue-600 text-white text-[9px] font-black rounded">
                                        🏆 勝出
                                      </span>
                                    )}
                                  </div>
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

                                {/* Score 0 / 1 Selector */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    disabled={isDone}
                                    onClick={() => handleUpdateMatchScore(match.id, 'B', 0)}
                                    title={isDone ? '本場已完賽，比分已鎖定 (需點擊下方解鎖才可修改)' : '0 分 (未得勝場)'}
                                    className={`w-7 h-7 text-xs font-black rounded-lg transition-all flex items-center justify-center ${
                                      isDone ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                                    } ${
                                      scoreB === 0
                                        ? 'bg-slate-700 text-white shadow-xs'
                                        : 'bg-white border border-slate-300 text-slate-400 hover:bg-slate-100'
                                    }`}
                                  >
                                    0
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isDone}
                                    onClick={() => handleUpdateMatchScore(match.id, 'B', 1)}
                                    title={isDone ? '本場已完賽，比分已鎖定 (需點擊下方解鎖才可修改)' : '1 分 (獲勝 1 場，將自動重設對方為 0 分)'}
                                    className={`w-7 h-7 text-xs font-black rounded-lg transition-all flex items-center justify-center ${
                                      isDone ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                                    } ${
                                      scoreB === 1
                                        ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400'
                                        : 'bg-white border border-blue-300 text-blue-700 hover:bg-blue-50'
                                    }`}
                                  >
                                    1
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Prominent Match Completion Toggle Button */}
                            <div className="pt-2 border-t border-slate-200/80">
                              <button
                                type="button"
                                onClick={() => handleToggleMatchComplete(match.id)}
                                className={`w-full py-2 px-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                                  isDone
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                                }`}
                              >
                                {isDone ? (
                                  <>
                                    <Lock className="w-3.5 h-3.5 text-emerald-200" />
                                    <span>✓ 本場已完賽 · 比分已鎖定 (點擊解鎖修改分數)</span>
                                  </>
                                ) : (
                                  <>
                                    <span>標記此場完賽</span>
                                  </>
                                )}
                              </button>
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

      {/* Tab: Individual Player Score Leaderboard (每位選手統計得分區 · 獎金結算總榜) */}
      {activeAdminTab === 'scores' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Header Card */}
          <div className="bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 rounded-2xl p-4 sm:p-6 border border-amber-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md bg-amber-600 text-white text-[11px] font-black flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>賽事獎金計算排行榜</span>
                </span>
                <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                  雙打輪迴制 · 個人累積得分結算
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-900">
                每位選手出賽統計得分與獎金名次
              </h3>
              <p className="text-xs text-slate-600 max-w-2xl">
                本次錦標賽每人打滿 4 場。各場次雙打得分即時全額計入選手之「個人總得分」與「淨勝分差」。此榜單即時更新，供主辦單位作為頒發個人獎金與排名獎項之權威依據。
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => exportPlayerScoresToCSV(playerScoreStats)}
                disabled={playerScoreStats.length === 0}
                className="px-4 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>匯出獎金得分成績單 (CSV)</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-bold block">參賽選手總數</span>
              <div className="text-xl font-black text-slate-900 mt-0.5">{players.length} 人</div>
              <span className="text-[10px] text-slate-400 block mt-0.5">每人預計 4 場</span>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-bold block">最高個人總得分</span>
              <div className="text-xl font-black text-amber-600 mt-0.5">
                {playerScoreStats[0] ? `${playerScoreStats[0].totalPointsWon} 分` : '0 分'}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
                {playerScoreStats[0] ? `暫居第 1 名：${playerScoreStats[0].player.name}` : '-'}
              </span>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-bold block">最高個人淨勝分</span>
              <div className="text-xl font-black text-emerald-600 mt-0.5">
                {playerScoreStats.reduce((max, s) => Math.max(max, s.pointDifferential), 0) > 0
                  ? `+${playerScoreStats.reduce((max, s) => Math.max(max, s.pointDifferential), 0)}`
                  : `${playerScoreStats.reduce((max, s) => Math.max(max, s.pointDifferential), 0)}`}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">總得分 － 總失分</span>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-bold block">賽程完賽率</span>
              <div className="text-xl font-black text-slate-900 mt-0.5">
                {courtSchedule && courtSchedule.totalMatchesScheduled > 0
                  ? `${Math.round(
                      (Object.values(matchScores).filter((s) => s.completed).length /
                        courtSchedule.totalMatchesScheduled) *
                        100
                    )}%`
                  : '0%'}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {courtSchedule
                  ? `${Object.values(matchScores).filter((s) => s.completed).length} / ${courtSchedule.totalMatchesScheduled} 場已完賽`
                  : '尚未排程'}
              </span>
            </div>
          </div>

          {/* Filter, Search & Sorting Controls */}
          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={scoreSearchQuery}
                onChange={(e) => setScoreSearchQuery(e.target.value)}
                placeholder="搜尋選手姓名或 Email..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-500">排序方式：</span>
              {[
                { id: 'points', label: '個人總得分 (獎金依據)' },
                { id: 'diff', label: '淨勝分差' },
                { id: 'wins', label: '勝場數' },
                { id: 'level', label: '戰力級數' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScoreSortMetric(s.id as any)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    scoreSortMetric === s.id
                      ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Score Bracket Filter Navigation */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500">獎金組別：</span>
            <button
              type="button"
              onClick={() => setSelectedScoreBracket('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                selectedScoreBracket === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              全部組別 (共 {playerScoreStats.length} 人)
            </button>
            {[4, 3, 2, 1, 0].map((pts) => {
              const count = playerScoreStats.filter((s) => s.totalPointsWon === pts).length;
              const label =
                pts === 4
                  ? '🏆 4 分全勝組'
                  : pts === 3
                  ? '🥈 3 分優勝組'
                  : pts === 2
                  ? '🥉 2 分均勢組'
                  : pts === 1
                  ? '🏅 1 分努力組'
                  : '🎖️ 0 分同樂組';
              return (
                <button
                  key={pts}
                  type="button"
                  onClick={() => setSelectedScoreBracket(pts)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                    selectedScoreBracket === pts
                      ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-300'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      selectedScoreBracket === pts
                        ? 'bg-amber-800 text-amber-100'
                        : 'bg-slate-100 text-slate-700 font-bold'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Scores Table / Grouped Cards Display */}
          <div className="space-y-6">
            {[
              {
                points: 4,
                title: '【4 分滿貫冠軍獎金組】',
                subtitle: '4 戰全勝 · 勝率 100% · 榮膺最高獎金榮譽',
                icon: '🥇',
                headerClass: 'bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 text-white',
              },
              {
                points: 3,
                title: '【3 分優勝獎金組】',
                subtitle: '3 勝 1 敗 · 勝率 75% · 戰力卓越',
                icon: '🥈',
                headerClass: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white',
              },
              {
                points: 2,
                title: '【2 分均勢獎金組】',
                subtitle: '2 勝 2 敗 · 勝率 50% · 旗鼓相當',
                icon: '🥉',
                headerClass: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white',
              },
              {
                points: 1,
                title: '【1 分努力獎勵組】',
                subtitle: '1 勝 3 敗 · 勝率 25% · 拼勁十足',
                icon: '🏅',
                headerClass: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white',
              },
              {
                points: 0,
                title: '【0 分同樂獎勵組】',
                subtitle: '0 勝 4 敗 · 志在參加 · 歡樂健康打羽球',
                icon: '🎖️',
                headerClass: 'bg-gradient-to-r from-slate-600 to-slate-700 text-white',
              },
            ]
              .filter((bracket) => selectedScoreBracket === 'all' || selectedScoreBracket === bracket.points)
              .map((bracket) => {
                const groupPlayers = playerScoreStats
                  .filter((s) => s.totalPointsWon === bracket.points)
                  .filter((s) => {
                    if (!scoreSearchQuery.trim()) return true;
                    const q = scoreSearchQuery.toLowerCase();
                    return (
                      s.player.name.toLowerCase().includes(q) ||
                      s.player.email.toLowerCase().includes(q)
                    );
                  });

                return (
                  <div key={bracket.points} className="space-y-3">
                    {/* Bracket Header Banner */}
                    <div
                      className={`rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs ${bracket.headerClass}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl shrink-0">{bracket.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-base tracking-tight">{bracket.title}</h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/20 backdrop-blur-xs">
                              {bracket.points} 分組
                            </span>
                          </div>
                          <p className="text-xs text-white/90 mt-0.5">{bracket.subtitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                        <span className="px-3 py-1 rounded-xl text-xs font-black bg-white text-slate-900 shadow-xs">
                          本組共 {groupPlayers.length} 位選手
                        </span>
                      </div>
                    </div>

                    {/* Players in this score bracket */}
                    {groupPlayers.length === 0 ? (
                      <div className="p-4 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                        目前此組別尚未有選手累積為 {bracket.points} 分積分（賽程進行中將即時自動更新分組）
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {groupPlayers.map((stat, index) => {
                          const rank = index + 1;
                          const isExpanded = expandedScorePlayerId === stat.player.id;
                          const tier = getTierByLevel(stat.player.level);

                return (
                  <div
                    key={stat.player.id}
                    className={`bg-white rounded-2xl border transition-all shadow-xs overflow-hidden ${
                      rank === 1
                        ? 'border-amber-300 ring-2 ring-amber-300/40 bg-gradient-to-r from-amber-50/30 via-white to-white'
                        : rank === 2
                        ? 'border-slate-300'
                        : rank === 3
                        ? 'border-amber-200'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Rank & Player identity */}
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl font-black flex items-center justify-center shrink-0 shadow-xs text-sm sm:text-base ${
                            rank === 1
                              ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white ring-2 ring-amber-300'
                              : rank === 2
                              ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white'
                              : rank === 3
                              ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {rank === 1 ? '🥇1' : rank === 2 ? '🥈2' : rank === 3 ? '🥉3' : `#${rank}`}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-base text-slate-900">
                              {stat.player.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-md font-mono text-xs font-black bg-slate-100 text-slate-800">
                              Lv {stat.player.level}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${tier.colorClass.badge}`}
                            >
                              {tier.name}
                            </span>
                            {stat.tierGroupLabel && (
                              <span className="text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                {stat.tierGroupLabel}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                            <span>{stat.player.gender === 'male' ? '男士' : '女士'}</span>
                            <span>·</span>
                            <span className="font-mono text-slate-400">{stat.player.email}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Score Metrics Strip */}
                      <div className="flex items-center gap-3 sm:gap-6 flex-wrap justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                        {/* Total Points Won (Highlighted for Prize) */}
                        <div className="text-center px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl min-w-[90px]">
                          <span className="text-[10px] font-bold text-amber-800 uppercase block">
                            個人總勝場積分
                          </span>
                          <span className="text-xl sm:text-2xl font-black text-amber-600 tabular-nums">
                            {stat.totalPointsWon}
                          </span>
                          <span className="text-[9px] text-amber-700 font-semibold block">獎金依據 (1勝=1分)</span>
                        </div>

                        {/* Total Points Lost */}
                        <div className="text-center px-2 py-1 min-w-[60px]">
                          <span className="text-[10px] font-bold text-slate-400 block">總失分</span>
                          <span className="text-base sm:text-lg font-bold text-slate-700 tabular-nums">
                            {stat.totalPointsLost}
                          </span>
                        </div>

                        {/* Net Point Differential */}
                        <div className="text-center px-2.5 py-1 min-w-[70px]">
                          <span className="text-[10px] font-bold text-slate-400 block">淨勝分差</span>
                          <span
                            className={`text-base sm:text-lg font-extrabold tabular-nums ${
                              stat.pointDifferential > 0
                                ? 'text-emerald-600'
                                : stat.pointDifferential < 0
                                ? 'text-rose-600'
                                : 'text-slate-500'
                            }`}
                          >
                            {stat.pointDifferential > 0
                              ? `+${stat.pointDifferential}`
                              : stat.pointDifferential}
                          </span>
                        </div>

                        {/* Win / Loss Record */}
                        <div className="text-center px-2 py-1 min-w-[70px]">
                          <span className="text-[10px] font-bold text-slate-400 block">戰績 (勝/敗)</span>
                          <span className="text-sm sm:text-base font-bold text-slate-800">
                            {stat.wins}勝 {stat.losses}敗
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            勝率 {stat.winRate}%
                          </span>
                        </div>

                        {/* Matches Played */}
                        <div className="text-center px-2 py-1 min-w-[65px]">
                          <span className="text-[10px] font-bold text-slate-400 block">已賽場數</span>
                          <span className="text-sm font-bold text-slate-800">
                            {stat.matchesPlayed} / {stat.totalMatchesAssigned}
                          </span>
                        </div>

                        {/* Toggle Match History Breakdown */}
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedScorePlayerId(isExpanded ? null : stat.player.id)
                          }
                          className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isExpanded ? '收起明細' : '出賽得分明細'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Match-by-Match History Breakdown */}
                    {isExpanded && (
                      <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                            <Swords className="w-3.5 h-3.5 text-amber-600" />
                            <span>{stat.player.name} 的 4 場出賽得分明細紀錄：</span>
                          </h5>
                          <span className="text-[11px] text-slate-500">
                            已記錄 {stat.history.length} 場（每場得分皆全額計入個人總分）
                          </span>
                        </div>

                        {stat.history.length === 0 ? (
                          <p className="text-xs text-slate-400 py-3 text-center">
                            尚未產生賽程或尚未輸入比分
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {stat.history.map((h, hIdx) => (
                              <div
                                key={h.matchId}
                                className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                                  h.result === 'win'
                                    ? 'bg-emerald-50/70 border-emerald-200'
                                    : h.result === 'loss'
                                    ? 'bg-rose-50/70 border-rose-200'
                                    : 'bg-white border-slate-200'
                                }`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-black text-slate-900">
                                      第 {hIdx + 1} 場 · 第 {h.roundNumber} 輪 (場地 {h.courtNumber})
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.2 text-[10px] font-bold rounded ${
                                        h.result === 'win'
                                          ? 'bg-emerald-600 text-white'
                                          : h.result === 'loss'
                                          ? 'bg-rose-600 text-white'
                                          : 'bg-slate-200 text-slate-700'
                                      }`}
                                    >
                                      {h.result === 'win'
                                        ? '勝出'
                                        : h.result === 'loss'
                                        ? '落敗'
                                        : h.result === 'draw'
                                        ? '和局'
                                        : '待賽'}
                                    </span>
                                  </div>
                                  <div className="text-slate-700">
                                    🤝 隊友搭檔：<span className="font-bold text-slate-900">{h.partnerName}</span>{' '}
                                    <span className="text-[10px] font-mono text-slate-500">(Lv{h.partnerLevel})</span>
                                  </div>
                                  <div className="text-slate-500 text-[11px]">
                                    ⚔️ 對手：{h.opponentsText}
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <div className="text-sm font-black text-slate-900 tabular-nums">
                                    {h.myTeamScore} : {h.oppTeamScore}
                                  </div>
                                  <div className="text-[10px] font-bold text-amber-700 mt-0.5">
                                    得 +{h.myTeamScore} 分
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
  </div>
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

            {/* Printable Individual Score Leaderboard Table (By Score Brackets) */}
            {courtSchedule && courtSchedule.rounds.length > 0 && (
              <div className="pt-4 border-t-2 border-slate-900 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-base text-slate-900">
                    🏆 選手個人勝場得分與獎金組別公告榜 (4分組、3分組、2分組、1分組、0分組)
                  </h3>
                  <span className="text-xs text-slate-500">
                    賽制：每人打滿 4 場 · 1 勝得 1 分 · 獎金依勝場積分組別頒發
                  </span>
                </div>

                <div className="space-y-4">
                  {[4, 3, 2, 1, 0].map((pts) => {
                    const groupPlayers = playerScoreStats.filter((s) => s.totalPointsWon === pts);
                    if (groupPlayers.length === 0) return null;
                    const groupTitle =
                      pts === 4
                        ? '🥇【4 分滿貫冠軍獎金組 · 4 戰全勝】'
                        : pts === 3
                        ? '🥈【3 分優勝獎金組 · 3 勝 1 敗】'
                        : pts === 2
                        ? '🥉【2 分均勢獎金組 · 2 勝 2 敗】'
                        : pts === 1
                        ? '🏅【1 分努力獎勵組 · 1 勝 3 敗】'
                        : '🎖️【0 分同樂獎勵組 · 0 勝 4 敗】';

                    return (
                      <div key={pts} className="border border-slate-300 rounded-lg overflow-hidden">
                        <div className="bg-slate-100 px-3 py-1.5 font-black text-xs text-slate-800 flex items-center justify-between">
                          <span>{groupTitle}</span>
                          <span>本組共 {groupPlayers.length} 位選手</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                              <tr>
                                <th className="py-1.5 px-3">序號</th>
                                <th className="py-1.5 px-3">選手姓名</th>
                                <th className="py-1.5 px-3">戰力級數</th>
                                <th className="py-1.5 px-3">所屬循環組</th>
                                <th className="py-1.5 px-3 text-right">個人勝場 (積分)</th>
                                <th className="py-1.5 px-3 text-right">總失分</th>
                                <th className="py-1.5 px-3 text-right">淨勝差</th>
                                <th className="py-1.5 px-3 text-center">戰績</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {groupPlayers.map((s, idx) => (
                                <tr key={s.player.id}>
                                  <td className="py-1.5 px-3 font-bold">{idx + 1}</td>
                                  <td className="py-1.5 px-3 font-extrabold">{s.player.name}</td>
                                  <td className="py-1.5 px-3">Lv {s.player.level}</td>
                                  <td className="py-1.5 px-3 text-slate-600">{s.tierGroupLabel || '-'}</td>
                                  <td className="py-1.5 px-3 text-right font-black text-amber-700">{s.totalPointsWon} 分</td>
                                  <td className="py-1.5 px-3 text-right text-slate-600">{s.totalPointsLost}</td>
                                  <td className="py-1.5 px-3 text-right font-bold">
                                    {s.pointDifferential > 0 ? `+${s.pointDifferential}` : s.pointDifferential}
                                  </td>
                                  <td className="py-1.5 px-3 text-center">{s.wins}勝{s.losses}敗</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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
