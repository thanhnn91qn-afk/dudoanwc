"use client";

import { useEffect, useState } from "react";
import type { Player } from "@/lib/types";
import { IconSoccer, IconCloud, IconArrowRight } from "./Icons";

interface Props {
  players: Player[];
  onLogin: (name: string) => void;
  onCreate: (name: string) => void;
  onReset: () => void;
}

export default function LoginScreen({ players, onLogin, onCreate, onReset }: Props) {
  const [name, setName] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const last =
      typeof window !== "undefined"
        ? window.localStorage.getItem("dudoanwc2026:lastName")
        : null;
    if (last) setName(last);
  }, []);

  const match = players.find(
    (p) => p.name.trim().toLowerCase() === name.trim().toLowerCase(),
  );
  const canSubmit = name.trim().length > 0;

  return (
    <div className="app-bg mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-8 p-6">
      {/* Hero */}
      <div className="animate-entrance animate-entrance-1 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-sky-500 text-white shadow-xl shadow-emerald-500/30">
          <IconSoccer size={40} />
        </div>
        <h1 className="bg-gradient-to-r from-emerald-600 to-sky-600 bg-clip-text text-3xl font-black tracking-tight text-transparent dark:from-emerald-400 dark:to-sky-400">
          Dự đoán World Cup 2026
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          Đăng nhập hoặc đăng ký tên để bắt đầu dự đoán cùng bạn bè.
          <br />
          Ai dự đoán giỏi nhất?
        </p>
      </div>

      {/* Form card */}
      <div className="card-elevated animate-entrance animate-entrance-2 w-full p-6">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            if (match) {
              onLogin(match.name);
            } else {
              onCreate(name);
            }
          }}
        >
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[var(--text-primary)]">
              Tên của bạn
            </label>
            <div className="relative">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Ví dụ: Minh, Lan, Hoàng..."
                className={`w-full rounded-xl border-2 bg-[var(--bg-input)] px-4 py-3.5 text-base font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all ${
                  isFocused
                    ? "border-emerald-500 shadow-lg shadow-emerald-500/15"
                    : "border-[var(--border-medium)] hover:border-[var(--text-muted)]"
                }`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="btn-primary flex w-full items-center justify-center gap-2 py-3.5 text-base"
          >
            <span>{match ? `Vào với tên "${match.name}"` : "Bắt đầu dự đoán"}</span>
            <IconArrowRight size={16} />
          </button>

          {players.length > 0 && (
            <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-soft)] p-3">
              <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Đã có {players.length} người chơi
              </div>
              <div className="flex flex-wrap gap-1.5">
                {players.slice(0, 12).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setName(p.name)}
                    className="flex items-center gap-1 rounded-lg bg-[var(--bg-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] shadow-sm transition-all hover:scale-105 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-500/20 dark:hover:text-emerald-300"
                  >
                    {p.name}
                  </button>
                ))}
                {players.length > 12 && (
                  <span className="flex items-center px-2 py-1 text-xs text-[var(--text-muted)]">
                    +{players.length - 12} khác
                  </span>
                )}
              </div>
            </div>
          )}
        </form>

        {/* Reset toggle */}
        <div className="mt-4 border-t border-[var(--border-soft)] pt-4">
          <button
            onClick={() => setShowReset((s) => !s)}
            className="text-xs text-[var(--text-muted)] underline-offset-4 transition-colors hover:text-rose-500 hover:underline"
          >
            {showReset ? "Đóng" : "Quản lý / xoá dữ liệu"}
          </button>
          {showReset && (
            <div className="mt-3 rounded-xl border border-rose-300/50 bg-rose-50 p-4 dark:border-rose-500/30 dark:bg-rose-500/10">
              <p className="mb-3 text-xs leading-relaxed text-rose-700 dark:text-rose-200">
                Xoá toàn bộ người chơi, dự đoán và kết quả. Hành động này không thể hoàn tác.
              </p>
              <button
                onClick={() => {
                  if (window.confirm("Xoá tất cả dữ liệu? Hành động này không thể hoàn tác."))
                    onReset();
                }}
                className="rounded-lg bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-rose-500/30 transition-all hover:bg-rose-400 active:scale-95"
              >
                Xoá tất cả dữ liệu
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer note */}
      <div className="animate-entrance animate-entrance-3 flex items-center gap-2 text-center text-[11px] text-[var(--text-muted)]">
        <IconCloud size={13} />
        <span>Dữ liệu đồng bộ trên server — mọi người chơi thấy cập nhật theo thời gian thực.</span>
      </div>
    </div>
  );
}