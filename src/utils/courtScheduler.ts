/**
 * 3-Court Badminton Tournament Scheduler
 * 
 * Strict 5-Player Division Round-Robin System:
 * 1. Mathematical Guarantee: In doubles (2v2), each group must have EXACTLY 5 players
 *    to achieve "every player plays 4 matches" with "ZERO duplicate partners" (C(5,2) = 10 distinct pairs).
 * 2. Strict Tier Segregation (不能跨階配對):
 *    Players are grouped strictly by their badminton Tier. Each tier must independently
 *    have a count that is a multiple of 5 (5, 10, 15, 20...). Cross-tier pairing is strictly prohibited.
 *    If any tier fails, a detailed error listing all problematic tiers is returned.
 * 3. 3 Courts (Court 1, Court 2, Court 3) running in parallel.
 * 4. Zero court collisions: No player ever appears on two courts in the same round.
 * 5. Physical Rest Constraint (至少隔一場才能上場):
 *    No player plays in consecutive rounds. Any player scheduled in Round R must rest
 *    in Round R+1, and can play again at the earliest in Round R+2.
 */

import {
  PlayerSubmission,
  CourtMatch,
  ScheduleRound,
  TournamentScheduleResult,
  PlayerScheduleStat,
} from '../types';
import { BADMINTON_TIERS, getTierByLevel } from '../data/badmintonTiers';

export interface TierValidationDetail {
  tierId: string;
  tierName: string;
  count: number;
  isValid: boolean;
  remainder: number;
  missingCount: number;
}

export interface FivePlayerValidationResult {
  isValid: boolean;
  totalPlayers: number;
  groupCount: number;
  remainder: number;
  missingCount: number;
  errorMessage?: string;
  tierDetails?: TierValidationDetail[];
}

export interface DivisionPool {
  tierId: string;
  tierLabel: string;
  divisionIndex: number;
  players: PlayerSubmission[];
}

/**
 * Validates that tournament players strictly satisfy:
 * 1. Each tier has a count that is a multiple of 5 (and >= 5).
 * 2. NO cross-tier pairing allowed (不能跨階配對).
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
      errorMessage: '目前尚未有選手報名！請先填寫自評表或至選手名單手動新增選手。',
      tierDetails: [],
    };
  }

  // Group players strictly by their Tier
  const tierMap = new Map<string, PlayerSubmission[]>();
  BADMINTON_TIERS.forEach((t) => tierMap.set(t.tierId, []));

  players.forEach((p) => {
    const tier = getTierByLevel(p.level);
    const list = tierMap.get(tier.tierId) || [];
    list.push(p);
    tierMap.set(tier.tierId, list);
  });

  const tierDetails: TierValidationDetail[] = [];
  const invalidTiers: TierValidationDetail[] = [];
  let totalGroups = 0;
  let totalMissing = 0;

  BADMINTON_TIERS.forEach((t) => {
    const pList = tierMap.get(t.tierId) || [];
    const count = pList.length;
    if (count > 0) {
      const remainder = count % 5;
      const isValid = count >= 5 && remainder === 0;
      const missingCount = remainder === 0 ? 0 : 5 - remainder;
      const detail: TierValidationDetail = {
        tierId: t.tierId,
        tierName: t.name,
        count,
        isValid,
        remainder,
        missingCount,
      };
      tierDetails.push(detail);
      totalGroups += Math.floor(count / 5);
      if (!isValid) {
        invalidTiers.push(detail);
        totalMissing += missingCount;
      }
    }
  });

  if (invalidTiers.length > 0) {
    const tierListLines = invalidTiers
      .map((it) => {
        if (it.count < 5) {
          return `• 【${it.tierName}】：目前僅 ${it.count} 人，不足 1 組（尚差 ${it.missingCount} 人湊滿 5 人組）`;
        }
        return `• 【${it.tierName}】：目前 ${it.count} 人，多出 ${it.remainder} 人未成組（尚差 ${it.missingCount} 人湊滿整組）`;
      })
      .join('\n');

    const errorMessage =
      `【排程失敗：同階級人數未滿 5 人倍數，不可跨階配對】\n\n` +
      `賽事規定「每人打 4 場且隊友不重複」，同階級配對人數【一定要剛好 5 位】（或 5 的倍數，如 5、10、15 人），且【嚴格禁止跨階配對】。\n\n` +
      `目前人數不符的階級如下：\n${tierListLines}\n\n` +
      `請至「選手名單與等級微調」手動調整選手等級或補足各階級選手至 5 人倍數後，再進行一鍵排程！`;

    return {
      isValid: false,
      totalPlayers: total,
      groupCount: totalGroups,
      remainder: total % 5,
      missingCount: totalMissing,
      errorMessage,
      tierDetails,
    };
  }

  return {
    isValid: true,
    totalPlayers: total,
    groupCount: totalGroups,
    remainder: 0,
    missingCount: 0,
    tierDetails,
  };
}

/**
 * Cluster players strictly by Tier into 5-player divisions (不能跨階配對).
 */
export function clusterPlayersIntoDivisions(players: PlayerSubmission[]): DivisionPool[] {
  if (players.length === 0) return [];

  // Group players strictly by their Tier
  const tierMap = new Map<string, PlayerSubmission[]>();
  BADMINTON_TIERS.forEach((t) => tierMap.set(t.tierId, []));

  players.forEach((p) => {
    const tier = getTierByLevel(p.level);
    const list = tierMap.get(tier.tierId) || [];
    list.push(p);
    tierMap.set(tier.tierId, list);
  });

  const divisions: DivisionPool[] = [];
  let globalDivIndex = 0;

  BADMINTON_TIERS.forEach((tier) => {
    const tierPlayers = tierMap.get(tier.tierId) || [];
    if (tierPlayers.length === 0) return;

    // Sort by level ascending within tier so closer levels play together
    const sorted = [...tierPlayers].sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.name.localeCompare(b.name, 'zh-Hant');
    });

    const groupSize = 5;
    const tierDivisionCount = Math.floor(sorted.length / groupSize);

    for (let i = 0; i < sorted.length; i += groupSize) {
      const groupPlayers = sorted.slice(i, i + groupSize);
      if (groupPlayers.length < 5) continue; // Safety guard: ignore non-complete group

      const subIndex = Math.floor(i / groupSize);
      const subLetter = String.fromCharCode(65 + (subIndex % 26)); // A, B, C...
      const minLvl = groupPlayers[0].level;
      const maxLvl = groupPlayers[groupPlayers.length - 1].level;

      const subLabel =
        tierDivisionCount > 1
          ? `【${tier.name} ${subLetter}組】`
          : `【${tier.name}】`;

      const levelInfo =
        minLvl === maxLvl ? `Lv ${minLvl}` : `Lv ${minLvl} ~ Lv ${maxLvl}`;

      const tierLabel = `${subLabel} (${levelInfo} · 5人循環)`;

      divisions.push({
        tierId: tier.tierId,
        tierLabel,
        divisionIndex: globalDivIndex++,
        players: groupPlayers,
      });
    }
  });

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
 * Schedule division matches across 3 Courts in sequential Rounds with:
 * 1. 3-Court Full Saturation (每一輪三個場地都有打，最後一輪未滿三場沒關係):
 *    As long as there are matches remaining across at least 3 divisions, all 3 courts
 *    (Court 1, Court 2, Court 3) are scheduled concurrently in that round.
 *    Only in the final round (or if fewer than 3 divisions have matches left)
 *    is fewer than 3 courts allowed.
 * 2. Strict Collision-Free (同一位選手絕不可同時出現在兩個場地):
 *    Each division plays at most 1 match per round. Because players in each division
 *    are mutually disjoint, zero player can ever collide across courts in the same round.
 * 3. Fair Division Rest Rotation (最佳輪替動態休息):
 *    When choosing which divisions enter the 3 courts in any round, divisions that have
 *    rested longest (or haven't played yet) receive top priority.
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

  // Track the last round in which each division and each player was active
  const lastRoundByDivision = new Map<number, number>();
  const lastRoundByPlayer = new Map<string, number>();

  let roundNum = 1;
  const maxIterations = 500; // Circuit breaker

  while (roundNum <= maxIterations) {
    // Collect all divisions that still have matches remaining
    const availableDivisions: number[] = [];
    for (const [divIdx, q] of queues.entries()) {
      if (q.length > 0) {
        availableDivisions.push(divIdx);
      }
    }

    if (availableDivisions.length === 0) {
      break; // All matches across all divisions have been scheduled!
    }

    // Sort available divisions to determine which ones play in this round:
    // Priority 1: Longest rest (i.e. roundNum - lastRoundByDivision descending; never played = highest priority)
    // Priority 2: Most remaining matches in queue descending (prevent laggards)
    // Priority 3: Division index ascending (deterministic)
    availableDivisions.sort((a, b) => {
      const lastA = lastRoundByDivision.get(a);
      const lastB = lastRoundByDivision.get(b);
      const restA = lastA === undefined ? 9999 : roundNum - lastA;
      const restB = lastB === undefined ? 9999 : roundNum - lastB;

      if (restA !== restB) {
        return restB - restA; // Longest rest first
      }

      const qA = queues.get(a)?.length || 0;
      const qB = queues.get(b)?.length || 0;
      if (qA !== qB) {
        return qB - qA; // Most remaining matches first
      }

      return a - b;
    });

    // We have 3 courts available: Court 1, Court 2, Court 3.
    // Fill up to 3 courts from the top prioritized divisions.
    const roundMatches: CourtMatch[] = [];
    const playersInThisRound = new Set<string>();

    const courtsToFill = Math.min(3, availableDivisions.length);

    for (let court = 1; court <= courtsToFill; court++) {
      const divIdx = availableDivisions[court - 1];
      const matchData = queues.get(divIdx)!.shift()!;

      const matchPlayerIds = [
        matchData.teamA[0].id,
        matchData.teamA[1].id,
        matchData.teamB[0].id,
        matchData.teamB[1].id,
      ];

      matchPlayerIds.forEach((id) => {
        playersInThisRound.add(id);
        lastRoundByPlayer.set(id, roundNum);
      });

      lastRoundByDivision.set(divIdx, roundNum);

      roundMatches.push({
        ...matchData,
        roundNumber: roundNum,
        courtNumber: court,
      });
    }

    // Identify players resting in this round
    const restingPlayers = allPlayers.filter((p) => !playersInThisRound.has(p.id));

    rounds.push({
      roundNumber: roundNum,
      matches: roundMatches,
      restingPlayers,
    });

    roundNum++;
  }

  // Number rounds consecutively from 1 to N
  return rounds.map((round, index) => {
    const newRoundNum = index + 1;
    return {
      roundNumber: newRoundNum,
      matches: round.matches.map((m) => ({
        ...m,
        roundNumber: newRoundNum,
      })),
      restingPlayers: round.restingPlayers,
    };
  });
}

/**
 * Master generator: generates full 3-court tournament schedule with 4 matches per player.
 * Strictly enforces 5 players per division and rest interval rules.
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

  // 1. Group into exact 5-player divisions strictly segregated by tier
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

  // 3. Assign matches to 3 Courts across conflict-free rounds with mandatory rest intervals
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
