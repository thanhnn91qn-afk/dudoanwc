// One-off script: đổi tên 48 đội trong public/worldcup2026.json sang tiếng Việt.
// Chạy bằng: node scripts/rename-teams-vi.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = resolve(__dirname, "..", "public", "worldcup2026.json");

// Mapping tên đội gốc → tiếng Việt (chuẩn báo chí VN)
const TEAM_VI = {
  "Algeria": "Algeria",
  "Argentina": "Ác-hen-ti-na",
  "Australia": "Úc",
  "Austria": "Áo",
  "Belgium": "Bỉ",
  "Bosnia & Herzegovina": "Bosna và Hercegovina",
  // Map TV cũ → TV mới để re-apply khi JSON đã có sẵn TV cũ
  "Bò-xnơ-na Héc-xê-gô-vi-na": "Bosna và Hercegovina",
  "Brazil": "Bra-xin",
  "Canada": "Ca-na-đa",
  "Cape Verde": "Cáp-ve",
  "Colombia": "Cô-lôm-bi-a",
  "Croatia": "Crô-a-ti-a",
  "Cura\u00e7ao": "Cura\u00e7ao",
  "Czechia": "Séc",
  "DR Congo": "C\u00f4ng-g\u00f4",
  "Ecuador": "Ecuador",
  "Egypt": "Ai C\u1eadp",
  "England": "Anh",
  "France": "Ph\u00e1p",
  "Germany": "\u0110\u1ee9c",
  "Ghana": "Ghana",
  "Haiti": "Ha-i-ti",
  "Iran": "Iran",
  "Iraq": "I-r\u1eafc",
  // Map cả TV cũ (sai chính tả) sang TV mới để re-apply khi JSON đã có sẵn TV cũ
  "I-r\u1ecdc": "I-r\u1eafc",
  "Ivory Coast": "B\u1edd Bi\u1ec3n Ng\u00e0",
  "Japan": "Nh\u1eadt B\u1ea3n",
  "Jordan": "Jordan",
  "Korea Republic": "H\u00e0n Qu\u1ed1c",
  "Mexico": "M\u00ea-hi-c\u00f4",
  "Morocco": "Ma-r\u1ed1c",
  "Netherlands": "H\u00e0 Lan",
  "New Zealand": "New Zealand",
  "Norway": "Na Uy",
  "Panama": "Pa-na-ma",
  "Paraguay": "Pa-ra-goay",
  "Portugal": "B\u1ed3 \u0110\u00e0o Nha",
  "Qatar": "Qatar",
  "Saudi Arabia": "\u1ea2-r\u1eadp X\u00ea-\u00fat",
  "Scotland": "Scotland",
  "Senegal": "S\u00e9-n\u00e9-gan",
  "South Africa": "Nam Phi",
  "Spain": "T\u00e2y Ban Nha",
  "Sweden": "Th\u1ee5y \u0110i\u1ec3n",
  "Switzerland": "Th\u1ee5y S\u0129",
  "Tunisia": "Tuy-ni-di",
  "T\u00fcrkiye": "Th\u1ed5 Nh\u0129 K\u1ef3",
  "United States": "M\u1ef9",
  "Uruguay": "U-ru-goay",
  "Uzbekistan": "U-d\u00f4-b\u00ea-ki-xtan",
};

const raw = readFileSync(jsonPath, "utf8");
const data = JSON.parse(raw);

let renamedKeys = 0;
let renamedRefs = 0;

function renameKeys(o) {
  if (!o || typeof o !== "object") return o;
  if (Array.isArray(o)) return o.map(renameKeys);
  const out = {};
  for (const [k, v] of Object.entries(o)) {
    const newK = TEAM_VI[k] ?? k;
    if (newK !== k) renamedKeys += 1;
    out[newK] = renameKeys(v);
  }
  return out;
}

function renameRefs(node) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const it of node) renameRefs(it);
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    if ((k === "home" || k === "away") && typeof v === "string" && TEAM_VI[v]) {
      if (node[k] !== TEAM_VI[v]) {
        renamedRefs += 1;
        node[k] = TEAM_VI[v];
      }
    } else if (typeof v === "object") {
      renameRefs(v);
    }
  }
}

// Bước 1: đổi key của `teams` (vd "Brazil" → "Bra-xin")
//         Nếu key hiện tại đã là tên TV (kết quả của lần chạy trước) mà
//         giá trị trong TEAM_VI lại khác → dùng tên gốc để tra cứu rồi ghi đè.
data.teams = renameKeys(data.teams);

// Bước 2: đổi tất cả ref tới tên đội trong groups.matches + knockout.matches
renameRefs(data.groups);
renameRefs(data.knockout);

// Bước 3: đổi tên trong groups[].teams[] (mảng tên đội của mỗi bảng)
let renamedGroupTeams = 0;
for (const g of data.groups) {
  if (Array.isArray(g.teams)) {
    g.teams = g.teams.map((t) => {
      // Tra cả 2 chiều: tên gốc → TV, hoặc TV cũ → TV mới (re-apply)
      const mapped = TEAM_VI[t] ?? t;
      if (mapped !== t) renamedGroupTeams += 1;
      return mapped;
    });
  }
}

// Bước 4: ghi đè cả 2 chiều cho home/away — quan trọng khi re-apply mapping
//         (vd "I-rọc" → "I-rắc") mà key trong teams vẫn là TV cũ.
let reapplied = 0;
function reapplyRefs(node) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const it of node) reapplyRefs(it);
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    if ((k === "home" || k === "away") && typeof v === "string" && TEAM_VI[v]) {
      if (node[k] !== TEAM_VI[v]) {
        reapplied += 1;
        node[k] = TEAM_VI[v];
      }
    } else if (typeof v === "object") {
      reapplyRefs(v);
    }
  }
}
reapplyRefs(data.groups);
reapplyRefs(data.knockout);

writeFileSync(jsonPath, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(
  `✓ Đổi xong. ${renamedKeys} key trong teams + ${renamedRefs} reference home/away + ${renamedGroupTeams} tên trong groups[].teams[] + ${reapplied} ghi đè lại.`,
);
