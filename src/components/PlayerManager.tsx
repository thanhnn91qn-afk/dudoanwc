"use client";

import { useMemo, useState } from "react";
import type { AppData, Player } from "@/lib/types";
import { scoreboard } from "@/lib/scoring";
import { deletePlayerRemote } from "@/lib/dataSource";
import { IconCheck, IconX, IconUsers, IconTrash } from "./Icons";

interface Props {
  data: AppData;
  actorName: string | null;
  onRefresh: () => Promise<void> | void;
  currentPlayerId: string | null;
}

export default function PlayerManager({
  data,
  actorName,
  onRefresh,
  currentPlayerId,
}: Props) {
  const [filter, setFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<
    { type: "ok" | "err"; msg: string } | null
  >(null);

  const board = useMemo(() => scoreboard(data), [data]);

  const stats = useMemo(() => {
    const map = new Map<
      string,
      { matchesPredicted: number; picksCorrect: number; picksWrong: number; picksMissed: number; totalPoints: number }
    >();
    for (const row of board) {
      map.set(row.player.id, {
        matchesPredicted: row.matchesPredicted,
        picksCorrect: row.picksCorrect,
        picksWrong: row.picksWrong,
        picksMissed: row.picksMissed,
        totalPoints: row.totalPoints,
      });
    }
    return map;
  }, [board]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return data.players;
    return data.players.filter((p) => p.name.toLowerCase().includes(q));
  }, [data.players, filter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
      setFeedback({ type: "ok", msg: "Đã đồng bộ từ server." });
    } catch (e) {
      setFeedback({
        type: "err",
        msg: `Làm mới thất bại: ${(e as Error).message ?? "lỗi không rõ"}`,
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (player: Player) => {
    if (player.id === currentPlayerId) {
      setFeedback({
        type: "err",
        msg: "Bạn đang đăng nhập với tài khoản này — hãy đăng xuất trước rồi quay lại xoá.",
      });
      setConfirmId(null);
      return;
    }
    const s = stats.get(player.id);
    const predCount = s?.matchesPredicted ?? 0;
    if (
      !window.confirm(
        `Xoá người chơi "${player.name}"?\n` +
          `Sẽ xoá luôn ${predCount} dự đoán của họ. Hành động này không thể hoàn tác.`,
      )
    ) {
      setConfirmId(null);
      return;
    }
    setBusyId(player.id);
    try {
      const { predictionsDeleted } = await deletePlayerRemote(actorName, player.id);
      // Luôn refetch từ server thay vì filter local — vì realtime đôi lúc
      // không bắn đủ nhanh với DELETE, dễ khiến danh sách vẫn hiển thị cũ.
      await onRefresh();
      setFeedback({
        type: "ok",
        msg: `Đã xoá "${player.name}"${predictionsDeleted > 0 ? ` và ${predictionsDeleted} dự đoán` : ""}.`,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[player-manager] delete failed", e);
      setFeedback({
        type: "err",
        msg: `Xoá thất bại: ${(e as Error).message ?? "lỗi không rõ"}`,
      });
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  };

  if (data.players.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-lg border border-[var(--border-medium)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-soft)] disabled:opacity-50"
          >
            {refreshing ? "Đang đồng bộ…" : "↻ Làm mới từ server"}
          </button>
        </div>
        <div className="card p-8 text-center text-sm text-[var(--text-muted)]">
          <IconUsers size={28} className="mx-auto mb-3 opacity-40" />
          Chưa có người chơi nào trên server.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="card-elevated p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-[var(--text-primary)]">
              Quản lý người chơi
            </div>
            <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
              Xoá những tài khoản bạn không muốn. Sẽ xoá luôn dự đoán của họ và ghi log.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="🔎 Lọc theo tên…"
              className="rounded-lg border border-[var(--border-medium)] bg-[var(--bg-input)] px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--pitch)]"
            />
            <div className="rounded-lg bg-[var(--bg-soft)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {filtered.length}/{data.players.length}
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Kéo lại danh sách người chơi từ server"
              className="rounded-lg border border-[var(--border-medium)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-soft)] disabled:opacity-50"
            >
              {refreshing ? "Đang đồng bộ…" : "↻ Làm mới"}
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
              feedback.type === "ok"
                ? "border-emerald-300/50 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                : "border-rose-300/50 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
            }`}
          >
            {feedback.type === "ok" ? <IconCheck size={12} /> : <IconX size={12} />}
            {feedback.msg}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {filtered.map((p) => {
          const s = stats.get(p.id);
          const isYou = p.id === currentPlayerId;
          const isBusy = busyId === p.id;
          return (
            <div
              key={p.id}
              className={`card flex items-center justify-between gap-3 p-3 ${
                isYou ? "ring-1 ring-[var(--pitch-line)]" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="truncate text-sm font-bold text-[var(--text-primary)]">
                    {p.name}
                  </div>
                  {isYou && (
                    <span className="rounded-md bg-[var(--pitch-soft)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--pitch)]">
                      BẠN
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[var(--text-muted)]">
                  <span>
                    Đoán:{" "}
                    <strong className="text-[var(--text-secondary)]">
                      {s?.matchesPredicted ?? 0}
                    </strong>
                  </span>
                  <span>
                    Đúng:{" "}
                    <strong className="text-pitch">
                      {s?.picksCorrect ?? 0}
                    </strong>
                  </span>
                  <span>
                    Sai:{" "}
                    <strong className="text-rose-500">
                      {s?.picksWrong ?? 0}
                    </strong>
                  </span>
                  <span>
                    Bỏ:{" "}
                    <strong className="text-[var(--text-secondary)]">
                      {s?.picksMissed ?? 0}
                    </strong>
                  </span>
                  <span>
                    Điểm:{" "}
                    <strong className="text-pitch">
                      {s?.totalPoints ?? 0}
                    </strong>
                  </span>
                </div>
              </div>

              {isYou ? (
                <span
                  className="shrink-0 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-soft)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-muted)]"
                  title="Đăng xuất trước rồi quay lại xoá"
                >
                  Đang đăng nhập
                </span>
              ) : confirmId === p.id ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleDelete(p)}
                    disabled={isBusy}
                    className="rounded-lg bg-rose-500 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition-all hover:bg-rose-400 active:scale-95 disabled:opacity-50"
                  >
                    {isBusy ? "Đang xoá…" : "Chắc chắn xoá"}
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    disabled={isBusy}
                    className="rounded-lg border border-[var(--border-soft)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]"
                  >
                    Huỷ
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setConfirmId(p.id);
                    setFeedback(null);
                  }}
                  disabled={isBusy}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-rose-300/60 bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 transition-all hover:bg-rose-100 active:scale-95 disabled:opacity-50 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                >
                  <IconTrash size={11} />
                  Xoá
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
