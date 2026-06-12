"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  emptyAppData,
  fetchData,
  loginOrCreate,
  resetAllRemote,
  setLocalCurrentPlayerId,
  setResultRemote,
  subscribeRealtime,
  updatePredictionRemote,
  deletePlayerRemote,
} from "@/lib/dataSource";
import { fillGroupStageDemo, fillKnockoutDemo } from "@/lib/demo";
import type { AppData, MatchPrediction, MatchResult, Player } from "@/lib/types";
import { tournament } from "@/data/tournament";
import { supabase } from "@/lib/supabase";
import { IconSoccer } from "./Icons";
import { useThemeTokens } from "@/lib/useThemeTokens";
import LoginScreen from "./LoginScreen";
import Header from "./Header";
import GroupView from "./GroupView";
import Leaderboard from "./Leaderboard";
import KnockoutView from "./KnockoutView";
import ScheduleView from "./ScheduleView";
import HistoryView from "./HistoryView";
import ThemeSettings from "./ThemeSettings";
import PlayerManager from "./PlayerManager";

type Tab = "schedule" | "groups" | "knockout" | "leaderboard" | "history" | "players";

export default function App() {
  const [data, setData] = useState<AppData>(emptyAppData);
  const [hydrated, setHydrated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<Tab>("schedule");
  const [activeGroup, setActiveGroup] = useState<string>("A");
  const [showThemeSettings, setShowThemeSettings] = useState(false);
  // Mount theme tokens hook (manages localStorage + CSS variable application)
  useThemeTokens();

  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      try {
        const initial = await fetchData();
        setData(initial);
        setHydrated(true);
        unsub = subscribeRealtime((fresh) => setData(fresh));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[supabase] load failed", e);
        setData(emptyAppData);
        setHydrated(true);
      }
    })();
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const currentPlayer: Player | null = useMemo(() => {
    if (!data.currentPlayerId) return null;
    return data.players.find((p) => p.id === data.currentPlayerId) ?? null;
  }, [data]);

  const refreshData = useCallback(async () => {
    try {
      const fresh = await fetchData();
      setData(fresh);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[supabase] refresh failed", e);
    }
  }, []);

  const handleLoginOrCreate = useCallback(
    async (name: string) => {
      try {
        const res = await loginOrCreate(data, name);
        setData(res.data);
        if (typeof window !== "undefined") {
          window.localStorage.setItem("dudoanwc2026:lastName", name.trim());
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[supabase] loginOrCreate failed", e);
        alert(
          "Không thể kết nối server. Vui lòng kiểm tra kết nối mạng hoặc thử lại.",
        );
      }
    },
    [data],
  );

  const handleLogout = useCallback(() => {
    setData((d) => ({ ...d, currentPlayerId: null }));
    setIsAdmin(false);
    setLocalCurrentPlayerId(null);
  }, []);

  const handleReset = useCallback(async () => {
    if (!window.confirm("Xoá tất cả người chơi, dự đoán và kết quả trên server?"))
      return;
    try {
      await resetAllRemote(currentPlayer?.name ?? null);
      setData(emptyAppData);
      setIsAdmin(false);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("dudoanwc2026:lastName");
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[supabase] resetAll failed", e);
      alert("Xoá dữ liệu thất bại, vui lòng thử lại.");
    }
  }, [currentPlayer]);

  const handlePredict = useCallback(
    async (matchId: string, pred: MatchPrediction | null) => {
      if (!currentPlayer) return;
      // Khoá: nếu trận đã chốt kết quả thì không cho đổi dự đoán
      if (data.results[matchId]) {
        // eslint-disable-next-line no-console
        console.warn("[predict] Trận đã chốt kết quả, bỏ qua dự đoán");
        return;
      }
      // Khoá: nếu trận đã bắt đầu (giờ VN) thì không cho vote
      const matchInfo = (() => {
        const g = tournament.groups
          .flatMap((gr) => gr.matches)
          .find((m) => m.id === matchId);
        if (g) return { kickoffVN: g.kickoffVN, date: g.date };
        const k = tournament.knockout
          ?.flatMap((r) => r.matches)
          .find((m) => m.id === matchId);
        if (k) return { kickoffVN: undefined, date: k.date };
        return null;
      })();
      const kickoffISO = matchInfo?.kickoffVN ?? matchInfo?.date;
      if (kickoffISO && new Date(kickoffISO).getTime() <= Date.now()) {
        // eslint-disable-next-line no-console
        console.warn("[predict] Trận đã bắt đầu, bỏ qua dự đoán");
        return;
      }
      const previousPick = currentPlayer.predictions[matchId]?.pick ?? null;
      // Optimistic update
      setData((d) => {
        const players = d.players.map((p) => {
          if (p.id !== currentPlayer.id) return p;
          const nextPreds = { ...p.predictions };
          if (pred === null) delete nextPreds[matchId];
          else nextPreds[matchId] = pred;
          return { ...p, predictions: nextPreds, updatedAt: Date.now() };
        });
        return { ...d, players };
      });
      try {
        await updatePredictionRemote(
          currentPlayer.name,
          currentPlayer.id,
          matchId,
          pred,
          data.results[matchId] ? null : (previousPick),
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[supabase] updatePrediction failed", e);
      }
    },
    [currentPlayer, data.results],
  );

  const handleConfirmResult = useCallback(
    async (matchId: string, res: MatchResult | null) => {
      const previousResult = data.results[matchId] ?? null;
      setData((d) => {
        const results = { ...d.results };
        if (res === null) delete results[matchId];
        else results[matchId] = res;
        return { ...d, results };
      });
      try {
        await setResultRemote(
          currentPlayer?.name ?? null,
          matchId,
          res,
          previousResult,
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[supabase] setResult failed", e);
      }
    },
    [currentPlayer, data.results],
  );

  const totals = useMemo(() => {
    const totalPredictions = data.players.reduce(
      (s, p) => s + Object.keys(p.predictions).length,
      0,
    );
    return {
      totalPlayers: data.players.length,
      totalPredictions,
      totalResults: Object.keys(data.results).length,
    };
  }, [data]);

  if (!hydrated) {
    return (
      <div className="app-bg flex min-h-dvh items-center justify-center text-[var(--text-muted)]">
        <div className="flex flex-col items-center gap-3">
          <div className="brand-grad flex h-16 w-16 items-center justify-center rounded-2xl text-white">
            <IconSoccer size={32} />
          </div>
          <div className="text-sm font-medium">Đang kết nối server…</div>
        </div>
      </div>
    );
  }

  if (!currentPlayer) {
    return (
      <LoginScreen
        players={data.players}
        onLogin={handleLoginOrCreate}
        onCreate={handleLoginOrCreate}
        onReset={handleReset}
        isAdmin={isAdmin}
        onDeletePlayer={
          isAdmin
            ? async (playerId) => {
                try {
                  await deletePlayerRemote("admin", playerId);
                  await refreshData();
                } catch (e) {
                  console.error("[login] delete failed", e);
                  alert(`Xoá thất bại: ${(e as Error).message ?? "lỗi không rõ"}`);
                }
              }
            : undefined
        }
      />
    );
  }

  const group =
    tournament.groups.find((g: { id: string }) => g.id === activeGroup) ??
    tournament.groups[0];

  return (
    <div className="app-bg min-h-dvh text-[var(--text-primary)]">
      <Header
        user={currentPlayer.name}
        isAdmin={isAdmin}
        onToggleAdmin={() => setIsAdmin((v) => !v)}
        onLogout={handleLogout}
        {...totals}
      />

      <main className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6">
        <div className="card pitch-lines relative p-4">
          <div className="relative">
          <div className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
            FIFA World Cup 2026 · {tournament.hosts.join(" · ")}
          </div>
          <div className="mt-1 text-lg font-bold text-[var(--text-primary)]">
            {tournament.tournament}
          </div>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">
            {tournament.dates.start} → {tournament.dates.end} · {tournament.format.teamsTotal} đội · {tournament.format.groups} bảng ·{" "}
            {tournament.format.advanceRules}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                supabase ? "bg-pitch" : "bg-rose-500"
              }`}
            />
            {supabase
              ? "Đã kết nối server · Đồng bộ realtime"
              : "Chưa cấu hình Supabase · App chạy offline"}
          </div>
          {isAdmin && (
            <div className="mt-3 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-300/30 dark:bg-amber-300/10 dark:text-amber-100">
              <div>
                Bạn đang ở <strong>chế độ Admin</strong>. Bật để{" "}
                <strong>xác nhận kết quả thắng thua</strong> cho từng trận. Mọi
                người dùng đều có thể bật chế độ này để tự nhập kết quả thật.
              </div>
              <button
                onClick={async () => {
                  const next = await fillGroupStageDemo(
                    data,
                    currentPlayer.name,
                  );
                  setData(next);
                }}
                title="Tự động điền kết quả 72 trận vòng bảng (chỉ dùng để demo)"
                className="shrink-0 rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-300"
              >
                Tự điền vòng bảng
              </button>
              <button
                onClick={async () => {
                  const next = await fillKnockoutDemo(
                    data,
                    currentPlayer.name,
                  );
                  setData(next);
                }}
                title="Tự động điền kết quả toàn bộ giải (vòng bảng + vòng trong)"
                className="shrink-0 rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-300"
              >
                Tự điền cả giải
              </button>
              <button
                onClick={() => setShowThemeSettings(true)}
                title="Chỉnh màu giao diện (preset hoặc tuỳ chỉnh)"
                className="shrink-0 rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-300"
              >
                Tuỳ chỉnh màu
              </button>
            </div>
          )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 text-sm">
            <TabPill
              active={tab === "schedule"}
              onClick={() => setTab("schedule")}
            >
              Theo ngày
            </TabPill>
            <TabPill active={tab === "groups"} onClick={() => setTab("groups")}>
              Vòng bảng
            </TabPill>
            <TabPill
              active={tab === "knockout"}
              onClick={() => setTab("knockout")}
            >
              Vòng trong
            </TabPill>
            <TabPill
              active={tab === "leaderboard"}
              onClick={() => setTab("leaderboard")}
            >
              Bảng xếp hạng
            </TabPill>
            {isAdmin && (
              <>
                <TabPill
                  active={tab === "players"}
                  onClick={() => setTab("players")}
                >
                  Người chơi
                </TabPill>
                <TabPill
                  active={tab === "history"}
                  onClick={() => setTab("history")}
                >
                  Lịch sử
                </TabPill>
              </>
            )}
          </div>
          {tab === "groups" && (
            <div className="flex flex-wrap gap-1.5">
              {tournament.groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setActiveGroup(g.id)}
                  className={`h-9 w-9 rounded-lg text-sm font-bold transition touch-feedback ${
                    activeGroup === g.id
                      ? "bg-pitch text-white shadow-md shadow-black/10"
                      : "bg-[var(--bg-soft)] text-[var(--text-secondary)] hover:bg-[var(--bg-base)]"
                  }`}
                >
                  {g.id}
                </button>
              ))}
            </div>
          )}
        </div>

        {tab === "groups" && (
          <GroupView
            key={group.id}
            group={group}
            data={data}
            currentPlayer={currentPlayer}
            isAdmin={isAdmin}
            onPredict={handlePredict}
            onConfirmResult={handleConfirmResult}
          />
        )}

        {tab === "knockout" && (
          <KnockoutView
            data={data}
            currentPlayer={currentPlayer}
            isAdmin={isAdmin}
            onPredict={handlePredict}
            onConfirmResult={handleConfirmResult}
          />
        )}

        {tab === "schedule" && (
          <ScheduleView
            data={data}
            currentPlayer={currentPlayer}
            isAdmin={isAdmin}
            onPredict={handlePredict}
            onConfirmResult={handleConfirmResult}
          />
        )}

        {tab === "leaderboard" && <Leaderboard data={data} />}

        {tab === "history" && isAdmin && <HistoryView data={data} />}

        {tab === "players" && isAdmin && currentPlayer && (
          <PlayerManager
            data={data}
            actorName={currentPlayer.name}
            currentPlayerId={currentPlayer.id}
            onRefresh={refreshData}
          />
        )}

        <footer className="pb-8 pt-4 text-center text-[11px] text-slate-500 dark:text-zinc-500">
          {tournament.tournament} · Dữ liệu lưu trên Supabase (realtime) · Build{" "}
          {new Date().getFullYear()}
        </footer>
      </main>

      {showThemeSettings && <ThemeSettings onClose={() => setShowThemeSettings(false)} />}
    </div>
  );
}

function TabPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition touch-feedback ${
        active
          ? "bg-pitch text-white shadow-md shadow-black/10"
          : "bg-[var(--bg-soft)] text-[var(--text-secondary)] hover:bg-[var(--bg-base)]"
      }`}
    >
      {children}
    </button>
  );
}
