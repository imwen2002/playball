export type Gender = 'male' | 'female';
export type AssessmentMode = 'quiz' | 'direct';

export interface TierInfo {
  tierId: string;
  name: string; // e.g. 新手階, 初階, 初中階, 中階, 中進階, 高階, 職業級
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
    scoreLevel: number; // Suggested badminton level 1-18
  }[];
}

export interface PlayerSubmission {
  id: string;
  email: string; // Locked, from Google Login
  name: string; // Participant's editable display name
  gender: Gender;
  dominantHand: 'right' | 'left';
  level: number; // 1 - 18
  tierName: string;
  assessmentMode: AssessmentMode;
  quizAnswers?: Record<string, number>;
  notes?: string; // 特殊需求或給主辦人的叮嚀
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
