/**
 * Map tên đội tiếng Việt (trong worldcup2026.json) → tên tiếng Anh
 * dùng bởi openfootball / API bên ngoài.
 */
export const VI_TO_EN: Record<string, string> = {
  Algeria: "Algeria",
  "Ác-hen-ti-na": "Argentina",
  Úc: "Australia",
  Áo: "Austria",
  Bỉ: "Belgium",
  "Bosna và Hercegovina": "Bosnia & Herzegovina",
  "Bra-xin": "Brazil",
  "Ca-na-đa": "Canada",
  "Cộng hòa Cabo Verde": "Cape Verde",
  "Cô-lôm-bi-a": "Colombia",
  "Crô-a-ti-a": "Croatia",
  Curaçao: "Curaçao",
  Séc: "Czechia",
  "Công-gô": "DR Congo",
  Ecuador: "Ecuador",
  "Ai Cập": "Egypt",
  Anh: "England",
  Pháp: "France",
  Đức: "Germany",
  Ghana: "Ghana",
  "Ha-i-ti": "Haiti",
  Iran: "Iran",
  "I-rắc": "Iraq",
  "Bờ Biển Ngà": "Ivory Coast",
  "Nhật Bản": "Japan",
  Jordan: "Jordan",
  "Hàn Quốc": "Korea Republic",
  "Mê-hi-cô": "Mexico",
  "Ma-rốc": "Morocco",
  "Hà Lan": "Netherlands",
  "New Zealand": "New Zealand",
  "Na Uy": "Norway",
  "Pa-na-ma": "Panama",
  "Pa-ra-goay": "Paraguay",
  "Bồ Đào Nha": "Portugal",
  Qatar: "Qatar",
  "Ả-rập Xê-út": "Saudi Arabia",
  Scotland: "Scotland",
  "Sé-né-gan": "Senegal",
  "Nam Phi": "South Africa",
  "Tây Ban Nha": "Spain",
  "Thụy Điển": "Sweden",
  "Thụy Sĩ": "Switzerland",
  "Tuy-ni-di": "Tunisia",
  "Thổ Nhĩ Kỳ": "Türkiye",
  Mỹ: "United States",
  "U-ru-goay": "Uruguay",
  "U-dô-bê-ki-xtan": "Uzbekistan",
};

/** Tên đội từ API ngoài → dạng chuẩn (key trong mapping trên). */
const API_ALIASES: Record<string, string> = {
  "Czech Republic": "Czechia",
  Czechia: "Czechia",
  "South Korea": "Korea Republic",
  "Korea Republic": "Korea Republic",
  Turkey: "Türkiye",
  Türkiye: "Türkiye",
  USA: "United States",
  "United States": "United States",
  "Côte d'Ivoire": "Ivory Coast",
  "Ivory Coast": "Ivory Coast",
  "Cabo Verde": "Cape Verde",
  "Cape Verde": "Cape Verde",
  "Bosnia and Herzegovina": "Bosnia & Herzegovina",
  "Bosnia & Herzegovina": "Bosnia & Herzegovina",
  "DR Congo": "DR Congo",
  "Democratic Republic of the Congo": "DR Congo",
};

export function viToEn(viName: string): string | null {
  return VI_TO_EN[viName] ?? null;
}

export function canonicalEn(apiName: string): string {
  const trimmed = apiName.trim();
  return API_ALIASES[trimmed] ?? trimmed;
}

/** Key ghép cặp đội (home|away) để tra cứu kết quả. */
export function pairKey(homeEn: string, awayEn: string): string {
  return `${canonicalEn(homeEn)}|${canonicalEn(awayEn)}`;
}
