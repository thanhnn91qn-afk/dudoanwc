import type { MatchResult } from "./types";

/** Mã vòng bảng WC 2026: A1–L6 (12 bảng × 6 trận). */
const GROUP_STAGE_MATCH_ID = /^[A-L][1-6]$/;

export function isGroupStageMatchId(id: string): boolean {
  return GROUP_STAGE_MATCH_ID.test(id);
}

/** Kết quả dành cho knockout — bỏ qua mã trùng vòng bảng và trận chưa có đủ 2 đội. */
export function knockoutResultFor(
  matchId: string,
  home: string | null | undefined,
  away: string | null | undefined,
  results: Record<string, MatchResult | undefined>,
): MatchResult | undefined {
  if (isGroupStageMatchId(matchId)) return undefined;
  if (!home || !away) return undefined;
  return results[matchId];
}
