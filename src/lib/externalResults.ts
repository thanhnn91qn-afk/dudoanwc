import { KNOCKOUT_ROUNDS } from "@/data/knockout";
import { tournament } from "@/data/tournament";
import { resolveKnockout } from "@/lib/knockout";
import type { MatchResult } from "./types";
import { canonicalEn, pairKey, viToEn } from "./teamNamesEn";

/** Fork cập nhật nhanh hơn trong giải; fallback về repo gốc openfootball. */
export const PRIMARY_RESULTS_URL =
  process.env.WC_RESULTS_API_URL ??
  "https://raw.githubusercontent.com/upbound-web/worldcup-live.json/master/2026/worldcup.json";

export const FALLBACK_RESULTS_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

interface ExternalMatch {
  round?: string;
  date?: string;
  team1?: string;
  team2?: string;
  score?: { ft?: [number, number]; pen?: [number, number] };
  group?: string;
}

interface ExternalPayload {
  matches?: ExternalMatch[];
}

export interface LocalMatchRef {
  id: string;
  home: string;
  away: string;
  isKnockout: boolean;
}

export interface SyncPlanItem {
  matchId: string;
  home: string;
  away: string;
  result: MatchResult;
  previousResult: MatchResult | null;
  externalScore: string;
}

export interface SyncRemovalItem {
  matchId: string;
  label: string;
  reason: string;
  previousResult: MatchResult;
}

export interface SyncPlan {
  sourceUrl: string;
  externalFinishedCount: number;
  /** Số kết quả đang có trong DB được đối chiếu lại. */
  reconciledCount: number;
  updates: SyncPlanItem[];
  removals: SyncRemovalItem[];
  unchanged: string[];
  skipped: { matchId?: string; label: string; reason: string }[];
  unmatchedExternal: { team1: string; team2: string; score: string }[];
}

export function collectLocalMatches(): LocalMatchRef[] {
  const list: LocalMatchRef[] = [];
  for (const g of tournament.groups) {
    for (const m of g.matches) {
      if (m.home && m.away) {
        list.push({ id: m.id, home: m.home, away: m.away, isKnockout: false });
      }
    }
  }
  return list;
}

/** Vòng bảng + knockout đã resolve đội (dựa trên kết quả hiện có). */
export function collectLocalMatchesForSync(
  currentResults: Record<string, MatchResult>,
): LocalMatchRef[] {
  const list = collectLocalMatches();
  const resolved = resolveKnockout(tournament.groups, currentResults);
  for (const round of resolved.rounds) {
    for (const m of round.matches) {
      if (!m.home || !m.away) continue;
      if (list.some((x) => x.id === m.id)) continue;
      list.push({ id: m.id, home: m.home, away: m.away, isKnockout: true });
    }
  }
  return list;
}

interface LocalMatchMeta {
  id: string;
  home: string | null | undefined;
  away: string | null | undefined;
  isKnockout: boolean;
  homeSeed?: string;
  awaySeed?: string;
}

function getLocalMatchMeta(
  matchId: string,
  currentResults: Record<string, MatchResult>,
): LocalMatchMeta | null {
  for (const g of tournament.groups) {
    for (const m of g.matches) {
      if (m.id === matchId) {
        return { id: m.id, home: m.home, away: m.away, isKnockout: false };
      }
    }
  }
  const resolved = resolveKnockout(tournament.groups, currentResults);
  for (const round of resolved.rounds) {
    for (const m of round.matches) {
      if (m.id === matchId) {
        return {
          id: m.id,
          home: m.home,
          away: m.away,
          isKnockout: true,
          homeSeed: m.homeSeed,
          awaySeed: m.awaySeed,
        };
      }
    }
  }
  for (const round of KNOCKOUT_ROUNDS) {
    for (const m of round.matches) {
      if (m.id === matchId) {
        return {
          id: m.id,
          home: m.home,
          away: m.away,
          isKnockout: true,
          homeSeed: m.homeSeed,
          awaySeed: m.awaySeed,
        };
      }
    }
  }
  return null;
}

function resultsEqual(a: MatchResult, b: MatchResult): boolean {
  return (
    a.winner === b.winner &&
    a.scoreHome === b.scoreHome &&
    a.scoreAway === b.scoreAway
  );
}

function parseExternalResult(
  ext: ExternalMatch,
  isKnockout: boolean,
): { result: MatchResult; label: string } | { error: string } {
  const ft = ext.score?.ft;
  if (!ft || ft.length !== 2) {
    return { error: "Chưa có tỉ số FT" };
  }
  const [scoreHome, scoreAway] = ft;
  const pen = ext.score?.pen;

  if (scoreHome > scoreAway) {
    return {
      result: {
        winner: "home",
        scoreHome,
        scoreAway,
        finalizedAt: Date.now(),
      },
      label: `${scoreHome}-${scoreAway}`,
    };
  }
  if (scoreAway > scoreHome) {
    return {
      result: {
        winner: "away",
        scoreHome,
        scoreAway,
        finalizedAt: Date.now(),
      },
      label: `${scoreHome}-${scoreAway}`,
    };
  }

  // Hoà FT
  if (isKnockout) {
    if (pen && pen.length === 2) {
      const winner = pen[0] > pen[1] ? "home" : "away";
      return {
        result: {
          winner,
          scoreHome,
          scoreAway,
          finalizedAt: Date.now(),
        },
        label: `${scoreHome}-${scoreAway} (pen ${pen[0]}-${pen[1]})`,
      };
    }
    return { error: "Vòng knockout hoà FT nhưng chưa có luân lưu" };
  }

  return {
    result: {
      winner: "draw",
      scoreHome,
      scoreAway,
      finalizedAt: Date.now(),
    },
    label: `${scoreHome}-${scoreAway}`,
  };
}

export async function fetchExternalPayload(
  url = PRIMARY_RESULTS_URL,
): Promise<{ url: string; matches: ExternalMatch[] }> {
  const res = await fetch(url, {
    next: { revalidate: 0 },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Không tải được dữ liệu (${res.status}): ${url}`);
  }
  const data = (await res.json()) as ExternalPayload;
  return { url, matches: data.matches ?? [] };
}

export async function fetchExternalPayloadWithFallback(): Promise<{
  url: string;
  matches: ExternalMatch[];
}> {
  try {
    return await fetchExternalPayload(PRIMARY_RESULTS_URL);
  } catch {
    return await fetchExternalPayload(FALLBACK_RESULTS_URL);
  }
}

export function buildSyncPlan(
  externalMatches: ExternalMatch[],
  currentResults: Record<string, MatchResult>,
  sourceUrl: string,
): SyncPlan {
  const localMatches = collectLocalMatchesForSync(currentResults);
  const updates: SyncPlanItem[] = [];
  const removals: SyncRemovalItem[] = [];
  const unchanged: string[] = [];
  const skipped: SyncPlan["skipped"] = [];
  const unmatchedExternal: SyncPlan["unmatchedExternal"] = [];
  const updateIds = new Set<string>();
  const removalIds = new Set<string>();

  const localByPair = new Map<string, LocalMatchRef[]>();
  for (const m of localMatches) {
    const homeEn = viToEn(m.home);
    const awayEn = viToEn(m.away);
    if (!homeEn || !awayEn) {
      skipped.push({
        matchId: m.id,
        label: `${m.home} vs ${m.away}`,
        reason: "Thiếu map tên đội sang tiếng Anh",
      });
      continue;
    }
    const key = pairKey(homeEn, awayEn);
    const arr = localByPair.get(key) ?? [];
    arr.push(m);
    localByPair.set(key, arr);
  }

  const extAllByPair = new Map<string, ExternalMatch>();
  for (const ext of externalMatches) {
    if (!ext.team1 || !ext.team2) continue;
    extAllByPair.set(pairKey(ext.team1, ext.team2), ext);
  }

  let externalFinishedCount = 0;

  // Pass 1: API có tỉ số → cập nhật / giữ nguyên
  for (const ext of externalMatches) {
    if (!ext.team1 || !ext.team2 || !ext.score?.ft) continue;
    externalFinishedCount += 1;

    const key = pairKey(ext.team1, ext.team2);
    const candidates = localByPair.get(key);
    if (!candidates?.length) {
      unmatchedExternal.push({
        team1: ext.team1,
        team2: ext.team2,
        score: `${ext.score.ft[0]}-${ext.score.ft[1]}`,
      });
      continue;
    }

    const local = candidates[0];
    const parsed = parseExternalResult(ext, local.isKnockout);
    if ("error" in parsed) {
      skipped.push({
        matchId: local.id,
        label: `${local.home} vs ${local.away}`,
        reason: parsed.error,
      });
      continue;
    }

    const previous = currentResults[local.id] ?? null;
    if (previous && resultsEqual(previous, parsed.result)) {
      if (!unchanged.includes(local.id)) unchanged.push(local.id);
      continue;
    }

    if (!updateIds.has(local.id)) {
      updates.push({
        matchId: local.id,
        home: local.home,
        away: local.away,
        result: parsed.result,
        previousResult: previous,
        externalScore: parsed.label,
      });
      updateIds.add(local.id);
    }
  }

  // Pass 2: đối chiếu lại TOÀN BỘ kết quả đang có trong DB từ đầu giải
  for (const [matchId, previousResult] of Object.entries(currentResults)) {
    const meta = getLocalMatchMeta(matchId, currentResults);
    const label =
      meta?.home && meta?.away
        ? `${meta.home} vs ${meta.away}`
        : meta
          ? `${matchId} (${meta.homeSeed ?? "?"} vs ${meta.awaySeed ?? "?"})`
          : matchId;

    if (!meta) {
      if (!removalIds.has(matchId)) {
        removals.push({
          matchId,
          label,
          reason: "Không có trong lịch giải",
          previousResult,
        });
        removalIds.add(matchId);
      }
      continue;
    }

    if (!meta.home || !meta.away) {
      if (!removalIds.has(matchId)) {
        removals.push({
          matchId,
          label,
          reason: "Chưa xác định đủ 2 đội — xoá kết quả nhập nhầm",
          previousResult,
        });
        removalIds.add(matchId);
      }
      continue;
    }

    const homeEn = viToEn(meta.home);
    const awayEn = viToEn(meta.away);
    if (!homeEn || !awayEn) continue;

    const ext = extAllByPair.get(pairKey(homeEn, awayEn));
    if (!ext) continue;

    if (!ext.score?.ft) {
      if (!removalIds.has(matchId)) {
        removals.push({
          matchId,
          label,
          reason: "API chưa có tỉ số — xoá kết quả chốt sớm",
          previousResult,
        });
        removalIds.add(matchId);
      }
      continue;
    }

    const parsed = parseExternalResult(ext, meta.isKnockout);
    if ("error" in parsed) continue;

    if (resultsEqual(previousResult, parsed.result)) {
      if (!unchanged.includes(matchId)) unchanged.push(matchId);
      continue;
    }

    if (!updateIds.has(matchId)) {
      updates.push({
        matchId,
        home: meta.home,
        away: meta.away,
        result: parsed.result,
        previousResult,
        externalScore: parsed.label,
      });
      updateIds.add(matchId);
    }
  }

  return {
    sourceUrl,
    externalFinishedCount,
    reconciledCount: Object.keys(currentResults).length,
    updates,
    removals,
    unchanged,
    skipped,
    unmatchedExternal,
  };
}
