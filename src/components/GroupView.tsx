"use client";

import { useMemo, useState } from "react";
import type { AppData, GroupData, Player } from "@/lib/types";
import { getTeamInfo } from "@/data/tournament";
import MatchCard from "./MatchCard";
import { scoreboard } from "@/lib/scoring";
import { IconChevronDown, IconChart, IconUsers, IconTrophy } from "./Icons";

interface Props {
  group: GroupData;
  data: AppData;
  currentPlayer: Player | null;
  isAdmin: boolean;
  onPredict: (matchId: string, pred: any) => void;
  onConfirmResult: (matchId: string, res: any) => void;
}

export default function GroupView({
  group,
  data,
  currentPlayer,
  isAdmin,
  onPredict,
  onConfirmResult,
}: Props) {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<"matches" | "standings" | "stats">("matches");

  const matchdays = useMemo(() => {
    const set = new Set(group.matches.map((m) => m.matchday));
    return Array.from(set).sort();
  }, [group]);

  const board = useMemo(() => scoreboard(data), [data]);

  return (
    <section className="card overflow-hidden">
      {/* Group header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-[var(--bg-soft)]"
      >
        <div className="flex items-center gap-3">
          <div className="brand-grad flex h-11 w-11 items-center justify-center rounded-xl text-base font-black text-white shadow-md shadow-black/10">
            {group.id}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
              Bảng
            </div>
            <div className="font-semibold text-[var(--text-primary)]">
              {group.teams.join(" · ")}
            </div>
          </div>
        </div>
        <div className={`transition-transform duration-200 ${open ? "" : "-rotate-90"}`}>
          <IconChevronDown size={18} className="text-[var(--text-muted)]" />
        </div>
      </button>

      {open && (
        <div className="border-t border-[var(--border-soft)]">
          {/* Tab bar */}
          <div className="flex gap-1 border-b border-[var(--border-soft)] p-3">
            <TabButton
              active={tab === "matches"}
              onClick={() => setTab("matches")}
              icon={<IconTrophy size={12} />}
            >
              Trận ({group.matches.length})
            </TabButton>
            <TabButton
              active={tab === "standings"}
              onClick={() => setTab("standings")}
              icon={<IconUsers size={12} />}
            >
              BXH bảng
            </TabButton>
            <TabButton
              active={tab === "stats"}
              onClick={() => setTab("stats")}
              icon={<IconChart size={12} />}
            >
              Thống kê
            </TabButton>
          </div>

          <div className="p-3 space-y-4">
            {tab === "matches" &&
              matchdays.map((md) => (
                <div key={md} className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Vòng {md}
                  </div>
                  {group.matches
                    .filter((m) => m.matchday === md)
                    .map((m, i) => (
                      <MatchCard
                        key={m.id}
                        match={m}
                        data={data}
                        myPrediction={currentPlayer?.predictions[m.id]}
                        result={data.results[m.id]}
                        isAdmin={isAdmin}
                        onPredict={(p) => onPredict(m.id, p)}
                        onConfirmResult={(r) => onConfirmResult(m.id, r)}
                        animationDelay={i * 60}
                      />
                    ))}
                </div>
              ))}

            {tab === "standings" && <StandingsTable group={group} data={data} />}

            {tab === "stats" && (
              <StatsPanel group={group} data={data} board={board} />
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
        active
          ? "bg-[var(--text-primary)] text-[var(--bg-elevated)] shadow-sm"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function StandingsTable({ group, data }: { group: GroupData; data: AppData }) {
  // Compute live standings from confirmed results (group.standings in JSON is just zeroed stubs)
  const rows = useMemo(() => {
    const table: Record<
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
    > = Object.fromEntries(
      group.teams.map((t) => [
        t,
        {
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDiff: 0,
          points: 0,
        },
      ]),
    );

    for (const m of group.matches) {
      const r = data.results[m.id];
      if (!r) continue;
      const home = table[m.home];
      const away = table[m.away];
      if (!home || !away) continue;
      const sh = typeof r.scoreHome === "number" ? r.scoreHome : 0;
      const sa = typeof r.scoreAway === "number" ? r.scoreAway : 0;
      home.played += 1;
      away.played += 1;
      home.goalsFor += sh;
      home.goalsAgainst += sa;
      away.goalsFor += sa;
      away.goalsAgainst += sh;
      if (r.winner === "home") {
        home.won += 1;
        home.points += 3;
        away.lost += 1;
      } else if (r.winner === "away") {
        away.won += 1;
        away.points += 3;
        home.lost += 1;
      } else if (r.winner === "draw") {
        home.drawn += 1;
        away.drawn += 1;
        home.points += 1;
        away.points += 1;
      }
    }
    for (const t of group.teams) {
      table[t].goalDiff = table[t].goalsFor - table[t].goalsAgainst;
    }

    return group.teams
      .map((team) => ({ team, ...table[team] }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        return a.team.localeCompare(b.team);
      });
  }, [group, data]);

  const completed = group.matches.filter((m) => data.results[m.id]).length;

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border-soft)]">
      <table className="min-w-full text-sm">
        <thead className="bg-[var(--bg-soft)] text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
          <tr>
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Đội</th>
            <th className="px-2 py-2 text-center">Trận</th>
            <th className="px-2 py-2 text-center">T</th>
            <th className="px-2 py-2 text-center">H</th>
            <th className="px-2 py-2 text-center">B</th>
            <th className="px-2 py-2 text-center">BT</th>
            <th className="px-2 py-2 text-center">BB</th>
            <th className="px-2 py-2 text-center">HS</th>
            <th className="px-3 py-2 text-center">Điểm</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const info = getTeamInfo(r.team);
            return (
              <tr
                key={r.team}
                className={`border-t border-[var(--border-soft)] ${
                  i < 2 ? "bg-pitch-soft" : ""
                }`}
              >
                <td className="px-3 py-2 text-[var(--text-muted)]">{i + 1}</td>
                <td className="px-3 py-2">
                  <span className="mr-2 text-lg">{info?.flag}</span>
                  <span className="font-medium text-[var(--text-primary)]">{r.team}</span>
                </td>
                <td className="px-2 py-2 text-center text-[var(--text-secondary)]">{r.played}</td>
                <td className="text-pitch px-2 py-2 text-center font-semibold">{r.won}</td>
                <td className="px-2 py-2 text-center text-[var(--text-secondary)]">{r.drawn}</td>
                <td className="px-2 py-2 text-center text-rose-500 font-semibold">{r.lost}</td>
                <td className="px-2 py-2 text-center text-[var(--text-secondary)]">{r.goalsFor}</td>
                <td className="px-2 py-2 text-center text-[var(--text-secondary)]">{r.goalsAgainst}</td>
                <td className="px-2 py-2 text-center text-[var(--text-secondary)]">
                  {r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}
                </td>
                <td className="text-pitch px-3 py-2 text-center font-black">
                  {r.points}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="border-t border-[var(--border-soft)] bg-[var(--bg-soft)] px-3 py-2 text-[11px] text-[var(--text-muted)]">
        Đã xác nhận {completed}/{group.matches.length} trận · Top 2 được tô nền
      </div>
    </div>
  );
}

function StatsPanel({
  group,
  data,
  board,
}: {
  group: GroupData;
  data: AppData;
  board: ReturnType<typeof scoreboard>;
}) {
  if (board.length === 0) {
    return (
      <div className="card p-6 text-center text-sm text-[var(--text-muted)]">
        Chưa có dữ liệu dự đoán.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="card-elevated p-4 text-xs text-[var(--text-secondary)]">
        Toàn giải:{" "}
        <strong className="text-[var(--text-primary)]">{board.length}</strong> người chơi,{" "}
        <strong className="text-[var(--text-primary)]">
          {board.reduce((s, b) => s + b.matchesPredicted, 0)}
        </strong>{" "}
        lượt dự đoán.
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {board.map((s, i) => (
          <div
            key={s.player.id}
            className={`card p-4 ${
              i === 0 ? "border-amber-400/50 bg-amber-50/40 dark:border-amber-400/30 dark:bg-amber-500/5" : ""
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  #{i + 1}
                </div>
                <div className="mt-0.5 text-base font-bold text-[var(--text-primary)]">
                  {s.player.name}
                </div>
              </div>
              <div className="text-right">
                <div className="text-pitch text-3xl font-black">
                  {s.totalPoints}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  điểm
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              <MiniStat label="Đoán" value={s.matchesPredicted} />
              <MiniStat label="Đúng" value={s.picksCorrect} accent="emerald" />
              <MiniStat label="Sai" value={s.picksWrong} accent="rose" />
              <MiniStat label="Bỏ" value={s.picksMissed} accent="slate" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "emerald" | "rose" | "slate";
}) {
  const color =
    accent === "emerald"
      ? "text-pitch"
      : accent === "rose"
        ? "text-rose-500"
        : "text-[var(--text-muted)]";

  return (
    <div className="rounded-xl bg-[var(--bg-soft)] py-2 text-center">
      <div className={`text-base font-bold ${color}`}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
    </div>
  );
}