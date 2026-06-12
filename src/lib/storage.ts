import type { AppData, MatchPrediction, Player, PlayerPredictions } from "./types";

const STORAGE_KEY = "dudoanwc2026:v1";

export const emptyAppData: AppData = {
  players: [],
  results: {},
  currentPlayerId: null,
};

export function loadData(): AppData {
  if (typeof window === "undefined") return emptyAppData;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyAppData;
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      players: Array.isArray(parsed.players) ? parsed.players : [],
      results: parsed.results && typeof parsed.results === "object" ? parsed.results : {},
      currentPlayerId:
        typeof parsed.currentPlayerId === "string" ? parsed.currentPlayerId : null,
    };
  } catch {
    return emptyAppData;
  }
}

export function saveData(data: AppData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function findPlayerByName(data: AppData, name: string): Player | undefined {
  const target = normalizeName(name);
  return data.players.find((p) => normalizeName(p.name) === target);
}

export function upsertPlayer(data: AppData, name: string): { data: AppData; player: Player; created: boolean } {
  const existing = findPlayerByName(data, name);
  if (existing) {
    const next: AppData = { ...data, currentPlayerId: existing.id };
    return { data: next, player: existing, created: false };
  }
  const player: Player = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    predictions: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const next: AppData = {
    ...data,
    players: [...data.players, player],
    currentPlayerId: player.id,
  };
  return { data: next, player, created: true };
}

export function setCurrentPlayer(data: AppData, playerId: string | null): AppData {
  return { ...data, currentPlayerId: playerId };
}

export function updatePrediction(
  data: AppData,
  playerId: string,
  matchId: string,
  prediction: MatchPrediction | null,
): AppData {
  const players = data.players.map((p) => {
    if (p.id !== playerId) return p;
    const nextPreds: PlayerPredictions = { ...p.predictions };
    if (prediction === null) {
      delete nextPreds[matchId];
    } else {
      nextPreds[matchId] = prediction;
    }
    return { ...p, predictions: nextPreds, updatedAt: Date.now() };
  });
  return { ...data, players };
}

export function setResult(
  data: AppData,
  matchId: string,
  result: AppData["results"][string] | null,
): AppData {
  const results = { ...data.results };
  if (result === null) {
    delete results[matchId];
  } else {
    results[matchId] = result;
  }
  return { ...data, results };
}

export function resetAll(): AppData {
  return { ...emptyAppData };
}
