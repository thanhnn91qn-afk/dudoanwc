"use client";

import type { AppData, KnockoutMatch, MatchPrediction, MatchResult, Player } from "@/lib/types";
import { resolveKnockout, groupStageProgress } from "@/lib/knockout";
import { knockoutResultFor } from "@/lib/matchIds";
import { tournament } from "@/data/tournament";
import MatchCard from "./MatchCard";
import { STAGE_LABEL } from "@/lib/types";
import { IconTrophy, IconCheck } from "./Icons";

interface Props {
  data: AppData;
  currentPlayer: Player | null;
  isAdmin: boolean;
  onPredict: (matchId: string, pred: MatchPrediction | null) => void;
  onConfirmResult: (matchId: string, res: MatchResult | null) => void;
}

export default function KnockoutView({
  data,
  currentPlayer,
  isAdmin,
  onPredict,
  onConfirmResult,
}: Props) {
  const progress = groupStageProgress(tournament.groups, data.results);
  const resolved = resolveKnockout(tournament.groups, data.results);

  return (
    <div className="space-y-4">
      <ProgressBanner progress={progress} resolved={resolved} />

      {!progress.ready && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/5 dark:text-amber-100">
          <div className="font-semibold">⏳ Vòng bảng chưa hoàn tất</div>
          <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-200/80">
            Đã xác nhận <strong>{progress.done}/{progress.total}</strong> trận
            vòng bảng. Các trận vòng trong sẽ tự động được lấp đầy khi bạn xác
            nhận đủ kết quả. Bạn vẫn có thể dự đoán trước các trận đã xác định
            được cặp đấu.
          </p>
        </div>
      )}

      <QualifiedSummary resolved={resolved} progress={progress} />

      <div className="space-y-4">
        {resolved.rounds.map((round) => (
          <section
            key={round.stage}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">
                {STAGE_LABEL[round.stage]}
              </h2>
              <span className="text-xs text-[var(--text-muted)]">
                {round.matches.filter((m) => knockoutResultFor(m.id, m.home, m.away, data.results)).length}/
                {round.matches.length} đã xong
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2">
              {round.matches.map((m) => (
                <MatchCard
                  key={m.id}
                  match={{ ...m, isKnockout: true }}
                  data={data}
                  myPrediction={currentPlayer?.predictions[m.id]}
                  result={knockoutResultFor(m.id, m.home, m.away, data.results)}
                  isAdmin={isAdmin}
                  onPredict={(p) => onPredict(m.id, p)}
                  onConfirmResult={(r) => onConfirmResult(m.id, r)}
                  showSeedWhenUnknown
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function ProgressBanner({
  progress,
  resolved,
}: {
  progress: ReturnType<typeof groupStageProgress>;
  resolved: ReturnType<typeof resolveKnockout>;
}) {
  const champion =
    resolved.rounds[resolved.rounds.length - 1].matches[0];
  if (champion && dataHasChampion(champion)) {
    return (
      <div className="rounded-2xl border border-amber-400/50 bg-gradient-to-br from-amber-100 to-yellow-100 p-5 text-center shadow-lg dark:border-amber-400/40 dark:from-amber-400/15 dark:to-yellow-500/10 dark:shadow-2xl">
        <div className="text-xs uppercase tracking-widest text-amber-700 dark:text-amber-200">
          <IconTrophy size={14} className="text-amber-500" /> Nhà vô địch
        </div>
        <div className="mt-2 text-4xl font-black text-amber-900 dark:text-amber-100">
          {champion.winner === "home" ? champion.home : champion.away}
        </div>
      </div>
    );
  }
  return null;
}

function dataHasChampion(m: KnockoutMatch) {
  if (!m.winner) return false;
  if (m.winner === "draw") return false;
  return !!(m.home || m.away);
}

function QualifiedSummary({
  resolved,
  progress,
}: {
  resolved: ReturnType<typeof resolveKnockout>;
  progress: ReturnType<typeof groupStageProgress>;
}) {
  if (!progress.ready) {
    return (
      <details className="rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-white/10 dark:bg-white/5" open>
        <summary className="cursor-pointer text-slate-700 dark:text-zinc-300">
          📋 Bảng xếp hạng các bảng (đã cập nhật theo kết quả)
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {resolved.groupTables.map((rows, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-white/10 dark:bg-black/20"
            >
              <div className="mb-1 text-[10px] uppercase tracking-widest text-slate-500 dark:text-zinc-500">
                Bảng {String.fromCharCode(65 + idx)}
              </div>
              {rows.map((r, i) => (
                <div
                  key={r.team}
                  className={`flex items-center justify-between py-0.5 ${
                    i < 2 ? "text-pitch" : "text-[var(--text-muted)]"
                  }`}
                >
                  <span className="truncate">
                    {i + 1}. {r.team}
                  </span>
                  <span className="font-mono text-[10px]">
                    {r.points}đ · {r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff} · {r.goalsFor}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </details>
    );
  }
  return (
    <div className="bg-pitch-soft border-pitch rounded-2xl border p-4 text-sm">
      <div className="text-pitch flex items-center gap-1.5 font-semibold">
        <IconCheck size={13} /> Vòng bảng đã hoàn tất · 32 đội vào vòng knockout
      </div>
      <div className="mt-1 text-xs text-[var(--text-secondary)]">
        Top 2 mỗi bảng + 8 đội hạng 3 tốt nhất. Bracket bên dưới đã được lấp đầy
        tự động.
      </div>
    </div>
  );
}
