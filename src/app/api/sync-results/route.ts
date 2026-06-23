import { NextResponse } from "next/server";
import { setResultRemote } from "@/lib/dataSource";
import {
  buildSyncPlan,
  fetchExternalPayloadWithFallback,
} from "@/lib/externalResults";
import { supabase } from "@/lib/supabase";
import type { MatchResult } from "@/lib/types";

async function loadCurrentResults(): Promise<Record<string, MatchResult>> {
  if (!supabase) return {};
  const { data, error } = await supabase.from("wc_results").select(
    "match_id, winner, score_home, score_away, finalized_at",
  );
  if (error) throw error;
  const results: Record<string, MatchResult> = {};
  for (const r of data ?? []) {
    results[r.match_id] = {
      winner: r.winner as MatchResult["winner"],
      scoreHome: r.score_home,
      scoreAway: r.score_away,
      finalizedAt: new Date(r.finalized_at).getTime(),
    };
  }
  return results;
}

async function buildPlan() {
  const { url, matches } = await fetchExternalPayloadWithFallback();
  const currentResults = await loadCurrentResults();
  return buildSyncPlan(matches, currentResults, url);
}

/** GET: xem trước các trận sẽ được cập nhật (không ghi DB). */
export async function GET() {
  if (!supabase) {
    return NextResponse.json(
      { error: "Chưa cấu hình Supabase" },
      { status: 503 },
    );
  }
  try {
    const plan = await buildPlan();
    return NextResponse.json(plan);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Lỗi không rõ" },
      { status: 502 },
    );
  }
}

/** POST: áp dụng kết quả mới từ openfootball vào wc_results. */
export async function POST(req: Request) {
  if (!supabase) {
    return NextResponse.json(
      { error: "Chưa cấu hình Supabase" },
      { status: 503 },
    );
  }
  let actorName: string | null = "admin";
  try {
    const body = (await req.json()) as { actorName?: string };
    if (body.actorName) actorName = body.actorName;
  } catch {
    /* body rỗng OK */
  }

  try {
    const plan = await buildPlan();
    const applied: typeof plan.updates = [];
    const removed: typeof plan.removals = [];
    const failed: { matchId: string; error: string }[] = [];

    for (const item of plan.updates) {
      try {
        await setResultRemote(
          actorName,
          item.matchId,
          item.result,
          item.previousResult,
        );
        applied.push(item);
      } catch (e) {
        failed.push({
          matchId: item.matchId,
          error: (e as Error).message ?? "lỗi không rõ",
        });
      }
    }

    for (const item of plan.removals) {
      try {
        await setResultRemote(actorName, item.matchId, null, item.previousResult);
        removed.push(item);
      } catch (e) {
        failed.push({
          matchId: item.matchId,
          error: (e as Error).message ?? "lỗi không rõ",
        });
      }
    }

    return NextResponse.json({
      ...plan,
      applied,
      removed,
      failed,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Lỗi không rõ" },
      { status: 502 },
    );
  }
}
