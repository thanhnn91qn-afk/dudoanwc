/**
 * Test ghép cặp trận local ↔ openfootball.
 * Chạy: node scripts/test-external-results.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const VI_TO_EN = {
  "Mê-hi-cô": "Mexico",
  "Nam Phi": "South Africa",
  "Hàn Quốc": "Korea Republic",
  Séc: "Czechia",
  "Ca-na-đa": "Canada",
  "Bosna và Hercegovina": "Bosnia & Herzegovina",
  "Hà Lan": "Netherlands",
  "Nhật Bản": "Japan",
};

const API_ALIASES = {
  "Czech Republic": "Czechia",
  "South Korea": "Korea Republic",
};

function canonicalEn(name) {
  return API_ALIASES[name.trim()] ?? name.trim();
}

function pairKey(h, a) {
  return `${canonicalEn(h)}|${canonicalEn(a)}`;
}

const PRIMARY =
  "https://raw.githubusercontent.com/upbound-web/worldcup-live.json/master/2026/worldcup.json";
const FALLBACK =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

const jsonPath = resolve(__dirname, "..", "public", "worldcup2026.json");
const local = JSON.parse(readFileSync(jsonPath, "utf8"));

const localMatches = [];
for (const g of local.groups) {
  for (const m of g.matches) {
    if (m.home && m.away) localMatches.push(m);
  }
}

let external;
let sourceUrl;
try {
  external = await fetchJson(PRIMARY);
  sourceUrl = PRIMARY;
} catch {
  external = await fetchJson(FALLBACK);
  sourceUrl = FALLBACK;
}

const extFinished = (external.matches ?? []).filter((m) => m.score?.ft);
console.log(`Nguồn: ${sourceUrl}`);
console.log(`API: ${extFinished.length} trận có tỉ số`);
console.log(`Local: ${localMatches.length} trận vòng bảng`);

const extMap = new Map();
for (const m of extFinished) {
  extMap.set(pairKey(m.team1, m.team2), m);
}

let matched = 0;
let missingMap = 0;
for (const m of localMatches) {
  const h = VI_TO_EN[m.home];
  const a = VI_TO_EN[m.away];
  if (!h || !a) {
    missingMap += 1;
    continue;
  }
  const hit = extMap.get(pairKey(h, a));
  if (hit) {
    matched += 1;
    if (matched <= 5) {
      console.log(
        `  ✓ ${m.id}: ${m.home} vs ${m.away} → ${hit.score.ft[0]}-${hit.score.ft[1]}`,
      );
    }
  }
}

console.log(`Ghép được: ${matched}/${localMatches.length} trận vòng bảng`);
if (missingMap) console.log(`Thiếu map tên (chỉ test subset): ${missingMap}`);
