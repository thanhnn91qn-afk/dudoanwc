"use client";

import { useMemo, useState } from "react";
import type {
  AppData,
  KnockoutMatch,
  Match,
  MatchPrediction,
  MatchResult,
  Player,
} from "@/lib/types";
import { resolveKnockout } from "@/lib/knockout";
import { tournament } from "@/data/tournament";
import MatchCard from "./MatchCard";
import { IconCalendar, IconClock } from "./Icons";

interface Props {
  data: AppData;
  currentPlayer: Player | null;
  isAdmin: boolean;
  onPredict: (matchId: string, pred: MatchPrediction | null) => void;
  onConfirmResult: (matchId: string, res: MatchResult | null) => void;
}

type AnyMatch =
  | (Match & { kind: "group"; groupId: string; matchday: number })
  | (KnockoutMatch & { kind: "knockout"; matchday: number; kickoffVN?: string });

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function vnDate(d: Date): string {
  return d.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ScheduleView({
  data,
  currentPlayer,
  isAdmin,
  onPredict,
  onConfirmResult,
}: Props) {
  const resolved = useMemo(
    () => resolveKnockout(tournament.groups, data.results),
    [data],
  );

  // Gom tất cả trận: vòng bảng + vòng trong
  const allMatches = useMemo<AnyMatch[]>(() => {
    const list: AnyMatch[] = [];
    for (const g of tournament.groups) {
      for (const m of g.matches) {
        list.push({ ...m, kind: "group", groupId: g.id });
      }
    }
    for (const r of resolved.rounds) {
      for (const m of r.matches) {
        list.push({ ...m, kind: "knockout" });
      }
    }
    return list;
  }, [resolved]);

  // Lấy danh sách ngày duy nhất có trận
  const allDates = useMemo(() => {
    const set = new Set<string>();
    for (const m of allMatches) {
      const iso = m.kickoffVN ?? m.date;
      if (!iso) continue;
      set.add(ymd(new Date(iso)));
    }
    return Array.from(set).sort();
  }, [allMatches]);

  const [activeDate, setActiveDate] = useState<string>(() => allDates[0] ?? "");

  // Các trận trong ngày đang chọn + ngày hôm sau
  const visibleMatches = useMemo(() => {
    if (!activeDate) return [];
    const d0 = new Date(activeDate + "T00:00:00");
    const d1 = addDays(d0, 1);
    const d2 = addDays(d0, 2);
    const ymdD0 = ymd(d0);
    const ymdD1 = ymd(d1);
    const ymdD2 = ymd(d2);
    return allMatches
      .filter((m) => {
        const iso = m.kickoffVN ?? m.date;
        if (!iso) return false;
        const k = ymd(new Date(iso));
        return k === ymdD0 || k === ymdD1 || k === ymdD2;
      })
      .sort((a, b) => {
        const ka = a.kickoffVN ?? a.date ?? "";
        const kb = b.kickoffVN ?? b.date ?? "";
        return ka.localeCompare(kb);
      });
  }, [allMatches, activeDate]);

  // Nhóm trận theo ngày để hiển thị header cho từng ngày
  const groupedByDate = useMemo(() => {
    const map = new Map<string, AnyMatch[]>();
    for (const m of visibleMatches) {
      const iso = m.kickoffVN ?? m.date;
      if (!iso) continue;
      const k = ymd(new Date(iso));
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(m);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [visibleMatches]);

  if (allDates.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-soft)] text-[var(--text-muted)]">
          <IconCalendar size={24} />
        </div>
        <p className="text-sm text-[var(--text-muted)]">Chưa có trận nào trong dữ liệu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-[var(--text-muted)]">
              <IconCalendar size={13} />
              Lịch thi đấu
            </div>
            <div className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">
              {(() => {
                const d0 = new Date(activeDate + "T00:00:00");
                const d1 = addDays(d0, 1);
                return `Hiển thị trận ${vnDate(d0)} → ${vnDate(d1)}`;
              })()}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const idx = allDates.indexOf(activeDate);
                if (idx > 0) setActiveDate(allDates[idx - 1]);
              }}
              disabled={allDates.indexOf(activeDate) <= 0}
              className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
              title="Ngày trước"
            >
              ‹ Trước
            </button>
            <button
              onClick={() => {
                const idx = allDates.indexOf(activeDate);
                if (idx >= 0 && idx < allDates.length - 1)
                  setActiveDate(allDates[idx + 1]);
              }}
              disabled={allDates.indexOf(activeDate) >= allDates.length - 1}
              className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
              title="Ngày sau"
            >
              Sau ›
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {allDates.map((d) => {
            const dt = new Date(d + "T00:00:00");
            const isActive = d === activeDate;
            return (
              <button
                key={d}
                onClick={() => setActiveDate(d)}
                className={`flex flex-col items-center rounded-xl px-3 py-2 text-xs font-semibold transition-all touch-feedback ${
                  isActive
                    ? "bg-[var(--text-primary)] text-[var(--bg-elevated)] shadow-md"
                    : "bg-[var(--bg-soft)] text-[var(--text-secondary)] hover:bg-[var(--bg-base)]"
                }`}
                title={vnDate(dt)}
              >
                <div className="text-[10px] uppercase tracking-wider opacity-70">
                  {dt.toLocaleDateString("vi-VN", { weekday: "short" })}
                </div>
                <div>{dt.getDate()}/{dt.getMonth() + 1}</div>
              </button>
            );
          })}
        </div>
      </div>

      {groupedByDate.length === 0 ? (
        <div className="card p-6 text-center text-sm text-[var(--text-muted)]">
          Không có trận nào trong khoảng thời gian này.
        </div>
      ) : (
        groupedByDate.map(([dateKey, list], dateIdx) => {
          const dt = new Date(dateKey + "T00:00:00");
          const isToday = dateKey === allDates[0];
          const isTomorrow = dateKey === ymd(addDays(new Date(allDates[0] + "T00:00:00"), 1));
          return (
            <section key={dateKey} className="animate-entrance" style={{ animationDelay: `${dateIdx * 80}ms` }}>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">
                    {vnDate(dt)}
                  </h2>
                  {(isToday || isTomorrow) && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">
                      <IconClock size={9} />
                      {isToday ? "Hôm nay" : "Ngày mai"}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium text-[var(--text-muted)]">
                  {list.length} trận
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {list.map((m, i) => {
                  const isKnockout = m.kind === "knockout";
                  return (
                    <div key={m.id} className="animate-entrance" style={{ animationDelay: `${(dateIdx * 3 + i) * 60}ms` }}>
                    <MatchCard
                      key={m.id}
                      match={
                        m.kind === "group"
                          ? {
                              id: m.id,
                              home: m.home,
                              away: m.away,
                              kickoffVN: m.kickoffVN,
                              date: m.date,
                              venue: m.venue,
                              city: m.city,
                            }
                          : {
                              id: m.id,
                              home: m.home,
                              away: m.away,
                              homeSeed: m.homeSeed,
                              awaySeed: m.awaySeed,
                              date: m.date,
                              venue: m.venue,
                              city: m.city,
                              isKnockout: true,
                            }
                      }
                      data={data}
                      myPrediction={currentPlayer?.predictions[m.id]}
                      result={data.results[m.id]}
                      isAdmin={isAdmin}
                      onPredict={(p) => onPredict(m.id, p)}
                      onConfirmResult={(r) => onConfirmResult(m.id, r)}
                      showSeedWhenUnknown={isKnockout}
                    />
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
