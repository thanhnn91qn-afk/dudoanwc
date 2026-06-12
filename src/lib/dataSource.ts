import type {
  AppData,
  MatchPrediction,
  MatchResult,
  Player,
  PlayerPredictions,
} from "./types";
import { supabase } from "./supabase";

export const emptyAppData: AppData = {
  players: [],
  results: {},
  currentPlayerId: null,
};

const LS_CURRENT_PLAYER = "dudoanwc2026:currentPlayerId";

export function getLocalCurrentPlayerId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LS_CURRENT_PLAYER);
  } catch {
    return null;
  }
}

export function setLocalCurrentPlayerId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(LS_CURRENT_PLAYER, id);
    else window.localStorage.removeItem(LS_CURRENT_PLAYER);
  } catch {}
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_\-]/g, "")
    .slice(0, 40) || `p_${Date.now()}`;
}

async function loadAll(): Promise<{
  players: Player[];
  results: Record<string, MatchResult>;
}> {
  if (!supabase) {
    return { players: [], results: {} };
  }
  const [playersRes, predsRes, resultsRes] = await Promise.all([
    supabase.from("wc_players").select("id, name, created_at, updated_at"),
    supabase.from("wc_predictions").select("player_id, match_id, pick, predicted_at"),
    supabase.from("wc_results").select(
      "match_id, winner, score_home, score_away, finalized_at",
    ),
  ]);

  if (playersRes.error) throw playersRes.error;
  if (predsRes.error) throw predsRes.error;
  if (resultsRes.error) throw resultsRes.error;

  const playersMap = new Map<string, Player>();
  for (const row of playersRes.data ?? []) {
    playersMap.set(row.id, {
      id: row.id,
      name: row.name,
      predictions: {},
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
    });
  }
  for (const row of predsRes.data ?? []) {
    const p = playersMap.get(row.player_id);
    if (!p) continue;
    p.predictions[row.match_id] = {
      pick: row.pick as MatchPrediction["pick"],
      predictedAt: new Date(row.predicted_at).getTime(),
    };
  }

  const results: Record<string, MatchResult> = {};
  for (const r of resultsRes.data ?? []) {
    results[r.match_id] = {
      winner: r.winner as MatchResult["winner"],
      scoreHome: r.score_home,
      scoreAway: r.score_away,
      finalizedAt: new Date(r.finalized_at).getTime(),
    };
  }

  return {
    players: Array.from(playersMap.values()),
    results,
  };
}

export interface AuditEntry {
  id: number;
  actorName: string | null;
  action: string;
  targetKind: "player" | "prediction" | "result" | "system";
  targetId: string | null;
  details: Record<string, unknown> | null;
  createdAt: number;
}

const ACTION_LABELS: Record<string, string> = {
  "player.create": "🆕 Tạo người chơi",
  "player.login": "🔑 Đăng nhập",
  "prediction.create": "🎯 Đặt dự đoán",
  "prediction.update": "✏️ Sửa dự đoán",
  "prediction.delete": "🗑️ Xoá dự đoán",
  "result.set": "✅ Chốt kết quả",
  "result.update": "✏️ Sửa kết quả",
  "result.delete": "🗑️ Huỷ kết quả",
  "system.reset": "♻️ Xoá toàn bộ dữ liệu",
  "system.fill_groups": "🧪 Tự điền vòng bảng",
  "system.fill_all": "🧪 Tự điền cả giải",
};

export function labelForAction(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

async function logAudit(
  actorName: string | null,
  action: string,
  targetKind: AuditEntry["targetKind"],
  targetId: string | null,
  details?: Record<string, unknown>,
): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from("wc_audit_log").insert({
      actor_name: actorName,
      action,
      target_kind: targetKind,
      target_id: targetId,
      details: details ?? null,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[audit] log failed", e);
  }
}

export async function fetchAuditLog(limit = 500): Promise<AuditEntry[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("wc_audit_log")
    .select("id, actor_name, action, target_kind, target_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    actorName: r.actor_name,
    action: r.action,
    targetKind: r.target_kind,
    targetId: r.target_id,
    details: (r.details as Record<string, unknown> | null) ?? null,
    createdAt: new Date(r.created_at).getTime(),
  }));
}

export async function fetchData(): Promise<AppData> {
  const { players, results } = await loadAll();
  // currentPlayerId is per-browser, lưu trong localStorage
  const localId = getLocalCurrentPlayerId();
  const currentPlayerId =
    localId && players.some((p) => p.id === localId) ? localId : null;
  return { players, results, currentPlayerId };
}

export function findPlayerByName(data: AppData, name: string): Player | undefined {
  const target = name.trim().toLowerCase();
  return data.players.find((p) => p.name.trim().toLowerCase() === target);
}

export async function loginOrCreate(
  data: AppData,
  name: string,
): Promise<{ data: AppData; player: Player; created: boolean }> {
  if (!supabase) {
    return { data, player: data.players[0] ?? ({} as Player), created: false };
  }
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Tên không được trống");
  const existing = findPlayerByName(data, trimmed);
  if (existing) {
    setLocalCurrentPlayerId(existing.id);
    void logAudit(trimmed, "player.login", "player", existing.id);
    return { data: { ...data, currentPlayerId: existing.id }, player: existing, created: false };
  }
  const id = slugify(trimmed);
  const { data: row, error } = await supabase
    .from("wc_players")
    .upsert({ id, name: trimmed }, { onConflict: "id" })
    .select("id, name, created_at, updated_at")
    .single();
  if (error) throw error;
  const player: Player = {
    id: row.id,
    name: row.name,
    predictions: {},
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
  setLocalCurrentPlayerId(player.id);
  void logAudit(trimmed, "player.create", "player", player.id, { name: trimmed });
  return {
    data: {
      ...data,
      players: [...data.players, player],
      currentPlayerId: player.id,
    },
    player,
    created: true,
  };
}

export async function updatePredictionRemote(
  actorName: string | null,
  playerId: string,
  matchId: string,
  prediction: MatchPrediction | null,
  previousPick: MatchPrediction["pick"] | null,
): Promise<void> {
  if (!supabase) return;
  if (prediction === null) {
    const { error } = await supabase
      .from("wc_predictions")
      .delete()
      .eq("player_id", playerId)
      .eq("match_id", matchId);
    if (error) throw error;
    void logAudit(actorName, "prediction.delete", "prediction", `${playerId}:${matchId}`, {
      playerId,
      matchId,
      previousPick,
    });
  } else {
    const isUpdate = previousPick !== null;
    const { error } = await supabase.from("wc_predictions").upsert(
      {
        player_id: playerId,
        match_id: matchId,
        pick: prediction.pick,
        predicted_at: new Date(prediction.predictedAt).toISOString(),
      },
      { onConflict: "player_id,match_id" },
    );
    if (error) throw error;
    void logAudit(
      actorName,
      isUpdate ? "prediction.update" : "prediction.create",
      "prediction",
      `${playerId}:${matchId}`,
      {
        playerId,
        matchId,
        pick: prediction.pick,
        previousPick,
      },
    );
  }
}

export async function setResultRemote(
  actorName: string | null,
  matchId: string,
  result: MatchResult | null,
  previousResult: MatchResult | null,
): Promise<void> {
  if (!supabase) return;
  if (result === null) {
    const { error } = await supabase
      .from("wc_results")
      .delete()
      .eq("match_id", matchId);
    if (error) throw error;
    void logAudit(actorName, "result.delete", "result", matchId, {
      matchId,
      previousResult,
    });
  } else {
    const isUpdate = previousResult !== null;
    const { error } = await supabase.from("wc_results").upsert(
      {
        match_id: matchId,
        winner: result.winner,
        score_home: result.scoreHome,
        score_away: result.scoreAway,
        finalized_at: new Date(result.finalizedAt).toISOString(),
      },
      { onConflict: "match_id" },
    );
    if (error) throw error;
    void logAudit(
      actorName,
      isUpdate ? "result.update" : "result.set",
      "result",
      matchId,
      {
        matchId,
        result: { winner: result.winner, scoreHome: result.scoreHome, scoreAway: result.scoreAway },
        previousResult,
      },
    );
  }
}

export async function resetAllRemote(actorName: string | null): Promise<void> {
  if (!supabase) return;
  await supabase.from("wc_predictions").delete().neq("id", 0);
  await supabase.from("wc_results").delete().neq("match_id", "");
  await supabase.from("wc_players").delete().neq("id", "");
  setLocalCurrentPlayerId(null);
  void logAudit(actorName, "system.reset", "system", null);
}

export function subscribeRealtime(
  onChange: (data: AppData) => void,
): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel("wc-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "wc_players" },
      () => void refresh(onChange),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "wc_predictions" },
      () => void refresh(onChange),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "wc_results" },
      () => void refresh(onChange),
    )
    .subscribe();
  return () => {
    if (supabase) void supabase.removeChannel(channel);
  };
}

async function refresh(onChange: (data: AppData) => void) {
  try {
    const { players, results } = await loadAll();
    const localId = getLocalCurrentPlayerId();
    const currentPlayerId =
      localId && players.some((p) => p.id === localId) ? localId : null;
    onChange({ players, results, currentPlayerId });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[realtime] refresh failed", e);
  }
}
