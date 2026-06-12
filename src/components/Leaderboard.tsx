"use client";

import { scoreboard } from "@/lib/scoring";
import type { AppData } from "@/lib/types";
import { IconTrophy, IconCheck, IconX, IconChart, IconMedal } from "./Icons";

interface Props {
  data: AppData;
}

export default function Leaderboard({ data }: Props) {
  const board = scoreboard(data);
  if (board.length === 0) {
    return (
      <div className="card p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-soft)] text-[var(--text-muted)]">
          <IconTrophy size={24} />
        </div>
        <p className="text-sm text-[var(--text-muted)]">Chưa có người chơi nào.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="brand-grad pitch-lines px-4 py-3">
        <div className="relative flex items-center gap-2 text-white">
          <IconTrophy size={18} />
          <span className="font-bold">Bảng xếp hạng</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--bg-soft)] text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-2.5 text-left">#</th>
              <th className="px-3 py-2.5 text-left">Người chơi</th>
              <th className="px-2 py-2.5 text-center">Tổng điểm</th>
              <th className="px-2 py-2.5 text-center">
                <span className="flex items-center justify-center gap-1">
                  <IconCheck size={10} className="text-pitch" /> Đúng
                </span>
              </th>
              <th className="px-2 py-2.5 text-center">
                <span className="flex items-center justify-center gap-1">
                  <IconX size={10} className="text-rose-500" /> Sai
                </span>
              </th>
              <th className="px-2 py-2.5 text-center">
                <span className="flex items-center justify-center gap-1">
                  <IconChart size={10} className="text-slate-400" /> Bỏ
                </span>
              </th>
              <th className="px-3 py-2.5 text-center">Đã đoán</th>
            </tr>
          </thead>
          <tbody>
            {board.map((s, i) => (
              <tr
                key={s.player.id}
                className={`border-t border-[var(--border-soft)] transition-colors ${
                  i === 0
                    ? "bg-amber-50/60 dark:bg-amber-500/5"
                    : "hover:bg-[var(--bg-soft)]"
                }`}
              >
                <td className="px-4 py-2.5">
                  {i === 0 ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400 text-xs font-black text-amber-950">
                      <IconMedal size={12} />
                    </span>
                  ) : i === 1 ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-300 text-xs font-black text-zinc-700 dark:bg-zinc-600 dark:text-zinc-200">
                      2
                    </span>
                  ) : i === 2 ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-300 text-xs font-black text-orange-950 dark:bg-orange-700 dark:text-orange-100">
                      3
                    </span>
                  ) : (
                    <span className="text-[var(--text-muted)]">{i + 1}</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--text-primary)]">{s.player.name}</span>
                    {data.currentPlayerId === s.player.id && (
                      <span className="bg-pitch-soft text-pitch rounded-full px-2 py-0.5 text-[10px] font-bold">
                        BẠN
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-2 py-2.5 text-center">
                  <span className="text-pitch text-xl font-black">
                    {s.totalPoints}
                  </span>
                </td>
                <td className="px-2 py-2.5 text-center">
                  <span className="text-pitch font-bold">{s.picksCorrect}</span>
                </td>
                <td className="px-2 py-2.5 text-center">
                  <span className="font-bold text-rose-500">{s.picksWrong}</span>
                </td>
                <td className="px-2 py-2.5 text-center">
                  <span className="text-[var(--text-muted)]">{s.picksMissed}</span>
                </td>
                <td className="px-3 py-2.5 text-center text-[var(--text-muted)]">
                  {s.matchesPredicted}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}