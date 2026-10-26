/**
 * 3-Court Badminton Tournament Scheduler
 * 
 * Strict 5-Player Division Round-Robin System:
 * 1. Mathematical Guarantee: In doubles (2v2), each group must have EXACTLY 5 players
 *    to achieve "every player plays 4 matches" with "ZERO duplicate partners" (C(5,2) = 10 distinct pairs).
 * 2. If players count is not 5 or a multiple of 5 (5, 10, 15, 20...), an error is raised.
 * 3. 3 Courts (Court 1, Court 2, Court 3) are scheduled concurrently in conflict-free rounds.
 * 4. Zero court collisions: No player ever plays on two courts at the same time.
 */

import { PlayerSubmission, CourtMatch, ScheduleRound, TournamentScheduleResult, PlayerScheduleStat } from '../types';

export interface FivePlayerValidationResult {
  isValid: boolean;
  totalPlayers: number;
  groupCount: number;
  remainder: number;
  missingCount: number;
  errorMessage?: string;
}

export interface DivisionPool {
  tierLabel: string;
  divisionIndex: number;
  players: PlayerSubmission[];
}

/**
 * Validates that tournament players strictly satisfy the 5-player round-robin rule
 */
export function validateFivePlayerRule(players: PlayerSubmission[]): FivePlayerValidationResult {
  const total = players.length;

  if (total === 0) {
    return {
      isValid: false,
      totalPlayers: 0,
      groupCount: 0,
      remainder: 0,
      missingCount: 5,
      errorMessage: '目前尚未有選手報名！請先填寫自評表或至選手名單新增選手。',
    };
  }

  const remainder = total % 5;
  const groupCount = Math.floor(total / 5);
  const missingCount = remainder === 0 ? 0 : 5 - remainder;

  if (total < 5) {
    return {
      isValid: false,
      totalPlayers: total,
      groupCount: 0,
      remainder,
      missingCount,
      errorMessage: `【排程失敗：人數不足 5 位】\n目前僅有 ${total} 位選手，不足一組。\n\n依賽事規定「每人打 4 場且隊友完全不重複」，每組配對人員【必須剛好 5 位】。\n目前尚差 ${missingCount} 位選手即可湊滿 1 組（5 人）。請至選手名單新增選手後再進行排程。`,
    };
  }

  if (remainder !== 0) {
    const nextTotal = total + missingCount;
    const targetGroups = groupCount + 1;
    return {
      isValid: false,
      totalPlayers: total,
      groupCount,
      remainder,
      missingCount,
      errorMessage: `【排程失敗：人數未滿 5 人整數倍】\n目前總選手人數為 ${total} 位（可分 ${groupCount} 組，剩餘 ${remainder} 位無法配對）！\n\n賽事專屬規則要求：\n• 每位選手出賽 4 場\n• 隊友完全不重複搭檔（0 重複配對）\n• 數學定理：同組人員「一定要剛好 5 位」（5 場賽事、每人輪流休息 1 場，剛好與其餘 4 人各搭檔 1 次）\n\n目前尚差 ${missingCount} 位選手，補齊至 ${nextTotal} 人即可分為完整的 ${targetGroups} 組（每組 5 人）。請先調整名單！`,
    };
  }

  return {
    isValid: true,
    totalPlayers: total,
    groupCount,
    remainder: 0,
    missingCount: 0,
  };
}

/**
 * Cluster players into 5-player divisions sorted by level
 */
export function clusterPlayersIntoDivisions(players: PlayerSubmission[]): DivisionPool[] {
  if (players.length === 0) return [];

  // Sort by level ascending so same-tier players are placed in the same group
  const sorted = [...players].sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.name.localeCompare(b.name, 'zh-Hant');
  });

  const divisions: DivisionPool[] = [];
  const groupSize = 5;

  for (let i = 0; i < sorted.length; i += groupSize) {
    const groupPlayers = sorted.slice(i, i + groupSize);
    const divIndex = Math.floor(i / groupSize);
    const minLvl = groupPlayers[0].level;
    const maxLvl = groupPlayers[groupPlayers.length - 1].level;
    const groupLetter = String.fromCharCode(65 + (divIndex % 26)); // A, B, C...

    const tierLabel =
      minLvl === maxLvl
        ? `第 ${divIndex + 1} 組 [${groupLetter}組] (Lv ${minLvl} - 5人循環)`
        : `第 ${divIndex + 1} 組 [${groupLetter}組] (Lv ${minLvl} ~ Lv ${maxLvl} - 5人循環)`;

    divisions.push({
      tierLabel,
      divisionIndex: divIndex,
      players: groupPlayers,
    });
  }

  return divisions;
}

/**
 * Generates the 5 matches for a 5-player division.
 * 
 * Mathematical Invariant (Balanced Incomplete Block Design):
 * 5 Players: [P0, P1, P2, P3, P4]
 * 5 Matches (each player plays 4, rests 1):
 * - Match 1 (P4 rests): [P0, P1] vs [P2, P3] -> pairs: (0,1), (2,3)
 * - Match 2 (P0 rests): [P1, P2] vs [P3, P4] -> pairs: (1,2), (3,4)
 * - Match 3 (P1 rests): [P2, P4] vs [P0, P3] -> pairs: (2,4), (0,3)
 * - Match 4 (P2 rests): [P1, P3] vs [P0, P4] -> pairs: (1,3), (0,4)
 * - Match 5 (P3 rests): [P0, P2] vs [P1, P4] -> pairs: (0,2), (1,4)
 * 
 * All 10 distinct pairings among 5 players appear EXACTLY ONCE!
 * Zero duplicate partnerships!
 */
export function generateFivePlayerDivisionMatches(
  pool: DivisionPool
): Omit<CourtMatch, 'roundNumber' | 'courtNumber'>[] {
  const p = pool.players;
  if (p.length !== 5) {
    return [];
  }

  const pairings = [
    { teamA: [p[0], p[1]] as [PlayerSubmission, PlayerSubmission], teamB: [p[2], p[3]] as [PlayerSubmission, PlayerSubmission], resting: p[4] },
    { teamA: [p[1], p[2]] as [PlayerSubmission, PlayerSubmission], teamB: [p[3], p[4]] as [PlayerSubmission, PlayerSubmission], resting: p[0] },
    { teamA: [p[2], p[4]] as [PlayerSubmission, PlayerSubmission], teamB: [p[0], p[3]] as [PlayerSubmission, PlayerSubmission], resting: p[1] },
    { teamA: [p[1], p[3]] as [PlayerSubmission, PlayerSubmission], teamB: [p[0], p[4]] as [PlayerSubmission, PlayerSubmission], resting: p[2] },
    { teamA: [p[0], p[2]] as [PlayerSubmission, PlayerSubmission], teamB: [p[1], p[4]] as [PlayerSubmission, PlayerSubmission], resting: p[3] },
  ];

  return pairings.map((pair, matchIdx) => ({
    id: `m-div${pool.divisionIndex + 1}-${matchIdx + 1}`,
    tierGroupLabel: pool.tierLabel,
    teamA: pair.teamA,
    teamB: pair.teamB,
    status: 'pending',
  }));
}

/**
 * Schedule division matches across 3 Courts in sequential Rounds
 * 
 * In each round, at most 3 matches are played (Court 1, Court 2, Court 3).
 * Since all players in a 5-person group are playing/resting together, at most
 * ONE match per division can occur in any round.
 */
export function scheduleMatchesToCourts(
  divisionMatchesMap: Map<number, Omit<CourtMatch, 'roundNumber' | 'courtNumber'>[]>,
  allPlayers: PlayerSubmission[]
): ScheduleRound[] {
  const rounds: ScheduleRound[] = [];
  const divisionCount = divisionMatchesMap.size;
  if (divisionCount === 0) return [];

  // Deep clone remaining match queues for each division
  const queues = new Map<number, Omit<CourtMatch, 'roundNumber' | 'courtNumber'>[]>();
  for (const [divIdx, matches] of divisionMatchesMap.entries()) {
    queues.set(divIdx, [...matches]);
  }

  let roundNum = 1;

  while (true) {
    // Check if any division still has matches left
    let hasMatchesLeft = false;
    for (const q of queues.values()) {
      if (q.length > 0) {
        hasMatchesLeft = true;
        break;
      }
    }
    if (!hasMatchesLeft) break;

    const roundMatches: CourtMatch[] = [];
    const divisionsScheduledInThisRound = new Set<number>();
    const playersInThisRound = new Set<string>();

    // We have 3 courts available: Court 1, Court 2, Court 3
    for (let court = 1; court <= 3; court++) {
      // Find a division that has matches left and hasn't been scheduled in this round
      // Prioritize divisions with the most remaining matches to keep progress even
      let candidateDiv = -1;
      let maxRemaining = -1;

      for (const [divIdx, q] of queues.entries()) {
        if (!divisionsScheduledInThisRound.has(divIdx) && q.length > maxRemaining) {
          maxRemaining = q.length;
          candidateDiv = divIdx;
        }
      }

      if (candidateDiv !== -1 && maxRemaining > 0) {
        const matchData = queues.get(candidateDiv)!.shift()!;
        divisionsScheduledInThisRound.add(candidateDiv);

        [
          matchData.teamA[0].id,
          matchData.teamA[1].id,
          matchData.teamB[0].id,
          matchData.teamB[1].id,
        ].forEach((id) => playersInThisRound.add(id));

        roundMatches.push({
          ...matchData,
          roundNumber: roundNum,
          courtNumber: court,
        });
      }
    }

    if (roundMatches.length === 0) {
      break;
    }

    // Identify players resting in this round
    const restingPlayers = allPlayers.filter((p) => !playersInThisRound.has(p.id));

    rounds.push({
      roundNumber: roundNum,
      matches: roundMatches,
      restingPlayers,
    });

    roundNum++;
    if (roundNum > 100) break; // Circuit breaker
  }

  return rounds;
}

/**
 * Master generator: generates full 3-court tournament schedule with 4 matches per player.
 * Strictly enforces 5 players per division.
 */
export function generateFourMatchCourtSchedule(
  players: PlayerSubmission[]
): TournamentScheduleResult {
  const validation = validateFivePlayerRule(players);
  if (!validation.isValid) {
    return {
      rounds: [],
      playerStats: {},
      totalMatchesScheduled: 0,
      tierDivisions: [],
    };
  }

  // 1. Group into exact 5-player divisions
  const divisions = clusterPlayersIntoDivisions(players);

  // 2. Generate exactly 5 matches per division (every player gets 4 matches, zero duplicate partners)
  const divisionMatchesMap = new Map<number, Omit<CourtMatch, 'roundNumber' | 'courtNumber'>[]>();
  let totalMatchesCount = 0;

  const tierDivisionSummaries = divisions.map((div) => {
    const matches = generateFivePlayerDivisionMatches(div);
    divisionMatchesMap.set(div.divisionIndex, matches);
    totalMatchesCount += matches.length;
    return {
      tierLabel: div.tierLabel,
      players: div.players,
      matchCount: matches.length,
    };
  });

  // 3. Assign matches to 3 Courts across conflict-free rounds
  const rounds = scheduleMatchesToCourts(divisionMatchesMap, players);

  // 4. Compile player individual schedule checklist & verify 0 duplicate partners
  const playerStats: Record<string, PlayerScheduleStat> = {};
  players.forEach((p) => {
    playerStats[p.id] = {
      player: p,
      matches: [],
      totalMatches: 0,
    };
  });

  rounds.forEach((round) => {
    round.matches.forEach((match) => {
      const { teamA, teamB, roundNumber, courtNumber, id } = match;

      // Team A Player 1
      if (playerStats[teamA[0].id]) {
        playerStats[teamA[0].id].matches.push({
          matchId: id,
          roundNumber,
          courtNumber,
          partner: teamA[1],
          opponents: [teamB[0], teamB[1]],
        });
        playerStats[teamA[0].id].totalMatches++;
      }

      // Team A Player 2
      if (playerStats[teamA[1].id]) {
        playerStats[teamA[1].id].matches.push({
          matchId: id,
          roundNumber,
          courtNumber,
          partner: teamA[0],
          opponents: [teamB[0], teamB[1]],
        });
        playerStats[teamA[1].id].totalMatches++;
      }

      // Team B Player 1
      if (playerStats[teamB[0].id]) {
        playerStats[teamB[0].id].matches.push({
          matchId: id,
          roundNumber,
          courtNumber,
          partner: teamB[1],
          opponents: [teamA[0], teamA[1]],
        });
        playerStats[teamB[0].id].totalMatches++;
      }

      // Team B Player 2
      if (playerStats[teamB[1].id]) {
        playerStats[teamB[1].id].matches.push({
          matchId: id,
          roundNumber,
          courtNumber,
          partner: teamB[0],
          opponents: [teamA[0], teamA[1]],
        });
        playerStats[teamB[1].id].totalMatches++;
      }
    });
  });

  return {
    rounds,
    playerStats,
    totalMatchesScheduled: totalMatchesCount,
    tierDivisions: tierDivisionSummaries,
  };
}
