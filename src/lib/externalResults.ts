import { KNOCKOUT_ROUNDS } from "@/data/knockout";
import { tournament } from "@/data/tournament";
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

export interface SyncPlan {
  sourceUrl: string;
  externalFinishedCount: number;
  updates: SyncPlanItem[];
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
  for (const round of KNOCKOUT_ROUNDS) {
    for (const m of round.matches) {
      if (m.home && m.away) {
        list.push({ id: m.id, home: m.home, away: m.away, isKnockout: true });
      }
    }
  }
  return list;
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
  localMatches: LocalMatchRef[],
  currentResults: Record<string, MatchResult>,
  sourceUrl: string,
): SyncPlan {
  const updates: SyncPlanItem[] = [];
  const unchanged: string[] = [];
  const skipped: SyncPlan["skipped"] = [];
  const unmatchedExternal: SyncPlan["unmatchedExternal"] = [];

  // Map cặp đội → danh sách trận local (hiếm khi trùng)
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

  let externalFinishedCount = 0;
  const matchedLocalIds = new Set<string>();

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
    matchedLocalIds.add(local.id);

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
      unchanged.push(local.id);
      continue;
    }

    updates.push({
      matchId: local.id,
      home: local.home,
      away: local.away,
      result: parsed.result,
      previousResult: previous,
      externalScore: parsed.label,
    });
  }

  return {
    sourceUrl,
    externalFinishedCount,
    updates,
    unchanged,
    skipped,
    unmatchedExternal,
  };
}
