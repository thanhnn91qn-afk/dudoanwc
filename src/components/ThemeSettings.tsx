"use client";

import { useThemeTokens, type ThemeTokens, type Preset } from "@/lib/useThemeTokens";
import { IconCheck, IconSun } from "./Icons";
import { useState } from "react";

interface Props {
  onClose: () => void;
}

interface ColorField {
  key: keyof ThemeTokens;
  label: string;
  hint?: string;
}

const COLOR_FIELDS: ColorField[] = [
  { key: "pitch", label: "Primary (nút, điểm số, accent)", hint: "Màu chính của app" },
  { key: "pitchHover", label: "Primary hover" },
  { key: "pitchSoft", label: "Primary nền nhạt" },
  { key: "accentSky", label: "Accent phụ (đội khách)" },
  { key: "accentGold", label: "Vàng (champion, hạng nhất)" },
  { key: "accentGoldBg", label: "Vàng nền nhạt" },
  { key: "bgPage", label: "Nền trang" },
  { key: "bgElevated", label: "Nền thẻ" },
  { key: "bgSoft", label: "Nền phụ" },
  { key: "textPrimary", label: "Chữ chính" },
  { key: "textSecondary", label: "Chữ phụ" },
  { key: "textMuted", label: "Chữ mờ" },
];

// Convert hex to rgba so we can use alpha in soft tones
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function ThemeSettings({ onClose }: Props) {
  const {
    theme,
    presetId,
    setPresetId,
    tokens,
    setToken,
    resetAll,
    presets,
  } = useThemeTokens();

  const [tab, setTab] = useState<"presets" | "advanced">("presets");

  // For non-hex values (rgba), still allow editing raw text
  const handleColorChange = (key: keyof ThemeTokens, val: string) => {
    // If it's a soft/alpha field, allow rgba input; else normalize
    if (val.startsWith("rgba") || val.startsWith("rgb")) {
      setToken(key, val);
      return;
    }
    if (val.startsWith("#")) {
      setToken(key, val);
      // If user is editing pitch/pitchHover, offer to update pitchSoft to match with alpha
      if (key === "pitch") {
        setToken("pitchSoft", hexToRgba(val, 0.08));
      }
      return;
    }
    setToken(key, val);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="card-elevated animate-scale-in relative w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--bg-elevated)] px-5 py-4">
          <div className="flex items-center gap-2">
            <IconSun size={18} className="text-[var(--pitch)]" />
            <div>
              <div className="font-bold text-[var(--text-primary)]">
                Tuỳ chỉnh giao diện
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                Cấu hình màu sắc áp dụng cho tất cả người dùng trong trình duyệt này
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)]"
            title="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[var(--border-soft)] bg-[var(--bg-page)] px-5 pt-3">
          <TabBtn active={tab === "presets"} onClick={() => setTab("presets")}>
            Presets có sẵn
          </TabBtn>
          <TabBtn active={tab === "advanced"} onClick={() => setTab("advanced")}>
            Chỉnh chi tiết
          </TabBtn>
          <div className="ml-auto pb-2 text-[11px] text-[var(--text-muted)]">
            Đang xem: <strong className="text-[var(--text-secondary)]">{theme === "dark" ? "Dark" : "Light"} mode</strong>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {tab === "presets" && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--text-secondary)]">
                Chọn một preset rồi tinh chỉnh thêm trong tab <strong>Chỉnh chi tiết</strong> nếu muốn.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {presets.map((p) => (
                  <PresetCard
                    key={p.id}
                    preset={p}
                    active={presetId === p.id}
                    onSelect={() => setPresetId(p.id)}
                  />
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl border border-[var(--border-soft)] bg-[var(--bg-soft)] p-3">
                <div className="text-xs text-[var(--text-secondary)]">
                  Đã chỉnh sửa thủ công? Reset về preset gốc.
                </div>
                <button
                  onClick={resetAll}
                  className="rounded-lg border border-[var(--border-medium)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/20 dark:hover:text-rose-300"
                >
                  Xoá tất cả tuỳ chỉnh
                </button>
              </div>
            </div>
          )}

          {tab === "advanced" && (
            <div className="space-y-2.5">
              <p className="mb-2 text-xs text-[var(--text-secondary)]">
                Chỉnh trực tiếp từng màu. Hỗ trợ hex (<code className="rounded bg-[var(--bg-soft)] px-1.5 py-0.5">#334155</code>)
                hoặc rgba (<code className="rounded bg-[var(--bg-soft)] px-1.5 py-0.5">rgba(51,65,85,0.08)</code>).
              </p>
              {COLOR_FIELDS.map((field) => (
                <div
                  key={field.key}
                  className="grid grid-cols-[36px_1fr_auto] items-center gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-elevated)] p-2.5"
                >
                  <div
                    className="h-9 w-9 rounded-lg border border-[var(--border-soft)]"
                    style={{
                      background: tokens[field.key],
                      backgroundImage:
                        tokens[field.key].startsWith("rgba") ? "none" : undefined,
                    }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[var(--text-primary)]">
                      {field.label}
                    </div>
                    <div className="truncate text-[10px] text-[var(--text-muted)]">
                      {field.hint ?? field.key}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={tokens[field.key]}
                      onChange={(e) => handleColorChange(field.key, e.target.value)}
                      className="w-36 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-input)] px-2 py-1.5 font-mono text-[11px] text-[var(--text-primary)] outline-none focus:border-[var(--pitch)]"
                    />
                    <input
                      type="color"
                      value={isHexColor(tokens[field.key]) ? tokens[field.key] : "#000000"}
                      onChange={(e) => handleColorChange(field.key, e.target.value)}
                      className="h-8 w-8 cursor-pointer rounded-lg border-0 bg-transparent"
                      title="Chọn màu"
                    />
                  </div>
                </div>
              ))}
              <div className="mt-3 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-soft)] p-3 text-[11px] text-[var(--text-muted)]">
                Mẹo: đổi màu ở Light mode sẽ không ảnh hưởng Dark mode và ngược lại. Cấu hình lưu trong trình duyệt này.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabBtn({
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
      className={`rounded-t-xl px-4 py-2 text-xs font-semibold transition-colors ${
        active
          ? "border-b-2 border-[var(--pitch)] text-[var(--pitch)]"
          : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
      }`}
    >
      {children}
    </button>
  );
}

function isHexColor(v: string): boolean {
  return /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(v);
}

function PresetCard({
  preset,
  active,
  onSelect,
}: {
  preset: Preset;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`group relative flex flex-col gap-2 rounded-2xl border p-3 text-left transition-all ${
        active
          ? "border-[var(--pitch)] shadow-md shadow-black/10"
          : "border-[var(--border-soft)] hover:border-[var(--border-medium)]"
      }`}
      style={{ background: "var(--bg-elevated)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{preset.emoji}</span>
          <span className="text-sm font-bold text-[var(--text-primary)]">
            {preset.name}
          </span>
        </div>
        {active && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--pitch)] text-white">
            <IconCheck size={12} />
          </span>
        )}
      </div>
      <div className="flex h-8 gap-1 overflow-hidden rounded-lg">
        <div className="flex-1" style={{ background: preset.light.pitch }} />
        <div className="flex-1" style={{ background: preset.light.accentSky }} />
        <div className="flex-1" style={{ background: preset.light.accentGold }} />
        <div className="flex-1" style={{ background: preset.light.bgPage }} />
        <div className="flex-1" style={{ background: preset.light.textPrimary }} />
      </div>
      <div className="flex h-6 gap-1 overflow-hidden rounded-lg">
        <div className="flex-1" style={{ background: preset.dark.pitch }} />
        <div className="flex-1" style={{ background: preset.dark.accentSky }} />
        <div className="flex-1" style={{ background: preset.dark.accentGold }} />
        <div className="flex-1" style={{ background: preset.dark.bgPage }} />
        <div className="flex-1" style={{ background: preset.dark.textPrimary }} />
      </div>
    </button>
  );
}
