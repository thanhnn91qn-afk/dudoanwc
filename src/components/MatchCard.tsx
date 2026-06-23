"use client";

import { useMemo, useState } from "react";
import type {
  AppData,
  MatchPrediction,
  MatchResult,
  Pick,
} from "@/lib/types";
import { getTeamInfo } from "@/data/tournament";
import { isGroupStageMatchId } from "@/lib/matchIds";
import { tallyMatch } from "@/lib/scoring";
import {
  IconCheck,
  IconX,
  IconLock,
  IconClock,
  IconChart,
  IconInfo,
  IconTrophy,
} from "./Icons";

interface BaseMatchLike {
  id: string;
  home?: string | null;
  away?: string | null;
  homeSeed?: string;
  awaySeed?: string;
  kickoffVN?: string;
  date?: string;
  venue: string;
  city: string;
  isKnockout?: boolean;
}

interface Props {
  match: BaseMatchLike;
  data: AppData;
  myPrediction: MatchPrediction | undefined;
  result: MatchResult | undefined;
  isAdmin: boolean;
  onPredict: (pred: MatchPrediction | null) => void;
  onConfirmResult: (res: MatchResult | null) => void;
  showSeedWhenUnknown?: boolean;
  animationDelay?: number;
}

const labels: Record<Pick, string> = {
  home: "Thắng (sân nhà)",
  away: "Thắng (sân khách)",
  draw: "Hoà",
};

/**
 * Label động theo pick + tên 2 đội thật: hiển thị "Brazil Thắng" thay vì
 * "Thắng (sân nhà)" để user dễ nhớ mình đã chọn gì khi trận đã bắt đầu.
 */
function pickLabel(
  pick: Pick | undefined,
  home: string | null | undefined,
  away: string | null | undefined,
): string {
  if (!pick) return "—";
  if (pick === "home") return home ? `${home} Thắng` : "Thắng (sân nhà)";
  if (pick === "away") return away ? `${away} Thắng` : "Thắng (sân khách)";
  return "Hoà";
}

export default function MatchCard({
  match,
  data,
  myPrediction,
  result,
  isAdmin,
  onPredict,
  onConfirmResult,
  showSeedWhenUnknown = false,
  animationDelay = 0,
}: Props) {
  const homeKnown = !!match.home;
  const awayKnown = !!match.away;
  const homeInfo = match.home ? getTeamInfo(match.home) : undefined;
  const awayInfo = match.away ? getTeamInfo(match.away) : undefined;

  const [homeScore, setHomeScore] = useState<number>(result?.scoreHome ?? 0);
  const [awayScore, setAwayScore] = useState<number>(result?.scoreAway ?? 0);

  const kickoffISO = match.kickoffVN ?? match.date ?? "";
  const kickoffDate = kickoffISO ? new Date(kickoffISO) : null;
  const dateLabel = kickoffDate
    ? kickoffDate.toLocaleDateString("vi-VN", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
      })
    : "?";
  const timeLabel = kickoffDate
    ? kickoffDate.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Ho_Chi_Minh",
      })
    : "";

  const locked = !homeKnown || !awayKnown;
  const now = Date.now();
  const kickedOff = kickoffDate ? kickoffDate.getTime() <= now : false;
  // Knockout chưa có đủ 2 đội hoặc mã trùng vòng bảng: không hiển thị kết quả.
  const effectiveResult =
    match.isKnockout && (locked || isGroupStageMatchId(match.id))
      ? undefined
      : result;
  const finalized = !!effectiveResult;

  const handlePick = (pick: Pick) => {
    if (!homeKnown || !awayKnown || kickedOff || finalized) return;
    onPredict({ pick, predictedAt: Date.now() });
  };

  const myPickCorrect =
    myPrediction && effectiveResult && myPrediction.pick === effectiveResult.winner;

  // Danh sách tên người chơi đã đoán đúng trận này (khi đã chốt kết quả).
  // predictions nằm trong từng Player.predictions (key theo matchId).
  const correctNames = useMemo(() => {
    if (!finalized || !effectiveResult) return [] as string[];
    const names: string[] = [];
    for (const player of data.players) {
      const pred = player.predictions?.[match.id];
      if (pred && pred.pick === effectiveResult.winner) names.push(player.name);
    }
    return names;
  }, [finalized, effectiveResult, data.players, match.id]);

  const cardStyle = effectiveResult
    ? "result-correct"
    : locked
      ? "border-dashed border-[var(--border-medium)] bg-[var(--bg-soft)]/50"
      : "card";

  return (
    <div
      className={`${cardStyle} rounded-2xl border p-4 transition-all duration-200 hover:shadow-md`}
      style={{
        animationDelay: `${animationDelay}ms`,
      }}
    >
      {/* Header: match ID + time + venue */}
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-[var(--bg-soft)] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            {match.id}
          </span>
          <span className="text-xs text-[var(--text-muted)]">{dateLabel}</span>
          {timeLabel && (
            <>
              <span className="text-[var(--text-muted)]">·</span>
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-500">
                <IconClock size={11} />
                {timeLabel}
              </span>
            </>
          )}
          {kickedOff && !result && (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
              <IconClock size={9} />
              Đã bắt đầu
            </span>
          )}
        </div>
        <span className="truncate text-[10px] text-[var(--text-muted)]">
          {match.venue}, {match.city}
        </span>
      </div>

      {/* Teams row */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex flex-col items-end text-right">
          <div className="text-3xl">{homeInfo?.flag ?? "❓"}</div>
          <div className="mt-1 font-semibold leading-tight text-[var(--text-primary)]">
            {match.home ?? (showSeedWhenUnknown ? match.homeSeed : "?")}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          {effectiveResult ? (
            <div className="bg-pitch-soft text-pitch rounded-xl px-4 py-2 text-center font-mono text-2xl font-black tracking-tight">
              {effectiveResult.scoreHome}
              <span className="mx-1 text-[var(--text-muted)]">—</span>
              {effectiveResult.scoreAway}
            </div>
          ) : (
            <div className="text-lg font-bold text-[var(--text-muted)]">VS</div>
          )}
        </div>

        <div className="flex flex-col items-start text-left">
          <div className="text-3xl">{awayInfo?.flag ?? "❓"}</div>
          <div className="mt-1 font-semibold leading-tight text-[var(--text-primary)]">
            {match.away ?? (showSeedWhenUnknown ? match.awaySeed : "?")}
          </div>
        </div>
      </div>

      {/* Locked (waiting for previous round) */}
      {locked && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-soft)] p-2.5 text-[11px] text-[var(--text-muted)]">
          <IconInfo size={13} className="shrink-0 text-[var(--accent-sky)]" />
          <span>
            Chờ kết quả vòng trước ({match.homeSeed} vs {match.awaySeed})
          </span>
        </div>
      )}

      {/* User prediction buttons */}
      {!isAdmin && !locked && !finalized && !kickedOff && (
        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <PickButton
              active={myPrediction?.pick === "home"}
              onClick={() => handlePick("home")}
              label={match.home ?? "Sân nhà"}
              sub="thắng"
              accent="emerald"
            />
            {!match.isKnockout && (
              <PickButton
                active={myPrediction?.pick === "draw"}
                onClick={() => handlePick("draw")}
                label="Hoà"
                sub=""
                accent="slate"
              />
            )}
            <PickButton
              active={myPrediction?.pick === "away"}
              onClick={() => handlePick("away")}
              label={match.away ?? "Sân khách"}
              sub="thắng"
              accent="sky"
            />
          </div>
          {myPrediction && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-secondary)]">
                Đã chọn:{" "}
                <strong className="text-[var(--text-primary)]">
                  {pickLabel(myPrediction.pick, match.home, match.away)}
                </strong>
              </span>
              <button
                onClick={() => onPredict(null)}
                className="flex items-center gap-1 text-[11px] text-rose-500 underline-offset-4 transition-colors hover:underline"
              >
                <IconX size={11} />
                Xoá
              </button>
            </div>
          )}
        </div>
      )}

      {/* Kicked off — locked banner (has prediction) */}
      {!isAdmin && !locked && !finalized && kickedOff && myPrediction && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          <span className="flex items-center gap-1.5">
            <IconClock size={12} className="text-amber-500" />
            Đã bắt đầu · Bạn đã chọn:{" "}
            <strong className="text-amber-800 dark:text-white">
              {pickLabel(myPrediction.pick, match.home, match.away)}
            </strong>
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600/70 dark:text-amber-300/70">
            khoá
          </span>
        </div>
      )}

      {/* Kicked off — locked banner (no prediction) */}
      {!isAdmin && !locked && !finalized && kickedOff && !myPrediction && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          <IconClock size={12} className="shrink-0 text-amber-500" />
          Trận đã bắt đầu lúc {timeLabel} — không nhận dự đoán nữa.
        </div>
      )}

      {/* Finalized (result confirmed) */}
      {!isAdmin && finalized && myPrediction && (
        <div className="mt-3 space-y-1.5 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-soft)] px-3 py-2.5 text-xs text-[var(--text-secondary)]">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
            <span className="flex items-center gap-1.5">
              <IconLock size={11} className="text-slate-400" />
              Đã chốt · Bạn đã chọn:{" "}
              <strong className="text-[var(--text-primary)]">
                {pickLabel(myPrediction.pick, match.home, match.away)}
              </strong>
            </span>
            {myPickCorrect ? (
              <span className="text-pitch flex items-center gap-1 font-bold">
                <IconCheck size={12} />
                Đúng
              </span>
            ) : (
              <span className="flex items-center gap-1 font-bold text-rose-500">
                <IconX size={12} />
                Sai
              </span>
            )}
          </div>
          {correctNames.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[var(--text-muted)]">
              <IconTrophy size={11} className="shrink-0 text-pitch" />
              <span className="font-semibold text-pitch">
                {correctNames.length} người đoán đúng:
              </span>
              <CorrectNamesList names={correctNames} />
            </div>
          )}
        </div>
      )}

      {!isAdmin && finalized && !myPrediction && (
        <div className="mt-3 space-y-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/5 dark:text-rose-300">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <IconInfo size={12} className="shrink-0" />
              Bạn chưa dự đoán trận này — đã chốt kết quả.
            </span>
          </div>
          {correctNames.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[var(--text-muted)] dark:text-rose-200/80">
              <IconTrophy size={11} className="shrink-0 text-pitch" />
              <span className="font-semibold text-pitch">
                {correctNames.length} người đoán đúng:
              </span>
              <CorrectNamesList names={correctNames} />
            </div>
          )}
        </div>
      )}

      {/* Admin result confirmation */}
      {isAdmin && !locked && (
        <div className="mt-4 space-y-3 rounded-xl border border-amber-300/50 bg-amber-50/80 p-3 dark:border-amber-400/20 dark:bg-amber-400/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
              <IconTrophy size={12} />
              Xác nhận kết quả
            </div>
            {result && (
              <button
                onClick={() => onConfirmResult(null)}
                className="flex items-center gap-1 text-[11px] text-rose-500 underline-offset-4 transition-colors hover:underline"
              >
                <IconX size={10} />
                Huỷ kết quả
              </button>
            )}
          </div>

          {/* Score inputs */}
          <div className="grid grid-cols-2 gap-2">
            <ScoreInput
              label={match.home ?? "Sân nhà"}
              value={result?.scoreHome ?? homeScore}
              onChange={(v) => setHomeScore(v)}
            />
            <ScoreInput
              label={match.away ?? "Sân khách"}
              value={result?.scoreAway ?? awayScore}
              onChange={(v) => setAwayScore(v)}
            />
          </div>

          {/* Winner buttons */}
          <div className={`grid gap-2 ${match.isKnockout ? "grid-cols-2" : "grid-cols-3"}`}>
            <WinnerButton
              active={result?.winner === "home"}
              onClick={() =>
                onConfirmResult({ winner: "home", scoreHome: homeScore, scoreAway: awayScore, finalizedAt: Date.now() })
              }
              label={match.home ?? "Sân nhà"}
              sub="thắng"
              accent="emerald"
            />
            {!match.isKnockout && (
              <WinnerButton
                active={result?.winner === "draw"}
                onClick={() =>
                  onConfirmResult({ winner: "draw", scoreHome: homeScore, scoreAway: awayScore, finalizedAt: Date.now() })
                }
                label="Hoà"
                sub=""
                accent="slate"
              />
            )}
            <WinnerButton
              active={result?.winner === "away"}
              onClick={() =>
                onConfirmResult({ winner: "away", scoreHome: homeScore, scoreAway: awayScore, finalizedAt: Date.now() })
              }
              label={match.away ?? "Sân khách"}
              sub="thắng"
              accent="sky"
            />
          </div>
        </div>
      )}

      {/* Vote tally */}
      {!locked && <VoteTally match={match} data={data} myPickCorrect={myPickCorrect} />}
    </div>
  );
}

function PickButton({
  active,
  onClick,
  label,
  sub,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
  accent: "emerald" | "sky" | "slate";
}) {
  const baseClass = `flex flex-col items-center justify-center rounded-xl py-2.5 text-xs font-semibold transition-all duration-150 touch-feedback`;
  const activeClass =
    accent === "emerald"
      ? "bg-pitch text-white shadow-md shadow-black/10"
      : accent === "sky"
        ? "text-white shadow-md shadow-black/10"
        : "bg-slate-500 text-white shadow-md shadow-black/10";
  const activeStyle = active && accent === "sky" ? { background: "var(--accent-sky)" } : undefined;
  const inactiveClass =
    "bg-[var(--bg-soft)] text-[var(--text-secondary)] hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)] border border-[var(--border-soft)]";

  return (
    <button onClick={onClick} style={activeStyle} className={`${baseClass} ${active ? activeClass : inactiveClass}`}>
      <span>{label}</span>
      {sub && <span className="text-[10px] opacity-70">{sub}</span>}
    </button>
  );
}

function WinnerButton({
  active,
  onClick,
  label,
  sub,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
  accent: "emerald" | "sky" | "slate";
}) {
  const activeClass =
    accent === "emerald"
      ? "bg-pitch text-white"
      : accent === "sky"
        ? "text-white"
        : "bg-slate-500 text-white";
  const activeStyle = active && accent === "sky" ? { background: "var(--accent-sky)" } : undefined;
  const inactiveClass =
    "bg-[var(--bg-soft)] text-[var(--text-secondary)] hover:bg-[var(--bg-base)]";

  return (
    <button
      onClick={onClick}
      style={activeStyle}
      className={`flex flex-col items-center justify-center rounded-xl py-2 text-xs font-semibold transition-all touch-feedback ${active ? activeClass : inactiveClass}`}
    >
      <span>{label}</span>
      {sub && <span className="text-[10px] opacity-70">{sub}</span>}
    </button>
  );
}

function ScoreInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1 truncate text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </div>
      <input
        type="number"
        min={0}
        max={20}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const v = parseInt(e.target.value || "0", 10);
          onChange(Number.isNaN(v) ? 0 : Math.max(0, Math.min(20, v)));
        }}
        className="w-full rounded-xl border-2 border-[var(--border-medium)] bg-[var(--bg-input)] px-3 py-2 text-center text-base font-bold text-[var(--text-primary)] outline-none transition-all focus:border-[var(--pitch)] dark:bg-black/30"
      />
    </label>
  );
}

function VoteTally({
  match,
  data,
  myPickCorrect,
}: {
  match: BaseMatchLike;
  data: AppData;
  myPickCorrect: boolean | null | undefined;
}) {
  const tally = tallyMatch(
    { ...match, home: match.home ?? "", away: match.away ?? "" } as never,
    data,
  );
  const total = Math.max(tally.total, 0);
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const homeLabel = `${match.home ?? "Sân nhà"} thắng`;
  const awayLabel = `${match.away ?? "Sân khách"} thắng`;

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-soft)] p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          <IconChart size={11} />
          {total} người đã vote
        </div>
        {myPickCorrect !== null && myPickCorrect !== undefined && (
          <span
            className={`flex items-center gap-1 text-[11px] font-bold ${
              myPickCorrect ? "text-pitch" : "text-rose-500"
            }`}
          >
            {myPickCorrect ? <IconCheck size={11} /> : <IconX size={11} />}
            {myPickCorrect ? "Đúng (+1đ)" : "Sai (0đ)"}
          </span>
        )}
      </div>

      <VoteBar label={homeLabel} count={tally.home} percent={pct(tally.home)} accent="emerald" />
      {!match.isKnockout && (
        <VoteBar label="Hoà" count={tally.draw} percent={pct(tally.draw)} accent="slate" />
      )}
      <VoteBar label={awayLabel} count={tally.away} percent={pct(tally.away)} accent="sky" />
    </div>
  );
}

function VoteBar({
  label,
  count,
  percent,
  accent,
}: {
  label: string;
  count: number;
  percent: number;
  accent: "emerald" | "sky" | "slate";
}) {
  const barStyle =
    accent === "emerald"
      ? { background: "var(--pitch)" }
      : accent === "sky"
        ? { background: "var(--accent-sky)" }
        : { background: "var(--text-muted)" };
  const textColor =
    accent === "emerald"
      ? "text-pitch"
      : accent === "sky"
        ? "text-[var(--accent-sky)]"
        : "text-[var(--text-secondary)]";

  return (
    <div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="truncate font-medium text-[var(--text-secondary)]">{label}</span>
        <span className="flex items-center gap-1 font-mono">
          <span className={`font-bold ${textColor}`}>{count}</span>
          {percent > 0 && (
            <span className="text-[var(--text-muted)]">{percent}%</span>
          )}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--border-soft)]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, ...barStyle }}
        />
      </div>
    </div>
  );
}

/**
 * Hiển thị tên các người chơi đoán đúng, compact:
 *  - ≤ 3 tên: liệt kê hết, phân cách bằng dấu phẩy
 *  - > 3 tên: hiện 2 tên đầu + "+N người khác"
 * Khi user bấm "+N người khác" thì bung hết ra.
 */
function CorrectNamesList({ names }: { names: string[] }) {
  const [expanded, setExpanded] = useState(false);
  if (names.length === 0) return null;
  const showAll = expanded || names.length <= 3;
  const visible = showAll ? names : names.slice(0, 2);
  const remaining = names.length - visible.length;
  return (
    <span>
      {visible.map((n, i) => (
        <span key={n}>
          <span className="font-semibold text-[var(--text-primary)]">{n}</span>
          {i < visible.length - 1 && <span className="mx-1">,</span>}
        </span>
      ))}
      {!showAll && remaining > 0 && (
        <>
          <span className="mx-1">,</span>
          <button
            onClick={() => setExpanded(true)}
            className="font-semibold text-pitch underline-offset-2 hover:underline"
            title={names.join(", ")}
          >
            +{remaining} người khác
          </button>
        </>
      )}
    </span>
  );
}