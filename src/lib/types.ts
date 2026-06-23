export type GroupId = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L";

export type KnockoutStage = "R32" | "R16" | "QF" | "SF" | "F";

export const STAGE_LABEL: Record<KnockoutStage, string> = {
  R32: "Vòng 1/16 (32 đội)",
  R16: "Vòng 1/8 (16 đội)",
  QF: "Tứ kết",
  SF: "Bán kết",
  F: "Chung kết",
};

export interface TeamInfo {
  flag: string;
  confederation: string;
  group: GroupId;
}

export interface Match {
  id: string;
  matchday: number;
  /** ISO 8601 với timezone +07:00 (giờ VN), ví dụ "2026-06-12T02:00:00+07:00" */
  kickoffVN: string;
  /** Cũ: còn lại cho tương thích với dữ liệu cũ (chỉ phần date YYYY-MM-DD) */
  date?: string;
  home: string;
  away: string;
  venue: string;
  city: string;
  scoreHome: number | null;
  scoreAway: number | null;
  winner: "home" | "away" | "draw" | null;
}

export interface GroupData {
  id: GroupId;
  teams: string[];
  matches: Match[];
  standings: Record<
    string,
    {
      played: number;
      won: number;
      drawn: number;
      lost: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDiff: number;
      points: number;
    }
  >;
}

export interface Tournament {
  tournament: string;
  year: number;
  hosts: string[];
  dates: { start: string; end: string };
  format: {
    teamsTotal: number;
    groups: number;
    teamsPerGroup: number;
    matchesPerGroup: number;
    advanceRules: string;
  };
  teams: Record<string, TeamInfo>;
  groups: GroupData[];
  knockout?: KnockoutRound[];
}

export interface KnockoutMatch {
  id: string;
  stage: KnockoutStage;
  matchday: number;
  date: string; // ISO với timezone hoặc date YYYY-MM-DD
  home?: string | null; // tên đội (sẽ được resolve sau khi vòng trước xong) hoặc seed
  away?: string | null;
  homeSeed?: string; // mô tả nguồn (vd "1A", "2B", "W R32-1")
  awaySeed?: string;
  venue: string;
  city: string;
  scoreHome: number | null;
  scoreAway: number | null;
  winner: "home" | "away" | "draw" | null;
}

export interface KnockoutRound {
  stage: KnockoutStage;
  label: string;
  matches: KnockoutMatch[];
}

export type Pick = "home" | "away" | "draw";

export interface MatchPrediction {
  pick: Pick;
  predictedAt: number;
}

export interface PlayerPredictions {
  // key: matchId
  [matchId: string]: MatchPrediction;
}

export interface Player {
  id: string;
  name: string;
  predictions: PlayerPredictions;
  createdAt: number;
  updatedAt: number;
}

export interface MatchResult {
  winner: "home" | "away" | "draw";
  scoreHome: number;
  scoreAway: number;
  finalizedAt: number;
}

export interface AppData {
  players: Player[];
  results: Record<string, MatchResult>;
  currentPlayerId: string | null;
}
