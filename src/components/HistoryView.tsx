"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchAuditLog,
  labelForAction,
  type AuditEntry,
} from "@/lib/dataSource";
import { tournament } from "@/data/tournament";
import { getTeamInfo } from "@/data/tournament";
import { supabase } from "@/lib/supabase";
import type { AppData } from "@/lib/types";

const PREDICT_LABEL: Record<string, string> = {
  home: "Sân nhà thắng",
  away: "Sân khách thắng",
  draw: "Hoà",
};

const RESULT_LABEL: Record<string, string> = {
  home: "Sân nhà thắng",
  away: "Sân khách thắng",
  draw: "Hoà",
};

interface Props {
  data: AppData;
}

export default function HistoryView({ data }: Props) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | AuditEntry["targetKind"]>("all");
  const [query, setQuery] = useState("");

  const playerMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of data.players) m.set(p.id, p.name);
    return m;
  }, [data.players]);

  const matchMeta = useMemo(() => {
    const m = new Map<
      string,
      { label: string; isKnockout: boolean; home?: string; away?: string }
    >();
    for (const g of tournament.groups) {
      for (const mt of g.matches) {
        m.set(mt.id, {
          label: `Bảng ${g.id} · Match ${mt.id}`,
          isKnockout: false,
          home: mt.home,
          away: mt.away,
        });
      }
    }
    for (const r of tournament.knockout ?? []) {
      for (const mt of r.matches) {
        m.set(mt.id, {
          label: `${r.label} · Match ${mt.id}`,
          isKnockout: true,
        });
      }
    }
    return m;
  }, []);

  const refresh = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const list = await fetchAuditLog(500);
      setEntries(list);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[history] fetch failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  // Realtime: tự refresh khi có audit mới
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel("wc-audit-watch")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wc_audit_log" },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      if (supabase) void supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (filter !== "all" && e.targetKind !== filter) return false;
      if (!q) return true;
      const target = e.targetId?.toLowerCase() ?? "";
      const actor = e.actorName?.toLowerCase() ?? "";
      const action = e.action.toLowerCase();
      const details = JSON.stringify(e.details ?? {}).toLowerCase();
      return (
        target.includes(q) ||
        actor.includes(q) ||
        action.includes(q) ||
        details.includes(q)
      );
    });
  }, [entries, filter, query]);

  function describe(e: AuditEntry): React.ReactNode {
    const d = (e.details ?? {}) as Record<string, unknown>;
    switch (e.action) {
      case "player.create":
        return <>Người chơi mới: <strong>{String(d.name ?? e.targetId)}</strong></>;
      case "player.login":
        return <>Đăng nhập lại với tên <strong>{e.actorName ?? "?"}</strong></>;
      case "prediction.create":
      case "prediction.update": {
        const playerId = String(d.playerId ?? "");
        const matchId = String(d.matchId ?? "");
        const prev = d.previousPick as string | null | undefined;
        const next = d.pick as string | undefined;
        return (
          <>
            <strong>{playerMap.get(playerId) ?? playerId}</strong> dự đoán{" "}
            <strong>{matchMeta.get(matchId)?.label ?? matchId}</strong>:{" "}
            {prev && <span className="text-slate-400 line-through">{PREDICT_LABEL[prev] ?? prev}</span>}
            {prev && " → "}
            <strong className="text-emerald-600 dark:text-emerald-300">
              {PREDICT_LABEL[next ?? ""] ?? next ?? "?"}
            </strong>
          </>
        );
      }
      case "prediction.delete": {
        const playerId = String(d.playerId ?? "");
        const matchId = String(d.matchId ?? "");
        const prev = d.previousPick as string | null | undefined;
        return (
          <>
            <strong>{playerMap.get(playerId) ?? playerId}</strong> xoá dự đoán{" "}
            <strong>{matchMeta.get(matchId)?.label ?? matchId}</strong>
            {prev && (
              <>
                {" "}
                (đã chọn: {PREDICT_LABEL[prev] ?? prev})
              </>
            )}
          </>
        );
      }
      case "result.set":
      case "result.update": {
        const matchId = String(d.matchId ?? e.targetId ?? "");
        const prev = d.previousResult as
          | { winner: string; scoreHome: number; scoreAway: number }
          | null
          | undefined;
        const next = d.result as
          | { winner: string; scoreHome: number; scoreAway: number }
          | undefined;
        return (
          <>
            Chốt kết quả <strong>{matchMeta.get(matchId)?.label ?? matchId}</strong>:{" "}
            {prev && (
              <span className="text-slate-400 line-through">
                {RESULT_LABEL[prev.winner] ?? prev.winner} {prev.scoreHome}-{prev.scoreAway}
              </span>
            )}
            {prev && " → "}
            <strong className="text-emerald-600 dark:text-emerald-300">
              {next
                ? `${RESULT_LABEL[next.winner] ?? next.winner} ${next.scoreHome}-${next.scoreAway}`
                : "?"}
            </strong>
          </>
        );
      }
      case "result.delete": {
        const matchId = String(d.matchId ?? e.targetId ?? "");
        const prev = d.previousResult as
          | { winner: string; scoreHome: number; scoreAway: number }
          | null
          | undefined;
        return (
          <>
            Huỷ kết quả <strong>{matchMeta.get(matchId)?.label ?? matchId}</strong>
            {prev && (
              <>
                {" "}
                (đã ghi: {RESULT_LABEL[prev.winner] ?? prev.winner} {prev.scoreHome}-{prev.scoreAway})
              </>
            )}
          </>
        );
      }
      case "system.reset":
        return <>♻️ Toàn bộ dữ liệu đã bị xoá</>;
      default:
        return <code className="text-xs">{e.action}</code>;
    }
  }

  function getMatchFlag(matchId: string): string | null {
    const meta = matchMeta.get(matchId);
    if (!meta || !meta.home) return null;
    const home = getTeamInfo(meta.home);
    const away = meta.away ? getTeamInfo(meta.away) : null;
    if (!home) return null;
    return `${home.flag}${away ? " vs " + away.flag : ""}`;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-500 dark:text-zinc-500">
              🕓 Lịch sử thay đổi
            </div>
            <div className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
              Mọi thao tác tạo / sửa / xoá dự đoán và kết quả đều được ghi lại
            </div>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-zinc-500">
              {loading
                ? "Đang tải…"
                : `${filtered.length}/${entries.length} mục (mới nhất ở trên)`}
            </div>
          </div>
          <button
            onClick={() => void refresh()}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            🔄 Tải lại
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên, mã trận, hành động…"
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 dark:border-white/15 dark:bg-black/30 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-emerald-400"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-white/15 dark:bg-black/30 dark:text-white"
          >
            <option value="all">Tất cả</option>
            <option value="player">Người chơi</option>
            <option value="prediction">Dự đoán</option>
            <option value="result">Kết quả</option>
            <option value="system">Hệ thống</option>
          </select>
        </div>
      </div>

      {!loading && filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-zinc-400">
          Chưa có lịch sử nào.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
          <ol className="divide-y divide-slate-200 dark:divide-white/5">
            {filtered.map((e) => {
              const time = new Date(e.createdAt);
              const ts = time.toLocaleString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
              const flag =
                e.targetKind === "prediction" || e.targetKind === "result"
                  ? e.targetId?.includes(":")
                    ? getMatchFlag(e.targetId.split(":")[1] ?? "")
                    : getMatchFlag(e.targetId ?? "")
                  : null;
              return (
                <li
                  key={e.id}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                >
                  <div className="flex flex-col items-end pt-0.5 text-[10px] uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    <span className="font-mono">{ts.split(" ").pop()}</span>
                    <span>{ts.split(" ").slice(0, 2).join(" ")}</span>
                  </div>
                  <div className="flex-1 text-sm">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {labelForAction(e.action)}
                    </div>
                    <div className="mt-0.5 text-slate-600 dark:text-zinc-300">
                      {describe(e)}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400 dark:text-zinc-500">
                      {e.actorName && (
                        <span>
                          👤 bởi <strong>{e.actorName}</strong>
                        </span>
                      )}
                      {flag && <span>{flag}</span>}
                      {e.targetId && (
                        <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] dark:bg-black/30">
                          {e.targetId}
                        </code>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
