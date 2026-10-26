/**
 * 3-Court Badminton Tournament Scheduler
 * 
 * Rules:
 * 1. Players grouped by similar level / tier (同等級分組).
 * 2. Each player plays exactly 4 matches (每人固定打四場輪迴賽).
 * 3. 3 Courts scheduled in sequential Rounds (場地 1, 場地 2, 場地 3).
 * 4. Strict conflict prevention: no player plays on two courts in the same round (同輪次不撞場).
 * 5. Minimizes duplicate partnerships and duplicate opponents (盡量不重複交手與搭檔).
 */

import { PlayerSubmission, CourtMatch, ScheduleRound, TournamentScheduleResult, PlayerScheduleStat } from '../types';

interface DivisionPool {
  tierLabel: string;
  players: PlayerSubmission[];
}

/**
 * Cluster players into balanced same-level divisions
 * Divides into groups of 4 to 8 players of similar levels
 */
export function clusterPlayersIntoDivisions(players: PlayerSubmission[]): DivisionPool[] {
  if (players.length < 4) {
    return [
      {
        tierLabel: '綜合分組 (人數不足4人)',
        players: [...players],
      },
    ];
  }

  // Sort by level ascending
  const sorted = [...players].sort((a, b) => a.level - b.level);
  const divisions: DivisionPool[] = [];

  const total = sorted.length;

  // If between 4 and 9 players, keep as 1 division
  if (total <= 8) {
    const minLvl = sorted[0].level;
    const maxLvl = sorted[total - 1].level;
    const label = minLvl === maxLvl ? `同級組 (Lv ${minLvl})` : `同級循環組 (Lv ${minLvl} ~ Lv ${maxLvl})`;
    return [{ tierLabel: label, players: sorted }];
  }

  // If 9 or more, cluster into groups of ideally 5 to 7 players
  let i = 0;
  while (i < total) {
    const remaining = total - i;
    // Determine current division size
    let size = 6;
    if (remaining <= 8) {
      size = remaining; // take all remaining if <= 8
    } else if (remaining === 9) {
      size = 5; // leave 4 for next
    } else if (remaining === 10) {
      size = 5; // 5 + 5
    } else if (remaining === 11) {
      size = 6; // 6 + 5
    }

    const groupPlayers = sorted.slice(i, i + size);
    const minLvl = groupPlayers[0].level;
    const maxLvl = groupPlayers[groupPlayers.length - 1].level;
    const label = minLvl === maxLvl 
      ? `同級組 (Lv ${minLvl})` 
      : `同級組 (Lv ${minLvl} ~ Lv ${maxLvl})`;

    divisions.push({
      tierLabel: label,
      players: groupPlayers,
    });
    i += size;
  }

  return divisions;
}

/**
 * Generate division matches where every player plays exactly targetMatches (4 matches)
 */
function generateMatchesForDivision(
  pool: DivisionPool,
  divIndex: number,
  targetMatches: number = 4
): Omit<CourtMatch, 'roundNumber' | 'courtNumber'>[] {
  const players = pool.players;
  const n = players.length;
  if (n < 4) return [];

  // Total matches required so that each player has exactly targetMatches:
  // totalPlayerSlots = n * targetMatches. Each match needs 4 player slots.
  const totalMatchesCount = Math.round((n * targetMatches) / 4);

  const playerMatchCount = new Map<string, number>();
  players.forEach((p) => playerMatchCount.set(p.id, 0));

  // Partner counts & Opponent counts
  const partnerCount = new Map<string, Map<string, number>>();
  const opponentCount = new Map<string, Map<string, number>>();

  players.forEach((p1) => {
    partnerCount.set(p1.id, new Map());
    opponentCount.set(p1.id, new Map());
    players.forEach((p2) => {
      partnerCount.get(p1.id)!.set(p2.id, 0);
      opponentCount.get(p1.id)!.set(p2.id, 0);
    });
  });

  const getPartnerCount = (id1: string, id2: string) => partnerCount.get(id1)?.get(id2) || 0;
  const getOpponentCount = (id1: string, id2: string) => opponentCount.get(id1)?.get(id2) || 0;

  const matches: Omit<CourtMatch, 'roundNumber' | 'courtNumber'>[] = [];

  for (let m = 0; m < totalMatchesCount; m++) {
    // Pick 4 players who currently have played the least matches
    const candidates = [...players]
      .filter((p) => (playerMatchCount.get(p.id) || 0) < targetMatches)
      .sort((a, b) => {
        const countDiff = (playerMatchCount.get(a.id) || 0) - (playerMatchCount.get(b.id) || 0);
        if (countDiff !== 0) return countDiff;
        // Break ties with randomized or stable sort
        return a.id.localeCompare(b.id);
      });

    // If less than 4 players still need matches, borrow from those who played targetMatches
    let chosen: PlayerSubmission[] = [];
    if (candidates.length >= 4) {
      chosen = candidates.slice(0, 4);
    } else {
      chosen = [...candidates];
      const others = [...players]
        .filter((p) => !chosen.some((c) => c.id === p.id))
        .sort((a, b) => (playerMatchCount.get(a.id) || 0) - (playerMatchCount.get(b.id) || 0));
      while (chosen.length < 4 && others.length > 0) {
        chosen.push(others.shift()!);
      }
    }

    if (chosen.length < 4) break;

    // Now find the best partition of chosen 4 into Team A [c0, c1] and Team B [c2, c3]
    // 3 possible pairings for 4 players:
    // Partition 1: (0, 1) vs (2, 3)
    // Partition 2: (0, 2) vs (1, 3)
    // Partition 3: (0, 3) vs (1, 2)
    const permutations = [
      { a: [chosen[0], chosen[1]], b: [chosen[2], chosen[3]] },
      { a: [chosen[0], chosen[2]], b: [chosen[1], chosen[3]] },
      { a: [chosen[0], chosen[3]], b: [chosen[1], chosen[2]] },
    ];

    let bestPerm = permutations[0];
    let minScore = Infinity;

    for (const perm of permutations) {
      const [p1, p2] = perm.a;
      const [p3, p4] = perm.b;

      // Duplicate partner penalty
      const partnerPenalty =
        getPartnerCount(p1.id, p2.id) * 10 +
        getPartnerCount(p3.id, p4.id) * 10;

      // Duplicate opponent penalty
      const opponentPenalty =
        getOpponentCount(p1.id, p3.id) * 3 +
        getOpponentCount(p1.id, p4.id) * 3 +
        getOpponentCount(p2.id, p3.id) * 3 +
        getOpponentCount(p2.id, p4.id) * 3;

      // Level balance penalty (Team A avg vs Team B avg)
      const diffLvl = Math.abs((p1.level + p2.level) - (p3.level + p4.level));

      const totalScore = partnerPenalty + opponentPenalty + diffLvl;
      if (totalScore < minScore) {
        minScore = totalScore;
        bestPerm = perm;
      }
    }

    const [t1, t2] = bestPerm.a;
    const [t3, t4] = bestPerm.b;

    // Update counts
    [t1, t2, t3, t4].forEach((p) => {
      playerMatchCount.set(p.id, (playerMatchCount.get(p.id) || 0) + 1);
    });

    // Update partner counts
    partnerCount.get(t1.id)!.set(t2.id, getPartnerCount(t1.id, t2.id) + 1);
    partnerCount.get(t2.id)!.set(t1.id, getPartnerCount(t2.id, t1.id) + 1);
    partnerCount.get(t3.id)!.set(t4.id, getPartnerCount(t3.id, t4.id) + 1);
    partnerCount.get(t4.id)!.set(t3.id, getPartnerCount(t4.id, t3.id) + 1);

    // Update opponent counts
    const updateOpp = (idA: string, idB: string) => {
      opponentCount.get(idA)!.set(idB, getOpponentCount(idA, idB) + 1);
      opponentCount.get(idB)!.set(idA, getOpponentCount(idB, idA) + 1);
    };
    updateOpp(t1.id, t3.id);
    updateOpp(t1.id, t4.id);
    updateOpp(t2.id, t3.id);
    updateOpp(t2.id, t4.id);

    matches.push({
      id: `match-d${divIndex}-${m + 1}`,
      tierGroupLabel: pool.tierLabel,
      teamA: [t1, t2],
      teamB: [t3, t4],
      status: 'pending',
    });
  }

  return matches;
}

/**
 * Schedule all generated matches into consecutive rounds across 3 Courts (Court 1, 2, 3)
 * Guarantees NO player plays simultaneously on two courts in the same round!
 */
export function scheduleMatchesToCourts(
  allMatches: Omit<CourtMatch, 'roundNumber' | 'courtNumber'>[],
  allPlayers: PlayerSubmission[]
): ScheduleRound[] {
  const remainingMatches = [...allMatches];
  const rounds: ScheduleRound[] = [];
  let roundNum = 1;

  while (remainingMatches.length > 0) {
    const roundMatches: CourtMatch[] = [];
    const playersInThisRound = new Set<string>();

    // We have 3 courts available per round: Court 1, Court 2, Court 3
    for (let court = 1; court <= 3; court++) {
      if (remainingMatches.length === 0) break;

      // Find the first match whose 4 players are NOT currently playing in this round
      const candidateIndex = remainingMatches.findIndex((m) => {
        const playerIds = [m.teamA[0].id, m.teamA[1].id, m.teamB[0].id, m.teamB[1].id];
        return playerIds.every((id) => !playersInThisRound.has(id));
      });

      if (candidateIndex >= 0) {
        const matchData = remainingMatches.splice(candidateIndex, 1)[0];
        const assignedMatch: CourtMatch = {
          ...matchData,
          roundNumber: roundNum,
          courtNumber: court,
        };

        [
          matchData.teamA[0].id,
          matchData.teamA[1].id,
          matchData.teamB[0].id,
          matchData.teamB[1].id,
        ].forEach((id) => playersInThisRound.add(id));

        roundMatches.push(assignedMatch);
      }
    }

    // Identify players who are resting this round
    const resting = allPlayers.filter((p) => !playersInThisRound.has(p.id));

    rounds.push({
      roundNumber: roundNum,
      matches: roundMatches,
      restingPlayers: resting,
    });

    roundNum++;

    // Safety brake to avoid infinite loop
    if (roundNum > 100) break;
  }

  return rounds;
}

/**
 * Master generator: generates full 3-court tournament schedule with 4 matches per player
 */
export function generateFourMatchCourtSchedule(
  players: PlayerSubmission[]
): TournamentScheduleResult {
  if (players.length < 4) {
    return {
      rounds: [],
      playerStats: {},
      totalMatchesScheduled: 0,
      tierDivisions: [],
    };
  }

  // 1. Group into same-level divisions
  const divisions = clusterPlayersIntoDivisions(players);

  // 2. Generate exactly 4 matches per player within each division
  const unassignedMatches: Omit<CourtMatch, 'roundNumber' | 'courtNumber'>[] = [];
  const tierDivisionSummaries: {
    tierLabel: string;
    players: PlayerSubmission[];
    matchCount: number;
  }[] = [];

  divisions.forEach((div, idx) => {
    const matches = generateMatchesForDivision(div, idx, 4);
    unassignedMatches.push(...matches);
    tierDivisionSummaries.push({
      tierLabel: div.tierLabel,
      players: div.players,
      matchCount: matches.length,
    });
  });

  // 3. Assign matches to 3 Courts across conflict-free Rounds
  const rounds = scheduleMatchesToCourts(unassignedMatches, players);

  // 4. Compile player individual schedule checklist
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
      playerStats[teamA[0].id]?.matches.push({
        matchId: id,
        roundNumber,
        courtNumber,
        partner: teamA[1],
        opponents: [teamB[0], teamB[1]],
      });
      if (playerStats[teamA[0].id]) playerStats[teamA[0].id].totalMatches++;

      // Team A Player 2
      playerStats[teamA[1].id]?.matches.push({
        matchId: id,
        roundNumber,
        courtNumber,
        partner: teamA[0],
        opponents: [teamB[0], teamB[1]],
      });
      if (playerStats[teamA[1].id]) playerStats[teamA[1].id].totalMatches++;

      // Team B Player 1
      playerStats[teamB[0].id]?.matches.push({
        matchId: id,
        roundNumber,
        courtNumber,
        partner: teamB[1],
        opponents: [teamA[0], teamA[1]],
      });
      if (playerStats[teamB[0].id]) playerStats[teamB[0].id].totalMatches++;

      // Team B Player 2
      playerStats[teamB[1].id]?.matches.push({
        matchId: id,
        roundNumber,
        courtNumber,
        partner: teamB[0],
        opponents: [teamA[0], teamA[1]],
      });
      if (playerStats[teamB[1].id]) playerStats[teamB[1].id].totalMatches++;
    });
  });

  return {
    rounds,
    playerStats,
    totalMatchesScheduled: unassignedMatches.length,
    tierDivisions: tierDivisionSummaries,
  };
}
