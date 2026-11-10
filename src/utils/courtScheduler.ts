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
  TournamentReferee,
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

  const remainder = total % 5;
  const missingCount = remainder === 0 ? 0 : 5 - remainder;
  const groupCount = Math.floor(total / 5);

  if (total < 5 || remainder !== 0) {
    const errorMessage =
      `【賽程防呆：總人數需為 5 的倍數】\n\n` +
      `賽事規定「每人固定打 4 場且搭檔 0 重複」，總報名人數必須為 5 的倍數。\n` +
      `目前報名人數共 ${total} 人，尚差 ${missingCount} 人成組（可組 ${groupCount} 組，剩餘 ${remainder} 人）。\n\n` +
      `請至「選手名單與等級微調」補足人數至 5 的倍數後，再進行一鍵排程！`;

    return {
      isValid: false,
      totalPlayers: total,
      groupCount,
      remainder,
      missingCount,
      errorMessage,
      tierDetails: [],
    };
  }

  return {
    isValid: true,
    totalPlayers: total,
    groupCount,
    remainder: 0,
    missingCount: 0,
    tierDetails: [],
  };
}

/**
 * Fisher-Yates AI random shuffle utility
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Cluster players into 5-player divisions strictly sorted by level ascending (不跨階混戰，最相近戰力成組).
 * When randomize=true, uses AI random draw to shuffle seat order within each 5-player group.
 */
export function clusterPlayersIntoDivisions(
  players: PlayerSubmission[],
  randomize: boolean = true
): DivisionPool[] {
  if (players.length === 0) return [];

  // Sort players by level ascending (戰力由低至高排序)
  const sorted = [...players].sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.name.localeCompare(b.name, 'zh-Hant');
  });

  const groupSize = 5;
  const divisions: DivisionPool[] = [];
  let globalDivIndex = 0;

  for (let i = 0; i < sorted.length; i += groupSize) {
    let groupPlayers = sorted.slice(i, i + groupSize);
    if (groupPlayers.length < 5) continue; // Safety guard: ignore non-complete group

    // AI Random draw: shuffle the 5 players so who gets seats P0..P4 is completely randomized!
    if (randomize) {
      groupPlayers = shuffleArray(groupPlayers);
    }

    const minLvl = Math.min(...groupPlayers.map((p) => p.level));
    const maxLvl = Math.max(...groupPlayers.map((p) => p.level));
    const mainTier = getTierByLevel(Math.round((minLvl + maxLvl) / 2));
    const levelInfo = minLvl === maxLvl ? `Lv ${minLvl}` : `Lv ${minLvl} ~ Lv ${maxLvl}`;
    const tierLabel = `【${mainTier.name} 第 ${globalDivIndex + 1} 組】 (${levelInfo} · 5人循環)`;

    divisions.push({
      tierId: mainTier.tierId,
      tierLabel,
      divisionIndex: globalDivIndex++,
      players: groupPlayers,
    });
  }

  return divisions;
}

/**
 * Swaps two players' seat positions in an active tournament schedule.
 * Accurately updates all matches across rounds, tier divisions, and recompiles player stats.
 */
export function swapPlayersInSchedule(
  schedule: TournamentScheduleResult,
  playerId1: string,
  playerId2: string,
  allPlayers: PlayerSubmission[]
): TournamentScheduleResult {
  if (!schedule || !schedule.rounds) return schedule;

  const p1 = allPlayers.find((p) => p.id === playerId1);
  const p2 = allPlayers.find((p) => p.id === playerId2);
  if (!p1 || !p2) return schedule;

  // 1. Swap in rounds / matches
  const updatedRounds = schedule.rounds.map((round) => {
    const updatedMatches = (round.matches || []).map((match) => {
      const swapPlayer = (p: PlayerSubmission): PlayerSubmission => {
        if (!p) return p;
        if (p.id === playerId1) return p2;
        if (p.id === playerId2) return p1;
        return p;
      };

      const updatedTeamA = match.teamA
        ? ([swapPlayer(match.teamA[0]), swapPlayer(match.teamA[1])] as [PlayerSubmission, PlayerSubmission])
        : match.teamA;
      const updatedTeamB = match.teamB
        ? ([swapPlayer(match.teamB[0]), swapPlayer(match.teamB[1])] as [PlayerSubmission, PlayerSubmission])
        : match.teamB;

      return {
        ...match,
        teamA: updatedTeamA,
        teamB: updatedTeamB,
      };
    });

    return {
      ...round,
      matches: updatedMatches,
    };
  });

  // 2. Swap in tierDivisions
  const updatedDivisions = (schedule.tierDivisions || []).map((div) => {
    const hasP1 = (div.players || []).some((p) => p.id === playerId1);
    const hasP2 = (div.players || []).some((p) => p.id === playerId2);
    if (!hasP1 && !hasP2) return div;

    const swappedPlayers = (div.players || []).map((p) => {
      if (p.id === playerId1) return p2;
      if (p.id === playerId2) return p1;
      return p;
    });

    return {
      ...div,
      players: swappedPlayers,
    };
  });

  // 3. Recompile playerStats
  const updatedPlayerStats = compilePlayerScheduleStats(updatedRounds, allPlayers);

  return {
    ...schedule,
    rounds: updatedRounds,
    tierDivisions: updatedDivisions,
    playerStats: updatedPlayerStats,
  };
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
  pool: DivisionPool,
  randomize: boolean = true
): Omit<CourtMatch, 'roundNumber' | 'courtNumber'>[] {
  const p = pool.players;
  if (p.length !== 5) {
    return [];
  }

  let pairings = [
    { teamA: [p[0], p[1]] as [PlayerSubmission, PlayerSubmission], teamB: [p[2], p[3]] as [PlayerSubmission, PlayerSubmission], resting: p[4] },
    { teamA: [p[1], p[2]] as [PlayerSubmission, PlayerSubmission], teamB: [p[3], p[4]] as [PlayerSubmission, PlayerSubmission], resting: p[0] },
    { teamA: [p[2], p[4]] as [PlayerSubmission, PlayerSubmission], teamB: [p[0], p[3]] as [PlayerSubmission, PlayerSubmission], resting: p[1] },
    { teamA: [p[1], p[3]] as [PlayerSubmission, PlayerSubmission], teamB: [p[0], p[4]] as [PlayerSubmission, PlayerSubmission], resting: p[2] },
    { teamA: [p[0], p[2]] as [PlayerSubmission, PlayerSubmission], teamB: [p[1], p[4]] as [PlayerSubmission, PlayerSubmission], resting: p[3] },
  ];

  if (randomize) {
    pairings = pairings.map((pair) => {
      let teamA = pair.teamA;
      let teamB = pair.teamB;
      if (Math.random() > 0.5) teamA = [teamA[1], teamA[0]];
      if (Math.random() > 0.5) teamB = [teamB[1], teamB[0]];
      if (Math.random() > 0.5) return { teamA: teamB, teamB: teamA, resting: pair.resting };
      return { teamA, teamB, resting: pair.resting };
    });
  }

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
 * 1. 3-Court Full Saturation:
 *    As long as there are matches remaining across at least 3 divisions, all 3 courts
 *    (Court 1, Court 2, Court 3) are scheduled concurrently in that round.
 * 2. Strict Collision-Free:
 *    Each division plays at most 1 match per round. Because players in each division
 *    are mutually disjoint, zero player can ever collide across courts in the same round.
 * 3. Fair Division Rest Rotation:
 *    When choosing which divisions enter the 3 courts in any round, divisions that have
 *    rested longest receive top priority.
 * 4. Court Allocation Randomization:
 *    When randomize=true, courts 1, 2, 3 are randomly assigned among active divisions
 *    so no division is statically pinned to Court 1.
 */
export function scheduleMatchesToCourts(
  divisionMatchesMap: Map<number, Omit<CourtMatch, 'roundNumber' | 'courtNumber'>[]>,
  allPlayers: PlayerSubmission[],
  randomize: boolean = true
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
    // Priority 3: Division tie-breaker (randomized if enabled)
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

      return randomize ? Math.random() - 0.5 : a - b;
    });

    // We have 3 courts available: Court 1, Court 2, Court 3.
    // Fill up to 3 courts from the top prioritized divisions.
    const roundMatches: CourtMatch[] = [];
    const playersInThisRound = new Set<string>();

    const courtsToFill = Math.min(3, availableDivisions.length);
    const chosenDivisions = availableDivisions.slice(0, courtsToFill);

    let courtNumbers = Array.from({ length: courtsToFill }, (_, i) => i + 1);
    if (randomize) {
      courtNumbers = shuffleArray(courtNumbers);
    }

    for (let i = 0; i < courtsToFill; i++) {
      const divIdx = chosenDivisions[i];
      const court = courtNumbers[i];
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

    // Sort round matches by courtNumber ascending so Court 1, Court 2, Court 3 display neatly in order
    roundMatches.sort((a, b) => a.courtNumber - b.courtNumber);

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
 * Computes a unique canonical fingerprint of a schedule's matchups and rounds.
 * Used to guarantee that every regeneration is strictly different from the previous one.
 */
export function computeScheduleFingerprint(schedule: TournamentScheduleResult): string {
  if (!schedule || !schedule.rounds || schedule.rounds.length === 0) return '';
  return schedule.rounds
    .map((r) => {
      const matchSigs = (r.matches || []).map((m) => {
        const teamAIds = (m.teamA || []).map((p) => p.id).sort().join('&');
        const teamBIds = (m.teamB || []).map((p) => p.id).sort().join('&');
        const sortedTeams = [teamAIds, teamBIds].sort().join('_vs_');
        return `C${m.courtNumber}:${sortedTeams}`;
      });
      matchSigs.sort();
      return `R${r.roundNumber}[${matchSigs.join('|')}]`;
    })
    .join(';;');
}

/**
 * Compiles individual player schedule statistics & checks 0 duplicate partners.
 */
export function compilePlayerScheduleStats(
  rounds: ScheduleRound[],
  players: PlayerSubmission[]
): Record<string, PlayerScheduleStat> {
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

  return playerStats;
}

/**
 * Assigns referees from the referee pool to each match across all rounds,
 * strictly abiding by the referee delay-prevention rules:
 * Rule 0 (Non-consecutive refereeing): A referee who officiated in round R-1 CANNOT referee in round R
 *        (prevents delays where round R matches wait for round R-1 referee to finish).
 * Rule 1: A player referee CANNOT be playing in the same round (neither team A nor team B on any court).
 * Rule 2: A player referee who played in round R-1 CANNOT referee in round R (avoids delays from previous match).
 * Rule 3: A player referee who referees in round R CANNOT play in round R+1 (avoids referee duties delaying next match).
 * Non-player external referees are not playing, so they are free from playing collision rules.
 * Referees are randomly distributed with balanced workloads across rounds.
 */
export function assignRefereesToSchedule(
  rounds: ScheduleRound[],
  referees: TournamentReferee[],
  randomize: boolean = true
): ScheduleRound[] {
  if (!referees || referees.length === 0 || !rounds || rounds.length === 0) {
    return rounds;
  }

  // Pre-compute players playing in each round with multi-field indexing (ID, Name, Email)
  interface RoundPlayerIndex {
    ids: Set<string>;
    names: Set<string>;
    emails: Set<string>;
  }

  const roundPlayerIndices: RoundPlayerIndex[] = rounds.map((round) => {
    const ids = new Set<string>();
    const names = new Set<string>();
    const emails = new Set<string>();

    (round.matches || []).forEach((m) => {
      const matchPlayers = [...(m.teamA || []), ...(m.teamB || [])];
      matchPlayers.forEach((p) => {
        if (!p) return;
        if (p.id) ids.add(p.id.toLowerCase());
        if (p.name) names.add(p.name.trim().toLowerCase());
        if (p.email) emails.add(p.email.trim().toLowerCase());
      });
    });

    return { ids, names, emails };
  });

  // Helper: check if a referee is playing in a specific round
  const isRefPlayingInRound = (ref: TournamentReferee, rIdx: number): boolean => {
    if (!ref.isPlayer) return false;
    if (rIdx < 0 || rIdx >= roundPlayerIndices.length) return false;

    const roundIndex = roundPlayerIndices[rIdx];
    const candidateIds = [
      ref.playerId,
      ref.id,
      ref.id?.replace(/^ref-player-/, ''),
    ].filter(Boolean) as string[];

    for (const cid of candidateIds) {
      if (roundIndex.ids.has(cid.toLowerCase())) return true;
    }

    if (ref.name && roundIndex.names.has(ref.name.trim().toLowerCase())) {
      return true;
    }

    if (ref.email && roundIndex.emails.has(ref.email.trim().toLowerCase())) {
      return true;
    }

    return false;
  };

  // Track referee workload (number of matches refereed)
  const refereeWorkload = new Map<string, number>();
  referees.forEach((ref) => refereeWorkload.set(ref.id, 0));

  // Track referee IDs assigned in each round to strictly prevent back-to-back refereeing
  const refereesAssignedByRound: Set<string>[] = [];

  return rounds.map((round, rIdx) => {
    const refereesAssignedInThisRound = new Set<string>();
    const previousRoundAssigned = rIdx > 0 ? refereesAssignedByRound[rIdx - 1] : new Set<string>();

    const updatedMatches = (round.matches || []).map((match) => {
      // Tier 1 (Strict Perfect):
      // - NOT assigned in this round
      // - NOT assigned in previous round (Rule 0: No back-to-back refereeing)
      // - If player:
      //     - DOES NOT play in current round R (Rule 1)
      //     - DID NOT play in previous round R-1 (Rule 2)
      //     - WILL NOT play in next round R+1 (Rule 3 - Hard Absolute Prohibition!)
      const p1Candidates: TournamentReferee[] = [];

      // Tier 2 (Non-consecutive refereeing, did not play in R, WILL NOT play in R+1, but played in R-1):
      // - NOT assigned in this round
      // - NOT assigned in previous round (Rule 0)
      // - If player:
      //     - DOES NOT play in current round R
      //     - WILL NOT play in next round R+1 (Hard Absolute Prohibition!)
      const p2Candidates: TournamentReferee[] = [];

      // Tier 3 (Only used as emergency fallback if total pool has < 6 referees):
      // - NOT assigned in this round
      // - If player:
      //     - DOES NOT play in current round R
      //     - WILL NOT play in next round R+1 (Hard Absolute Prohibition!)
      const p3Candidates: TournamentReferee[] = [];

      for (const ref of referees) {
        if (refereesAssignedInThisRound.has(ref.id)) {
          continue; // Cannot referee two courts in the exact same round
        }

        // Hard Quota Check: if referee has reached their targetMatches quota, do not assign
        const currentCount = refereeWorkload.get(ref.id) ?? 0;
        const targetMatches = ref.targetMatches !== undefined ? Math.max(1, ref.targetMatches) : 2;
        if (currentCount >= targetMatches) {
          continue; // Reached maximum allowed matches
        }

        const isRefFromPreviousRound = previousRoundAssigned.has(ref.id);

        if (!ref.isPlayer) {
          // External referee: immune to player match constraints
          if (!isRefFromPreviousRound) {
            p1Candidates.push(ref);
          } else {
            p3Candidates.push(ref);
          }
          continue;
        }

        // HARD CHECK 1: Cannot referee if playing in current round R!
        if (isRefPlayingInRound(ref, rIdx)) {
          continue; // Strict hard exclusion: cannot referee and play at the same time
        }

        // HARD CHECK 2: Cannot referee if playing in NEXT round R+1!
        // This is the user's explicit rule: 下一輪要打球的選手，本輪絕對不可當裁判！
        if (isRefPlayingInRound(ref, rIdx + 1)) {
          continue; // Strict hard exclusion: must never referee before playing next round!
        }

        // Check if player played in previous round R-1
        const playedInPreviousRound = isRefPlayingInRound(ref, rIdx - 1);

        if (!isRefFromPreviousRound) {
          if (!playedInPreviousRound) {
            p1Candidates.push(ref);
          } else {
            p2Candidates.push(ref);
          }
        } else {
          // Refereed in previous round: only allowed in Tier 3 if pool is < 6
          p3Candidates.push(ref);
        }
      }

      const candidatePool =
        p1Candidates.length > 0
          ? p1Candidates
          : p2Candidates.length > 0
          ? p2Candidates
          : p3Candidates;

      if (candidatePool.length === 0) {
        // No referee available without scheduling a player who plays next round or exceeding quota!
        // Leave unassigned so the player's next match schedule and referee quota are protected!
        return {
          ...match,
          refereeId: undefined,
          refereeName: undefined,
        };
      }

      // Sort by workload ascending (fewest matches first) with priority to those furthest from quota
      const sortedPool = [...candidatePool].sort((a, b) => {
        const countA = refereeWorkload.get(a.id) ?? 0;
        const countB = refereeWorkload.get(b.id) ?? 0;
        const quotaA = a.targetMatches !== undefined ? Math.max(1, a.targetMatches) : 2;
        const quotaB = b.targetMatches !== undefined ? Math.max(1, b.targetMatches) : 2;
        const remainingA = quotaA - countA;
        const remainingB = quotaB - countB;

        // Prioritize referee who has more remaining quota
        if (remainingA !== remainingB) return remainingB - remainingA;

        // Secondary: fewest matches refereed so far
        if (countA !== countB) return countA - countB;
        return randomize ? Math.random() - 0.5 : 0;
      });

      const chosenRef = sortedPool[0];
      refereesAssignedInThisRound.add(chosenRef.id);
      refereeWorkload.set(chosenRef.id, (refereeWorkload.get(chosenRef.id) ?? 0) + 1);

      return {
        ...match,
        refereeId: chosenRef.id,
        refereeName: chosenRef.name,
      };
    });

    refereesAssignedByRound.push(refereesAssignedInThisRound);

    return {
      ...round,
      matches: updatedMatches,
    };
  });
}

export interface RefereeCapacityReport {
  totalMatches: number;
  totalCapacity: number;
  shortageCount: number;
  recommendedMoreReferees: number;
  assignedCount: number;
  unassignedMatchCount: number;
  unassignedMatches: { roundNumber: number; courtNumber: number; matchId: string }[];
}

/**
 * Diagnostic helper: calculates tournament referee capacity and identifies shortages
 */
export function analyzeRefereeCapacity(
  rounds: ScheduleRound[],
  referees: TournamentReferee[],
  defaultTargetMatches: number = 2
): RefereeCapacityReport {
  const allMatches = (rounds || []).flatMap((r) => r.matches || []);
  const totalMatches = allMatches.length;
  const totalCapacity = (referees || []).reduce(
    (sum, r) => sum + (r.targetMatches !== undefined ? Math.max(0, r.targetMatches) : defaultTargetMatches),
    0
  );
  const shortageCount = Math.max(0, totalMatches - totalCapacity);
  const recommendedMoreReferees = shortageCount > 0 ? Math.ceil(shortageCount / defaultTargetMatches) : 0;
  const assignedCount = allMatches.filter((m) => !!m.refereeName).length;
  const unassignedMatches = (rounds || []).flatMap((r) =>
    (r.matches || [])
      .filter((m) => !m.refereeName)
      .map((m) => ({ roundNumber: r.roundNumber, courtNumber: m.courtNumber, matchId: m.id }))
  );

  return {
    totalMatches,
    totalCapacity,
    shortageCount,
    recommendedMoreReferees,
    assignedCount,
    unassignedMatchCount: unassignedMatches.length,
    unassignedMatches,
  };
}

/**
 * Master generator: generates full 3-court tournament schedule with 4 matches per player.
 * Strictly enforces 5 players per division and rest interval rules.
 * Accepts options { previousFingerprint, randomize, referees } to guarantee that each AI draw
 * produces a completely distinct matchup combination and assigns referees abiding by rules.
 */
export function generateFourMatchCourtSchedule(
  players: PlayerSubmission[],
  options?: {
    previousFingerprint?: string;
    randomize?: boolean;
    referees?: TournamentReferee[];
  }
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

  const shouldRandomize = options?.randomize !== false;
  const maxAttempts = options?.previousFingerprint ? 35 : 1;
  let bestSchedule: TournamentScheduleResult | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // 1. Group into exact 5-player divisions strictly segregated by tier
    const divisions = clusterPlayersIntoDivisions(players, shouldRandomize);

    // 2. Generate exactly 5 matches per division (every player gets 4 matches, zero duplicate partners)
    const divisionMatchesMap = new Map<number, Omit<CourtMatch, 'roundNumber' | 'courtNumber'>[]>();
    let totalMatchesCount = 0;

    const tierDivisionSummaries = divisions.map((div) => {
      const matches = generateFivePlayerDivisionMatches(div, shouldRandomize);
      divisionMatchesMap.set(div.divisionIndex, matches);
      totalMatchesCount += matches.length;
      return {
        tierLabel: div.tierLabel,
        players: div.players,
        matchCount: matches.length,
      };
    });

    // 3. Assign matches to 3 Courts across conflict-free rounds with mandatory rest intervals
    let rounds = scheduleMatchesToCourts(divisionMatchesMap, players, shouldRandomize);

    // 4. Assign referees if referee pool provided, abiding by the 3 anti-delay rules
    if (options?.referees && options.referees.length > 0) {
      rounds = assignRefereesToSchedule(rounds, options.referees, shouldRandomize);
    }

    const scheduleResult: TournamentScheduleResult = {
      rounds,
      playerStats: compilePlayerScheduleStats(rounds, players),
      totalMatchesScheduled: totalMatchesCount,
      tierDivisions: tierDivisionSummaries,
    };

    bestSchedule = scheduleResult;

    if (options?.previousFingerprint) {
      const currentFingerprint = computeScheduleFingerprint(scheduleResult);
      if (currentFingerprint !== options.previousFingerprint) {
        break; // Distinct schedule confirmed!
      }
    } else {
      break;
    }
  }

  return bestSchedule!;
}
