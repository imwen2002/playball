export type Gender = 'male' | 'female';
export type AssessmentMode = 'quiz' | 'direct';

export interface TierInfo {
  tierId: string;
  name: string; // e.g. 超新手階, 新手階, 初階, 初中階, 中階, 中進階, 高階, 職業級
  levels: number[];
  experience: string; // e.g. 球齡一年內
  colorClass: {
    bg: string;
    border: string;
    text: string;
    badge: string;
  };
  levelDescriptions: Record<number, string>;
}

export interface UserAccount {
  email: string;
  name: string;
  avatar?: string;
  isSignedIn: boolean;
}

export interface QuizQuestion {
  id: string;
  title: string;
  coachNote: string;
  iconName: string;
  options: {
    label: string;
    description: string;
    scoreLevel: number; // Suggested badminton level 0-18
  }[];
}

export interface PlayerSubmission {
  id: string;
  email: string;
  name: string;
  gender: Gender;
  dominantHand: 'right' | 'left';
  level: number; // 0 - 18
  tierName: string;
  assessmentMode: AssessmentMode;
  quizAnswers?: Record<string, number>;
  notes?: string;
  submittedAt: string;
  updatedAt?: string;
}

export interface TeamPair {
  id: string;
  teamName: string;
  player1: PlayerSubmission;
  player2: PlayerSubmission;
  totalScore: number;
  avgScore: number;
}

export interface TournamentGroup {
  id: string;
  groupName: string;
  divisionLabel: string;
  color: string;
  teams: TeamPair[];
  singlePlayers?: PlayerSubmission[];
}

export interface CourtMatch {
  id: string;
  roundNumber: number;
  courtNumber: number; // 1, 2, 3
  tierGroupLabel: string;
  teamA: [PlayerSubmission, PlayerSubmission];
  teamB: [PlayerSubmission, PlayerSubmission];
  scoreA?: number;
  scoreB?: number;
  status?: 'pending' | 'playing' | 'completed';
}

export interface ScheduleRound {
  roundNumber: number;
  matches: CourtMatch[];
  restingPlayers: PlayerSubmission[];
}

export interface PlayerScheduleStat {
  player: PlayerSubmission;
  matches: {
    matchId: string;
    roundNumber: number;
    courtNumber: number;
    partner: PlayerSubmission;
    opponents: [PlayerSubmission, PlayerSubmission];
  }[];
  totalMatches: number;
}

export interface TournamentScheduleResult {
  rounds: ScheduleRound[];
  playerStats: Record<string, PlayerScheduleStat>;
  totalMatchesScheduled: number;
  tierDivisions: {
    tierLabel: string;
    players: PlayerSubmission[];
    matchCount: number;
  }[];
}
