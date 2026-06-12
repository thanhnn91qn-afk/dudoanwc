"use client";

import { useEffect, useState, useCallback } from "react";

export type Theme = "light" | "dark";

const THEME_KEY = "dudoanwc-theme";
const TOKENS_KEY = "dudoanwc-theme-tokens";

export interface ThemeTokens {
  // Primary accent
  pitch: string;
  pitchHover: string;
  pitchSoft: string;
  // Secondary
  accentSky: string;
  // Gold
  accentGold: string;
  accentGoldBg: string;
  // Page
  bgPage: string;
  bgElevated: string;
  bgSoft: string;
  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
}

export interface Preset {
  id: string;
  name: string;
  emoji: string;
  light: ThemeTokens;
  dark: ThemeTokens;
}

// ─── Presets ───
export const PRESETS: Preset[] = [
  {
    id: "charcoal-navy",
    name: "Charcoal Navy",
    emoji: "🌑",
    light: {
      pitch: "#334155",
      pitchHover: "#1e293b",
      pitchSoft: "rgba(51, 65, 85, 0.08)",
      accentSky: "#475569",
      accentGold: "#92400e",
      accentGoldBg: "rgba(146, 64, 14, 0.08)",
      bgPage: "#f7f6f3",
      bgElevated: "#ffffff",
      bgSoft: "rgba(28, 31, 29, 0.04)",
      textPrimary: "#1c1f1d",
      textSecondary: "#545a55",
      textMuted: "#8a8f89",
    },
    dark: {
      pitch: "#cbd5e1",
      pitchHover: "#e2e8f0",
      pitchSoft: "rgba(203, 213, 225, 0.08)",
      accentSky: "#94a3b8",
      accentGold: "#f59e0b",
      accentGoldBg: "rgba(245, 158, 11, 0.12)",
      bgPage: "#0e1211",
      bgElevated: "#1a201d",
      bgSoft: "rgba(255, 255, 255, 0.035)",
      textPrimary: "#e8eae7",
      textSecondary: "#a3aaa3",
      textMuted: "#6f766f",
    },
  },
  {
    id: "muted-pitch",
    name: "Sân cỏ trầm",
    emoji: "🟢",
    light: {
      pitch: "#3f6b3a",
      pitchHover: "#2f5230",
      pitchSoft: "rgba(63, 107, 58, 0.1)",
      accentSky: "#3b5b6b",
      accentGold: "#8a6510",
      accentGoldBg: "rgba(138, 101, 16, 0.1)",
      bgPage: "#f5f4ee",
      bgElevated: "#fdfcf7",
      bgSoft: "rgba(63, 107, 58, 0.05)",
      textPrimary: "#1a2218",
      textSecondary: "#4a554a",
      textMuted: "#7a857a",
    },
    dark: {
      pitch: "#86a373",
      pitchHover: "#a3c08f",
      pitchSoft: "rgba(134, 163, 115, 0.1)",
      accentSky: "#8aa6b0",
      accentGold: "#d4a93a",
      accentGoldBg: "rgba(212, 169, 58, 0.12)",
      bgPage: "#0d1310",
      bgElevated: "#18201a",
      bgSoft: "rgba(255, 255, 255, 0.035)",
      textPrimary: "#dde4d8",
      textSecondary: "#9aa899",
      textMuted: "#6a7568",
    },
  },
  {
    id: "burgundy",
    name: "Burgundy",
    emoji: "🍷",
    light: {
      pitch: "#7c2d3a",
      pitchHover: "#5a1f29",
      pitchSoft: "rgba(124, 45, 58, 0.08)",
      accentSky: "#5a4a6b",
      accentGold: "#8a6510",
      accentGoldBg: "rgba(138, 101, 16, 0.1)",
      bgPage: "#f8f4f2",
      bgElevated: "#fffbf9",
      bgSoft: "rgba(124, 45, 58, 0.04)",
      textPrimary: "#1f1a1b",
      textSecondary: "#5a4a4a",
      textMuted: "#8a7a7a",
    },
    dark: {
      pitch: "#d88a95",
      pitchHover: "#e9a8b0",
      pitchSoft: "rgba(216, 138, 149, 0.1)",
      accentSky: "#b09ac0",
      accentGold: "#d4a93a",
      accentGoldBg: "rgba(212, 169, 58, 0.14)",
      bgPage: "#15101a",
      bgElevated: "#1f1820",
      bgSoft: "rgba(255, 255, 255, 0.035)",
      textPrimary: "#e8dde0",
      textSecondary: "#a89aa0",
      textMuted: "#756a70",
    },
  },
  {
    id: "ocean",
    name: "Ocean Teal",
    emoji: "🌊",
    light: {
      pitch: "#0e7490",
      pitchHover: "#0a5a72",
      pitchSoft: "rgba(14, 116, 144, 0.08)",
      accentSky: "#0369a1",
      accentGold: "#a16207",
      accentGoldBg: "rgba(161, 98, 7, 0.1)",
      bgPage: "#f3f6f7",
      bgElevated: "#ffffff",
      bgSoft: "rgba(14, 116, 144, 0.04)",
      textPrimary: "#0f1a1d",
      textSecondary: "#3a4a55",
      textMuted: "#6a7882",
    },
    dark: {
      pitch: "#5fc7e0",
      pitchHover: "#7fd5e8",
      pitchSoft: "rgba(95, 199, 224, 0.12)",
      accentSky: "#7fc7e0",
      accentGold: "#fbbf24",
      accentGoldBg: "rgba(251, 191, 36, 0.12)",
      bgPage: "#0a1418",
      bgElevated: "#152126",
      bgSoft: "rgba(255, 255, 255, 0.035)",
      textPrimary: "#dde8eb",
      textSecondary: "#9bb0b8",
      textMuted: "#6a7882",
    },
  },
  {
    id: "warm-sand",
    name: "Warm Sand",
    emoji: "🏜️",
    light: {
      pitch: "#9a4a1f",
      pitchHover: "#7a3818",
      pitchSoft: "rgba(154, 74, 31, 0.08)",
      accentSky: "#6b584a",
      accentGold: "#a16207",
      accentGoldBg: "rgba(161, 98, 7, 0.1)",
      bgPage: "#f7f3ec",
      bgElevated: "#fefbf6",
      bgSoft: "rgba(154, 74, 31, 0.04)",
      textPrimary: "#1f1812",
      textSecondary: "#5a4a3a",
      textMuted: "#8a7560",
    },
    dark: {
      pitch: "#e09a6f",
      pitchHover: "#ecb287",
      pitchSoft: "rgba(224, 154, 111, 0.12)",
      accentSky: "#b09a8a",
      accentGold: "#fbbf24",
      accentGoldBg: "rgba(251, 191, 36, 0.14)",
      bgPage: "#161210",
      bgElevated: "#1f1a16",
      bgSoft: "rgba(255, 255, 255, 0.035)",
      textPrimary: "#e8dcd0",
      textSecondary: "#a89886",
      textMuted: "#756858",
    },
  },
];

const STORAGE_KEY = "dudoanwc-theme";
const TOKENS_STORAGE_KEY = "dudoanwc-theme-tokens";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialTokens(): { presetId: string; overrides: Partial<Record<Theme, Partial<ThemeTokens>>> } {
  if (typeof window === "undefined") return { presetId: PRESETS[0].id, overrides: {} };
  try {
    const raw = window.localStorage.getItem(TOKENS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.presetId && PRESETS.some((p) => p.id === parsed.presetId)) {
        return {
          presetId: parsed.presetId,
          overrides: parsed.overrides ?? {},
        };
      }
    }
  } catch {}
  return { presetId: PRESETS[0].id, overrides: {} };
}

function getEffectiveTokens(presetId: string, overrides: Partial<Record<Theme, Partial<ThemeTokens>>>, theme: Theme): ThemeTokens {
  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0];
  const base = theme === "dark" ? preset.dark : preset.light;
  return { ...base, ...(overrides[theme] ?? {}) };
}

function applyTokensToDOM(theme: Theme, tokens: ThemeTokens) {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");

  root.style.setProperty("--pitch", tokens.pitch);
  root.style.setProperty("--pitch-hover", tokens.pitchHover);
  root.style.setProperty("--pitch-soft", tokens.pitchSoft);
  root.style.setProperty("--accent-sky", tokens.accentSky);
  root.style.setProperty("--accent-gold", tokens.accentGold);
  root.style.setProperty("--accent-gold-bg", tokens.accentGoldBg);
  root.style.setProperty("--bg-page", tokens.bgPage);
  root.style.setProperty("--bg-elevated", tokens.bgElevated);
  root.style.setProperty("--bg-soft", tokens.bgSoft);
  root.style.setProperty("--text-primary", tokens.textPrimary);
  root.style.setProperty("--text-secondary", tokens.textSecondary);
  root.style.setProperty("--text-muted", tokens.textMuted);
}

export function useTheme(): [Theme, (t: Theme) => void, () => void] {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setThemeState(getInitialTheme());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme, mounted]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggle = () => setThemeState(theme === "dark" ? "light" : "dark");

  return [theme, setTheme, toggle];
}

export function useThemeTokens() {
  const [theme] = useTheme();
  const [presetId, setPresetId] = useState<string>(PRESETS[0].id);
  const [overrides, setOverrides] = useState<Partial<Record<Theme, Partial<ThemeTokens>>>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = getInitialTokens();
    setPresetId(initial.presetId);
    setOverrides(initial.overrides);
    setMounted(true);
  }, []);

  // Apply on theme/preset/overrides change
  useEffect(() => {
    if (!mounted) return;
    const tokens = getEffectiveTokens(presetId, overrides, theme);
    applyTokensToDOM(theme, tokens);
    try {
      window.localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify({ presetId, overrides }));
    } catch {}
  }, [theme, presetId, overrides, mounted]);

  const tokens = getEffectiveTokens(presetId, overrides, theme);

  const setToken = useCallback(
    (key: keyof ThemeTokens, value: string) => {
      setOverrides((prev) => ({
        ...prev,
        [theme]: { ...(prev[theme] ?? {}), [key]: value },
      }));
    },
    [theme],
  );

  const resetOverride = useCallback(
    (key: keyof ThemeTokens) => {
      setOverrides((prev) => {
        const next = { ...(prev[theme] ?? {}) };
        delete next[key];
        return { ...prev, [theme]: next };
      });
    },
    [theme],
  );

  const resetAll = useCallback(() => {
    setOverrides({});
  }, []);

  return {
    theme,
    presetId,
    setPresetId,
    tokens,
    setToken,
    resetOverride,
    resetAll,
    presets: PRESETS,
  };
}
