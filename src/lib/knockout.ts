import type {
  AppData,
  GroupData,
  KnockoutMatch,
  KnockoutRound,
  Match,
  MatchResult,
} from "@/lib/types";
import { KNOCKOUT_ROUNDS, THIRD_PLACE_GROUPS } from "@/data/knockout";

export interface ResolvedKnockout {
  rounds: KnockoutRound[];
  groupWinners: Record<string, [string, string]>; // groupId -> [winner, runnerUp]
  groupTables: TeamRow[][];
  groupStageDone: boolean;
  thirdPlaceQualified: string[]; // 8 đội hạng 3 tốt nhất
  thirdPlaceRanking: Array<{
    team: string;
    group: string;
    points: number;
    goalDiff: number;
    goalsFor: number;
  }>;
}

interface TeamRow {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  group: string;
}

function buildGroupTable(
  group: GroupData,
  results: Record<string, MatchResult>,
): TeamRow[] {
  const rows: TeamRow[] = group.teams.map((team) => {
    const base = group.standings[team] ?? {
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
    };
    return { team, ...base, group: group.id };
  });

  // Tính lại từ kết quả đã xác nhận
  const recompute: Record<string, TeamRow> = {};
  for (const r of rows) {
    recompute[r.team] = {
      team: r.team,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
      group: r.group,
    };
  }
  for (const m of group.matches) {
    const res = results[m.id];
    if (!res) continue;
    const h = recompute[m.home];
    const a = recompute[m.away];
    h.played += 1;
    a.played += 1;
    h.goalsFor += res.scoreHome;
    h.goalsAgainst += res.scoreAway;
    a.goalsFor += res.scoreAway;
    a.goalsAgainst += res.scoreHome;
    if (res.winner === "home") {
      h.won += 1;
      h.points += 3;
      a.lost += 1;
    } else if (res.winner === "away") {
      a.won += 1;
      a.points += 3;
      h.lost += 1;
    } else {
      h.drawn += 1;
      a.drawn += 1;
      h.points += 1;
      a.points += 1;
    }
  }
  for (const team of Object.keys(recompute)) {
    recompute[team].goalDiff =
      recompute[team].goalsFor - recompute[team].goalsAgainst;
  }
  return Object.values(recompute).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.team.localeCompare(b.team);
  });
}

function pickThirdPlace(
  allGroups: TeamRow[][],
  groupIds: string[],
): string[] {
  // Trả về tối đa 1 đội hạng 3 đại diện cho groupIds, chọn đội có điểm/HS/BT tốt nhất
  const candidates: TeamRow[] = [];
  for (const rows of allGroups) {
    if (rows.length < 3) continue;
    if (!groupIds.includes(rows[2].group)) continue;
    candidates.push(rows[2]);
  }
  candidates.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.team.localeCompare(b.team);
  });
  return candidates.length > 0 ? [candidates[0].team] : [];
}

function resolveSeed(
  seed: string,
  groupWinners: Record<string, [string, string]>,
  thirdPlacePicks: Record<string, string>, // "3A/C/D/E" -> team
  winnerOf: Record<string, string>,
): string | null {
  // "W <matchId>" → đội thắng trận trước
  if (seed.startsWith("W ")) {
    return winnerOf[seed.slice(2)] ?? null;
  }
  // "1A" / "2B" → đội nhất/nhì bảng
  const m = seed.match(/^([12])([A-L])$/);
  if (m) {
    const place = m[1] === "1" ? 0 : 1;
    return groupWinners[m[2]]?.[place] ?? null;
  }
  // "3A/C/D/E" → đội hạng 3 được chọn cho nhóm này
  if (seed.startsWith("3")) {
    return thirdPlacePicks[seed] ?? null;
  }
  return null;
}

export function resolveKnockout(
  tournamentGroups: GroupData[],
  results: Record<string, MatchResult>,
): ResolvedKnockout {
  // Bước 1: Tính standings cho từng bảng
  const tables: TeamRow[][] = tournamentGroups.map((g) => buildGroupTable(g, results));
  const groupWinners: Record<string, [string, string]> = {};
  for (let i = 0; i < tournamentGroups.length; i++) {
    const t = tables[i];
    if (t.length >= 2) {
      groupWinners[tournamentGroups[i].id] = [t[0].team, t[1].team];
    } else if (t.length === 1) {
      groupWinners[tournamentGroups[i].id] = [t[0].team, ""];
    } else {
      groupWinners[tournamentGroups[i].id] = ["", ""];
    }
  }

  // Bước 2: Tính tất cả 12 đội hạng 3, xếp hạng theo luật FIFA (points → GD → GF)
  const allThirds: TeamRow[] = tables
    .filter((rows) => rows.length >= 3)
    .map((rows) => rows[2])
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.team.localeCompare(b.team);
    });
  const thirdPlaceRanking = allThirds;
  // Top 8 được đi tiếp
  const qualifiedThirds = allThirds.slice(0, 8).map((t) => t.team);

  // Bước 3: Gán đội hạng 3 cho các seed "3..." tuân theo các nhóm trong bracket.
  // Vì mỗi seed "3A/C/D/E" đại diện cho 1 suất duy nhất, ta chọn đội tốt nhất
  // trong nhóm đó (chưa được gán cho seed nào khác).
  const thirdPlacePicks: Record<string, string> = {};
  const used = new Set<string>();
  // Sắp xếp seed groups: xử lý nhóm ít lựa chọn trước (đơn giản hoá)
  const seedOrder = Object.keys(THIRD_PLACE_GROUPS).sort(
    (a, b) => THIRD_PLACE_GROUPS[a].length - THIRD_PLACE_GROUPS[b].length,
  );
  for (const seed of seedOrder) {
    const groupIds = THIRD_PLACE_GROUPS[seed];
    const pool = allThirds.filter(
      (t) => (groupIds as readonly string[]).includes(t.group) && !used.has(t.team),
    );
    if (pool.length > 0) {
      // pool đã được sort theo points → GD → GF nên lấy [0]
      const chosen = pool[0].team;
      thirdPlacePicks[seed] = chosen;
      used.add(chosen);
    }
  }

  // Bước 4: Resolve từng trận knockout. Dùng 2 pass: pass 1 theo thứ tự stage
  // (R32 → R16 → QF → SF → F) để biết winner của trận nào sẽ thành home/away của trận sau.
  const winnerOf: Record<string, string> = {};
  // winnerOf có thể tới từ kết quả đã lưu (results) — nếu admin đã xác nhận.
  for (const round of KNOCKOUT_ROUNDS) {
    for (const m of round.matches) {
      const r = results[m.id];
      if (!r) continue;
      if (r.winner === "home") winnerOf[m.id] = m.home ?? "";
      else if (r.winner === "away") winnerOf[m.id] = m.away ?? "";
    }
  }

  // Vì các seed "W <matchId>" ở vòng sau trỏ về vòng trước, ta phải lặp cho tới hội tụ
  // (thường chỉ cần 1-2 lần vì winner chỉ phụ thuộc R32 → R16 → QF → SF → F).
  //
  // QUAN TRỌNG: chỉ resolve các seed từ vòng bảng (1A/2B/3...) khi TẤT CẢ
  // 72 trận vòng bảng đã có kết quả. Nếu chưa, để home/away = null để UI
  // hiển thị placeholder "?" thay vì đội ngẫu nhiên từ standings rỗng.
  const groupStageDone =
    tournamentGroups.every((g) =>
      g.matches.every((m) => results[m.id] !== undefined),
    );

  const resolvedRounds: KnockoutRound[] = JSON.parse(JSON.stringify(KNOCKOUT_ROUNDS));
  for (let pass = 0; pass < 8; pass++) {
    // Bước 1: resolve home/away cho TẤT CẢ các trận (theo thứ tự R32 → F)
    for (const round of resolvedRounds) {
      for (const m of round.matches) {
        const isGroupSeed =
          !!m.homeSeed?.match(/^[12][A-L]$/) ||
          !!m.awaySeed?.match(/^[12][A-L]$/) ||
          !!m.homeSeed?.startsWith("3") ||
          !!m.awaySeed?.startsWith("3");
        if (m.homeSeed && (!isGroupSeed || groupStageDone)) {
          m.home = resolveSeed(m.homeSeed, groupWinners, thirdPlacePicks, winnerOf);
        } else {
          m.home = null;
        }
        if (m.awaySeed && (!isGroupSeed || groupStageDone)) {
          m.away = resolveSeed(m.awaySeed, groupWinners, thirdPlacePicks, winnerOf);
        } else {
          m.away = null;
        }
      }
    }
    // Bước 2: SAU KHI đã có home/away, gán winnerOf dựa trên kết quả
    for (const round of resolvedRounds) {
      for (const m of round.matches) {
        const r = results[m.id];
        if (r) {
          m.scoreHome = r.scoreHome;
          m.scoreAway = r.scoreAway;
          m.winner = r.winner;
          if (r.winner === "home") winnerOf[m.id] = m.home ?? "";
          else if (r.winner === "away") winnerOf[m.id] = m.away ?? "";
        } else {
          m.scoreHome = null;
          m.scoreAway = null;
          m.winner = null;
        }
      }
    }
  }

  return {
    rounds: resolvedRounds,
    groupWinners,
    groupTables: tables,
    groupStageDone,
    thirdPlaceQualified: qualifiedThirds,
    thirdPlaceRanking,
  };
}

// Tính số trận đã hoàn thành trong vòng bảng
export function groupStageProgress(
  tournamentGroups: GroupData[],
  results: Record<string, MatchResult>,
): { done: number; total: number; ready: boolean } {
  let total = 0;
  let done = 0;
  for (const g of tournamentGroups) {
    for (const m of g.matches) {
      total += 1;
      if (results[m.id]) done += 1;
    }
  }
  return { done, total, ready: done === total };
}

export function listAllGroupMatches(groups: GroupData[]): Match[] {
  return groups.flatMap((g) => g.matches);
}
