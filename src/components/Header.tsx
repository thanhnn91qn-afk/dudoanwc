"use client";

import { useTheme } from "@/lib/useTheme";
import {
  IconSoccer,
  IconUsers,
  IconTarget,
  IconCheck,
  IconSun,
  IconMoon,
  IconWrench,
  IconLogout,
} from "./Icons";

interface Props {
  user: string | null;
  isAdmin: boolean;
  onToggleAdmin: () => void;
  onLogout: () => void;
  totalPlayers: number;
  totalPredictions: number;
  totalResults: number;
}

export default function Header({
  user,
  isAdmin,
  onToggleAdmin,
  onLogout,
  totalPlayers,
  totalPredictions,
  totalResults,
}: Props) {
  const [theme, , toggle] = useTheme();

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border-soft)] bg-[var(--bg-elevated)]/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-sky-500 text-white shadow-md shadow-emerald-500/20">
            <IconSoccer size={22} />
          </div>
          <div>
            <div className="text-base font-bold leading-tight text-[var(--text-primary)]">
              World Cup 2026
            </div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
              Dự đoán cùng bạn bè
            </div>
          </div>
        </div>

        {/* Stats pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-[var(--bg-soft)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
            <IconUsers size={13} className="text-emerald-500" />
            <span>{totalPlayers}</span>
            <span className="hidden sm:inline text-[var(--text-muted)]">người</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-[var(--bg-soft)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
            <IconTarget size={13} className="text-sky-500" />
            <span>{totalPredictions}</span>
            <span className="hidden sm:inline text-[var(--text-muted)]">lượt đoán</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-[var(--bg-soft)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
            <IconCheck size={13} className="text-emerald-500" />
            <span>{totalResults}</span>
            <span className="hidden sm:inline text-[var(--text-muted)]">kết quả</span>
          </div>
        </div>

        {/* User controls */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggle}
            title={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
            aria-label="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bg-soft)] text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-base)] hover:text-[var(--text-primary)] active:scale-95"
          >
            {theme === "dark" ? <IconSun size={17} /> : <IconMoon size={17} />}
          </button>

          {user ? (
            <>
              {/* Admin toggle */}
              <button
                onClick={onToggleAdmin}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                  isAdmin
                    ? "bg-amber-400 text-amber-950 shadow-md shadow-amber-400/20 hover:bg-amber-300 active:scale-95"
                    : "bg-[var(--bg-soft)] text-[var(--text-secondary)] hover:bg-[var(--bg-base)] active:scale-95"
                }`}
                title="Bật/tắt chế độ quản trị"
              >
                <IconWrench size={14} />
                <span className="hidden sm:inline">{isAdmin ? "Admin" : "Chế độ Admin"}</span>
                {isAdmin && <span className="hidden sm:inline">✓</span>}
              </button>

              {/* User badge */}
              <div className="flex items-center gap-1.5 rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-300">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-black">
                  {user[0].toUpperCase()}
                </span>
                <span className="max-w-24 truncate">{user}</span>
              </div>

              {/* Logout */}
              <button
                onClick={onLogout}
                title="Đổi tên"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bg-soft)] text-[var(--text-secondary)] transition-all hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-500/20 dark:hover:text-rose-300 active:scale-95"
              >
                <IconLogout size={15} />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}