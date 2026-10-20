import { PlayerSubmission, TeamPair, TournamentGroup } from '../types';

/**
 * Balanced Doubles (S-Curve / Strong + Beginner Pair)
 * Pairs highest level with lowest level so every pair's combined score is near equal.
 */
export function generateBalancedDoubles(
  players: PlayerSubmission[],
  teamsPerGroup: number = 4
): { groups: TournamentGroup[]; remainingPlayers: PlayerSubmission[] } {
  // Sort descending by level
  const sorted = [...players].sort((a, b) => b.level - a.level);
  const pairs: TeamPair[] = [];
  const remainingPlayers: PlayerSubmission[] = [];

  let left = 0;
  let right = sorted.length - 1;
  let pairIndex = 1;

  while (left < right) {
    const p1 = sorted[left];
    const p2 = sorted[right];
    const totalScore = p1.level + p2.level;
    const avgScore = Number((totalScore / 2).toFixed(1));

    pairs.push({
      id: `pair-${pairIndex}`,
      teamName: `第 ${pairIndex} 隊 (${p1.name.split(' ')[0]} & ${p2.name.split(' ')[0]})`,
      player1: p1,
      player2: p2,
      totalScore,
      avgScore,
    });

    left++;
    right--;
    pairIndex++;
  }

  // If odd number of players, middle player remains
  if (left === right) {
    remainingPlayers.push(sorted[left]);
  }

  // Now distribute pairs across groups using snake draft so groups are balanced
  const numGroups = Math.max(1, Math.ceil(pairs.length / teamsPerGroup));
  const groups: TournamentGroup[] = Array.from({ length: numGroups }, (_, i) => {
    const groupLetter = String.fromCharCode(65 + i);
    return {
      id: `group-${i + 1}`,
      groupName: `小組 ${groupLetter}`,
      divisionLabel: '戰力均等雙打組',
      color: ['#0284c7', '#16a34a', '#d97706', '#9333ea', '#e11d48'][i % 5],
      teams: [],
      singlePlayers: [],
    };
  });

  // Sort pairs by totalScore descending to snake distribute
  const sortedPairs = [...pairs].sort((a, b) => b.totalScore - a.totalScore);
  sortedPairs.forEach((pair, idx) => {
    const cycle = Math.floor(idx / numGroups);
    const posInCycle = idx % numGroups;
    const groupIndex = cycle % 2 === 0 ? posInCycle : numGroups - 1 - posInCycle;
    groups[groupIndex].teams.push(pair);
  });

  return { groups, remainingPlayers };
}

/**
 * Tiered Divisions (A: 菁英組, B: 挑戰組, C: 歡樂組)
 * Groups players strictly by skill tiers so beginners never face advanced players.
 */
export function generateTieredDivisions(
  players: PlayerSubmission[]
): { groups: TournamentGroup[]; remainingPlayers: PlayerSubmission[] } {
  // Elite: Level 7+
  const elite = players.filter((p) => p.level >= 7);
  // Intermediate: Level 4 - 6
  const intermediate = players.filter((p) => p.level >= 4 && p.level <= 6);
  // Novice: Level 1 - 3
  const novice = players.filter((p) => p.level <= 3);

  const groups: TournamentGroup[] = [];
  const remainingPlayers: PlayerSubmission[] = [];

  const tierConfigs = [
    { name: '甲組 (菁英挑戰組)', division: '程度：7 級 ~ 18 級 (初中階至高階)', color: '#0284c7', pool: elite },
    { name: '乙組 (實力進階組)', division: '程度：4 級 ~ 6 級 (初階至初中階)', color: '#16a34a', pool: intermediate },
    { name: '丙組 (歡樂推廣組)', division: '程度：1 級 ~ 3 級 (新手階)', color: '#d97706', pool: novice },
  ];

  let pairGlobalCounter = 1;

  tierConfigs.forEach((cfg, gIdx) => {
    const poolSorted = [...cfg.pool].sort((a, b) => b.level - a.level);
    const teams: TeamPair[] = [];

    let i = 0;
    while (i + 1 < poolSorted.length) {
      const p1 = poolSorted[i];
      const p2 = poolSorted[i + 1];
      const totalScore = p1.level + p2.level;
      const avgScore = Number((totalScore / 2).toFixed(1));

      teams.push({
        id: `pair-tier-${pairGlobalCounter++}`,
        teamName: `${p1.name.split(' ')[0]} & ${p2.name.split(' ')[0]}`,
        player1: p1,
        player2: p2,
        totalScore,
        avgScore,
      });
      i += 2;
    }

    if (i < poolSorted.length) {
      remainingPlayers.push(poolSorted[i]);
    }

    groups.push({
      id: `tier-group-${gIdx + 1}`,
      groupName: cfg.name,
      divisionLabel: cfg.division,
      color: cfg.color,
      teams,
    });
  });

  return { groups, remainingPlayers };
}

/**
 * Balanced Mixed Doubles (Male + Female balanced pairing)
 */
export function generateBalancedMixedDoubles(
  players: PlayerSubmission[]
): { groups: TournamentGroup[]; remainingPlayers: PlayerSubmission[] } {
  const males = [...players.filter((p) => p.gender === 'male')].sort((a, b) => b.level - a.level);
  const females = [...players.filter((p) => p.gender === 'female')].sort((a, b) => a.level - b.level); // sort ascending for complementary match

  const pairs: TeamPair[] = [];
  const remainingPlayers: PlayerSubmission[] = [];

  const matchCount = Math.min(males.length, females.length);

  for (let i = 0; i < matchCount; i++) {
    const p1 = males[i];
    const p2 = females[i];
    const totalScore = p1.level + p2.level;
    const avgScore = Number((totalScore / 2).toFixed(1));

    pairs.push({
      id: `mixed-pair-${i + 1}`,
      teamName: `混雙 ${i + 1} 隊 (${p1.name.split(' ')[0]} & ${p2.name.split(' ')[0]})`,
      player1: p1,
      player2: p2,
      totalScore,
      avgScore,
    });
  }

  // Add leftovers to remaining
  if (males.length > matchCount) {
    remainingPlayers.push(...males.slice(matchCount));
  }
  if (females.length > matchCount) {
    remainingPlayers.push(...females.slice(matchCount));
  }

  const group: TournamentGroup = {
    id: 'mixed-group-1',
    groupName: '男女混雙戰力平衡組',
    divisionLabel: '男高配女低 / 男初配女強 實力平衡',
    color: '#ec4899',
    teams: pairs,
  };

  return { groups: [group], remainingPlayers };
}

/**
 * Export to CSV format (UTF-8 with BOM for Excel compatibility)
 */
export function exportPlayersToCSV(players: PlayerSubmission[]): void {
  const headers = ['選手姓名', 'Google Mail', '性別', '慣用手', '戰力級數(1-18)', '階級說明', '評估方式', '特殊需求或叮嚀', '填寫時間'];
  const rows = players.map((p) => [
    `"${p.name.replace(/"/g, '""')}"`,
    `"${p.email.replace(/"/g, '""')}"`,
    p.gender === 'male' ? '男' : '女',
    p.dominantHand === 'left' ? '左手' : '右手',
    p.level,
    `"${p.tierName}"`,
    p.assessmentMode === 'quiz' ? '教練問卷' : '官方直選',
    `"${(p.notes || '').replace(/"/g, '""')}"`,
    `"${p.submittedAt}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `羽球比賽選手自評總表_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
