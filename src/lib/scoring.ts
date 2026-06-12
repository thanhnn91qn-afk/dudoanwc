import type { AppData, Match, Player } from "./types";

export interface PlayerScore {
  player: Player;
  picksCorrect: number;
  picksWrong: number;
  picksMissed: number;
  totalPoints: number;
  matchesPredicted: number;
  matchesScored: number;
}

export function computeScore(player: Player, results: AppData["results"]): PlayerScore {
  let picksCorrect = 0;
  let picksWrong = 0;
  let picksMissed = 0;
  let totalPoints = 0;
  let matchesPredicted = 0;
  let matchesScored = 0;
  for (const matchId of Object.keys(player.predictions)) {
    matchesPredicted += 1;
    const result = results[matchId];
    if (!result) continue;
    matchesScored += 1;
    const prediction = player.predictions[matchId];
    if (prediction.pick === result.winner) {
      picksCorrect += 1;
      totalPoints += 1;
    } else {
      picksWrong += 1;
    }
  }
  // Mỗi trận đã có kết quả mà chưa vote → tính như sai (0 điểm)
  for (const matchId of Object.keys(results)) {
    if (!(matchId in player.predictions)) {
      picksMissed += 1;
    }
  }
  return {
    player,
    picksCorrect,
    picksWrong,
    picksMissed,
    totalPoints,
    matchesPredicted,
    matchesScored,
  };
}

export function scoreboard(data: AppData): PlayerScore[] {
  return data.players
    .map((p) => computeScore(p, data.results))
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.picksCorrect !== a.picksCorrect) return b.picksCorrect - a.picksCorrect;
      if (a.picksWrong !== b.picksWrong) return a.picksWrong - b.picksWrong;
      if (a.picksMissed !== b.picksMissed) return a.picksMissed - b.picksMissed;
      return a.player.name.localeCompare(b.player.name);
    });
}

export interface MatchPredictionTally {
  home: number;
  draw: number;
  away: number;
  total: number;
}

export function tallyMatch(match: Match, data: AppData): MatchPredictionTally {
  const tally: MatchPredictionTally = {
    home: 0,
    draw: 0,
    away: 0,
    total: 0,
  };
  for (const p of data.players) {
    const pred = p.predictions[match.id];
    if (!pred) continue;
    tally[pred.pick] += 1;
    tally.total += 1;
  }
  return tally;
}
