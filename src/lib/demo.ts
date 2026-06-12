import type { AppData, MatchResult } from "./types";
import { tournament } from "@/data/tournament";
import { KNOCKOUT_ROUNDS } from "@/data/knockout";
import { setResultRemote } from "./dataSource";
import { supabase } from "./supabase";

/**
 * Pseudo-random dùng cho demo, dùng seed cố định để có kết quả ổn định giữa
 * các lần bấm nút.
 */
function makeRand(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function fakeResult(rand: () => number): MatchResult {
  const r = rand();
  let winner: "home" | "away" | "draw";
  let scoreHome: number;
  let scoreAway: number;
  if (r < 0.55) {
    winner = "home";
    scoreHome = 1 + Math.floor(rand() * 3);
    scoreAway = Math.floor(rand() * 2);
  } else if (r < 0.8) {
    winner = "draw";
    const sc = Math.floor(rand() * 3);
    scoreHome = sc;
    scoreAway = sc;
  } else {
    winner = "away";
    scoreHome = Math.floor(rand() * 2);
    scoreAway = 1 + Math.floor(rand() * 3);
  }
  return { winner, scoreHome, scoreAway, finalizedAt: Date.now() };
}

export async function fillGroupStageDemo(
  data: AppData,
  actorName: string | null,
): Promise<AppData> {
  if (!supabase) return data;
  const results = { ...data.results };
  const rand = makeRand(42);
  for (const g of tournament.groups) {
    for (const m of g.matches) {
      const r = fakeResult(rand);
      const prev = results[m.id] ?? null;
      results[m.id] = r;
      await setResultRemote(actorName, m.id, r, prev);
    }
  }
  return { ...data, results };
}

export async function fillKnockoutDemo(
  data: AppData,
  actorName: string | null,
): Promise<AppData> {
  if (!supabase) return data;
  let results = { ...data.results };
  if (Object.keys(results).length < 72) {
    const rand = makeRand(42);
    for (const g of tournament.groups) {
      for (const m of g.matches) {
        const r = fakeResult(rand);
        const prev = results[m.id] ?? null;
        results[m.id] = r;
        await setResultRemote(actorName, m.id, r, prev);
      }
    }
  }
  // Fill tất cả các trận knockout — knockout không có hoà
  const rand = makeRand(7);
  for (const round of KNOCKOUT_ROUNDS) {
    for (const m of round.matches) {
      const r = rand();
      const winner: "home" | "away" = r < 0.55 ? "home" : "away";
      const scoreHome = 1 + Math.floor(rand() * 3);
      const scoreAway =
        winner === "home" ? Math.floor(rand() * 2) : 1 + Math.floor(rand() * 3);
      const result: MatchResult = {
        winner,
        scoreHome,
        scoreAway,
        finalizedAt: Date.now(),
      };
      const prev = results[m.id] ?? null;
      results[m.id] = result;
      await setResultRemote(actorName, m.id, result, prev);
    }
  }
  return { ...data, results };
}
