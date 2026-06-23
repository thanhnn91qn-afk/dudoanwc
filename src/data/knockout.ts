import type { KnockoutMatch, KnockoutRound, KnockoutStage, GroupId } from "@/lib/types";

// Bracket chuẩn FIFA World Cup 2026 (32 đội).
// Mỗi trận R32 dùng homeSeed/awaySeed mô tả nguồn đội:
//   - "1A" = đội nhất bảng A
//   - "2B" = đội nhì bảng B
//   - "3C/D/E/F" = đội ba tốt nhất trong nhóm các bảng C,D,E,F
// Sau khi vòng bảng xong, hệ thống sẽ gán home/away thật dựa trên standings
// và thứ tự đội ba tốt nhất (theo luật FIFA).
//
// Lưu ý: Vòng R16/QF/SF sẽ tự resolve từ winner của vòng trước (W của match ID cụ thể).

const VENUES: { venue: string; city: string; date: string; matchday: number }[] = [
  { venue: "MetLife Stadium", city: "East Rutherford, USA", date: "2026-06-28", matchday: 1 },
  { venue: "AT&T Stadium", city: "Arlington, USA", date: "2026-06-28", matchday: 1 },
  { venue: "NRG Stadium", city: "Houston, USA", date: "2026-06-29", matchday: 2 },
  { venue: "Mercedes-Benz Stadium", city: "Atlanta, USA", date: "2026-06-29", matchday: 2 },
  { venue: "SoFi Stadium", city: "Inglewood, USA", date: "2026-06-30", matchday: 3 },
  { venue: "Hard Rock Stadium", city: "Miami, USA", date: "2026-06-30", matchday: 3 },
  { venue: "Levi's Stadium", city: "Santa Clara, USA", date: "2026-07-01", matchday: 4 },
  { venue: "Lumen Field", city: "Seattle, USA", date: "2026-07-01", matchday: 4 },
  { venue: "Arrowhead Stadium", city: "Kansas City, USA", date: "2026-07-02", matchday: 5 },
  { venue: "BC Place", city: "Vancouver, Canada", date: "2026-07-02", matchday: 5 },
  { venue: "BMO Field", city: "Toronto, Canada", date: "2026-07-03", matchday: 6 },
  { venue: "Gillette Stadium", city: "Foxboro, USA", date: "2026-07-03", matchday: 6 },
  { venue: "Lincoln Financial Field", city: "Philadelphia, USA", date: "2026-07-04", matchday: 7 },
  { venue: "Estadio Akron", city: "Guadalajara, Mexico", date: "2026-07-04", matchday: 7 },
  { venue: "Estadio BBVA", city: "Monterrey, Mexico", date: "2026-07-05", matchday: 8 },
  { venue: "Estadio Azteca", city: "Mexico City, Mexico", date: "2026-07-05", matchday: 8 },
  { venue: "MetLife Stadium", city: "East Rutherford, USA", date: "2026-07-06", matchday: 9 },
  { venue: "AT&T Stadium", city: "Arlington, USA", date: "2026-07-06", matchday: 9 },
  { venue: "NRG Stadium", city: "Houston, USA", date: "2026-07-07", matchday: 10 },
  { venue: "Mercedes-Benz Stadium", city: "Atlanta, USA", date: "2026-07-07", matchday: 10 },
  { venue: "SoFi Stadium", city: "Inglewood, USA", date: "2026-07-08", matchday: 11 },
  { venue: "Hard Rock Stadium", city: "Miami, USA", date: "2026-07-08", matchday: 11 },
  { venue: "BC Place", city: "Vancouver, Canada", date: "2026-07-09", matchday: 12 },
  { venue: "Lumen Field", city: "Seattle, USA", date: "2026-07-09", matchday: 12 },
  { venue: "MetLife Stadium", city: "East Rutherford, USA", date: "2026-07-10", matchday: 13 },
  { venue: "AT&T Stadium", city: "Arlington, USA", date: "2026-07-10", matchday: 13 },
  { venue: "Mercedes-Benz Stadium", city: "Atlanta, USA", date: "2026-07-11", matchday: 14 },
  { venue: "SoFi Stadium", city: "Inglewood, USA", date: "2026-07-11", matchday: 14 },
  { venue: "MetLife Stadium", city: "East Rutherford, USA", date: "2026-07-14", matchday: 15 },
  { venue: "MetLife Stadium", city: "East Rutherford, USA", date: "2026-07-15", matchday: 16 },
  { venue: "MetLife Stadium", city: "East Rutherford, USA", date: "2026-07-19", matchday: 17 },
];

function mk(
  id: string,
  stage: KnockoutStage,
  index: number,
  homeSeed: string,
  awaySeed: string,
): KnockoutMatch {
  const v = VENUES[index];
  return {
    id,
    stage,
    matchday: v.matchday,
    date: v.date,
    venue: v.venue,
    city: v.city,
    homeSeed,
    awaySeed,
    home: null,
    away: null,
    scoreHome: null,
    scoreAway: null,
    winner: null,
  };
}

// ID R32 dùng tiền tố R32- để không trùng mã vòng bảng K1–K6 (bảng K).
const r32: KnockoutMatch[] = [
  mk("R32-1", "R32", 0, "2A", "2C"),
  mk("R32-2", "R32", 1, "1B", "3A/C/D/E"),
  mk("R32-3", "R32", 2, "1F", "2B"),
  mk("R32-4", "R32", 3, "1C", "2F"),
  mk("R32-5", "R32", 4, "1I", "3C/D/F/H"),
  mk("R32-6", "R32", 5, "2E", "2I"),
  mk("R32-7", "R32", 6, "1A", "3C/E/F/H/I"),
  mk("R32-8", "R32", 7, "1E", "2D"),
  mk("R32-9", "R32", 8, "2J", "2H"),
  mk("R32-10", "R32", 9, "1D", "3B/E/F/I/J"),
  mk("R32-11", "R32", 10, "1G", "3A/B/C/D/F"),
  mk("R32-12", "R32", 11, "1K", "3D/E/I/J/K"),
  mk("R32-13", "R32", 12, "1H", "2G"),
  mk("R32-14", "R32", 13, "1J", "2K"),
  mk("R32-15", "R32", 14, "2L", "3E/H/I/J/K"),
  mk("R32-16", "R32", 15, "1L", "2L"),
];

const r16: KnockoutMatch[] = [
  mk("R1", "R16", 16, "W R32-2", "W R32-1"),
  mk("R2", "R16", 17, "W R32-4", "W R32-3"),
  mk("R3", "R16", 18, "W R32-6", "W R32-5"),
  mk("R4", "R16", 19, "W R32-8", "W R32-7"),
  mk("R5", "R16", 20, "W R32-10", "W R32-9"),
  mk("R6", "R16", 21, "W R32-12", "W R32-11"),
  mk("R7", "R16", 22, "W R32-14", "W R32-13"),
  mk("R8", "R16", 23, "W R32-16", "W R32-15"),
];

const qf: KnockoutMatch[] = [
  mk("Q1", "QF", 24, "W R2", "W R1"),
  mk("Q2", "QF", 25, "W R4", "W R3"),
  mk("Q3", "QF", 26, "W R6", "W R5"),
  mk("Q4", "QF", 27, "W R8", "W R7"),
];

const sf: KnockoutMatch[] = [
  mk("S1", "SF", 28, "W Q2", "W Q1"),
  mk("S2", "SF", 29, "W Q4", "W Q3"),
];

const f: KnockoutMatch[] = [
  mk("F1", "F", 30, "W S1", "W S2"),
];

export const KNOCKOUT_ROUNDS: KnockoutRound[] = [
  { stage: "R32", label: "Vòng 1/16 · 32 đội", matches: r32 },
  { stage: "R16", label: "Vòng 1/8 · 16 đội", matches: r16 },
  { stage: "QF", label: "Tứ kết", matches: qf },
  { stage: "SF", label: "Bán kết", matches: sf },
  { stage: "F", label: "Chung kết", matches: f },
];

// Bảng 3 đội-tốt-nhất. Mỗi nhóm liệt kê các bảng mà đội thứ 3 của nó có thể được
// chọn để điền vào các seed "3X/Y/Z...". Đây là mô hình đơn giản hoá dựa trên cấu trúc
// bracket FIFA WC 2026 — chỉ dùng để biết nhóm nào cạnh tranh vị trí.
export const THIRD_PLACE_GROUPS: Record<string, GroupId[]> = {
  "3A/C/D/E": ["A", "C", "D", "E"],
  "3C/D/F/H": ["C", "D", "F", "H"],
  "3C/E/F/H/I": ["C", "E", "F", "H", "I"],
  "3B/E/F/I/J": ["B", "E", "F", "I", "J"],
  "3A/B/C/D/F": ["A", "B", "C", "D", "F"],
  "3D/E/I/J/K": ["D", "E", "I", "J", "K"],
  "3E/H/I/J/K": ["E", "H", "I", "J", "K"],
  "3C/D/E": ["C", "D", "E"],
  "3C/D/F": ["C", "D", "F"],
};
