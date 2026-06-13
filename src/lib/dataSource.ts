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
  "player.delete": "🗑️ Xoá người chơi",
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

export interface DeletePlayerResult {
  playerName: string;
  predictionsDeleted: number;
  /** true nếu sau khi xoá, row thật sự biến mất khỏi DB (false = bị RLS chặn) */
  verified: boolean;
  /** Lỗi nếu có, để hiển thị lên UI */
  warning: string | null;
}

/**
 * Xoá 1 người chơi khỏi server (xoá cả dự đoán của họ, log audit).
 * Nếu người chơi đang là current player trong trình duyệt này thì đăng xuất luôn.
 *
 * Sau khi xoá, hàm re-read lại DB để xác nhận row đã biến mất thật. Nếu RLS
 * chặn DELETE ngầm, Supabase trả `error: null` + `data: []` nên phải verify
 * mới biết — nếu không, UI sẽ tưởng xoá thành công nhưng DB vẫn còn.
 */
export async function deletePlayerRemote(
  actorName: string | null,
  playerId: string,
): Promise<DeletePlayerResult> {
  if (!supabase) {
    throw new Error("Chưa cấu hình Supabase");
  }
  // 1. Lấy thông tin player trước khi xoá (để log + trả về tên)
  const { data: playerRow, error: fetchErr } = await supabase
    .from("wc_players")
    .select("id, name")
    .eq("id", playerId)
    .single();
  if (fetchErr) throw fetchErr;
  const playerName: string = playerRow?.name ?? playerId;

  // 2. Đếm số dự đoán sẽ bị xoá (để hiển thị trong confirm + audit)
  const { count: predsCount, error: countErr } = await supabase
    .from("wc_predictions")
    .select("id", { count: "exact", head: true })
    .eq("player_id", playerId);
  if (countErr) throw countErr;
  const predictionsDeleted = predsCount ?? 0;

  // 3. Xoá predictions trước (FK không có cascade để chắc chắn)
  const { data: deletedPreds, error: predsErr } = await supabase
    .from("wc_predictions")
    .delete()
    .eq("player_id", playerId)
    .select("player_id, match_id");
  if (predsErr) throw predsErr;
  // eslint-disable-next-line no-console
  console.log(
    `[deletePlayer] xoá predictions: yêu cầu ${predictionsDeleted}, server trả ${deletedPreds?.length ?? 0}`,
  );

  // 4. Xoá player
  const { data: deletedPlayers, error: playerErr } = await supabase
    .from("wc_players")
    .delete()
    .eq("id", playerId)
    .select("id");
  if (playerErr) throw playerErr;
  // eslint-disable-next-line no-console
  console.log(
    `[deletePlayer] xoá player ${playerId}: server trả ${deletedPlayers?.length ?? 0} row`,
  );

  // 5. Verify: re-read lại DB để chắc chắn row thật sự biến mất.
  //    Nếu RLS chặn DELETE ngầm, Supabase trả deletedPlayers = [] mà không
  //    báo lỗi — bước này bắt được trường hợp đó.
  const { data: stillThere, error: verifyErr } = await supabase
    .from("wc_players")
    .select("id")
    .eq("id", playerId)
    .maybeSingle();
  if (verifyErr) throw verifyErr;

  const verified = stillThere === null;
  const warning = verified
    ? null
    : `Server báo xoá thành công nhưng vẫn thấy row trong DB. ` +
      `Khả năng cao do RLS policy chỉ cho phép SELECT/INSERT/UPDATE mà chặn DELETE ` +
      `(xem mục "RLS" trong README để sửa).`;

  if (!verified) {
    // eslint-disable-next-line no-console
    console.warn(`[deletePlayer] ❌ Verify FAILED: row vẫn còn`, stillThere);
  } else {
    // eslint-disable-next-line no-console
    console.log(`[deletePlayer] ✓ Verify OK: row đã biến mất`);
  }

  // 6. Nếu là current player trong trình duyệt này thì logout
  if (getLocalCurrentPlayerId() === playerId) {
    setLocalCurrentPlayerId(null);
  }

  // 7. Log audit
  void logAudit(actorName, "player.delete", "player", playerId, {
    playerId,
    playerName,
    predictionsDeleted,
    verified,
  });

  return { playerName, predictionsDeleted, verified, warning };
}

/**
 * Chẩn đoán RLS: thử select/insert/update/delete trên 1 bảng rồi trả về
 * kết quả từng thao tác. Dùng để debug khi nghi ngờ policy chặn quyền.
 */
export async function diagnoseRLS(): Promise<{
  players: { select: boolean; insert: boolean; delete: boolean; error: string };
  predictions: { select: boolean; insert: boolean; delete: boolean; error: string };
}> {
  if (!supabase) {
    return {
      players: { select: false, insert: false, delete: false, error: "no supabase" },
      predictions: { select: false, insert: false, delete: false, error: "no supabase" },
    };
  }
  // 1) SELECT
  const pSel = await supabase.from("wc_players").select("id").limit(1);
  const dSel = await supabase.from("wc_predictions").select("player_id").limit(1);

  // 2) INSERT thử 1 row tạm với id "__diag__" rồi xoá ngay
  const testId = `__diag_${Date.now()}`;
  const pIns = await supabase
    .from("wc_players")
    .insert({ id: testId, name: `__diag_${testId}` })
    .select("id");
  const pDel = await supabase.from("wc_players").delete().eq("id", testId).select("id");

  const dIns = await supabase
    .from("wc_predictions")
    .insert({ player_id: testId, match_id: "__diag__", pick: "home" })
    .select("player_id, match_id");
  const dDel = await supabase
    .from("wc_predictions")
    .delete()
    .eq("player_id", testId)
    .select("player_id, match_id");

  return {
    players: {
      select: !pSel.error && Array.isArray(pSel.data),
      insert: !pIns.error && Array.isArray(pIns.data) && pIns.data.length > 0,
      delete: !pDel.error && Array.isArray(pDel.data) && pDel.data.length > 0,
      error:
        (pSel.error?.message ?? "") +
        " | insert: " +
        (pIns.error?.message ?? "") +
        " | delete: " +
        (pDel.error?.message ?? ""),
    },
    predictions: {
      select: !dSel.error && Array.isArray(dSel.data),
      insert: !dIns.error && Array.isArray(dIns.data) && dIns.data.length > 0,
      delete: !dDel.error && Array.isArray(dDel.data) && dDel.data.length > 0,
      error:
        (dSel.error?.message ?? "") +
        " | insert: " +
        (dIns.error?.message ?? "") +
        " | delete: " +
        (dDel.error?.message ?? ""),
    },
  };
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
