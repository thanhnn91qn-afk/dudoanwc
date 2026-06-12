import type { Tournament } from "@/lib/types";
import raw from "../../public/worldcup2026.json";
import { KNOCKOUT_ROUNDS } from "./knockout";

export const tournament: Tournament = {
  ...(raw as unknown as Tournament),
  knockout: KNOCKOUT_ROUNDS,
};

export function getGroupById(id: string) {
  return tournament.groups.find((g) => g.id === id);
}

export function getTeamInfo(name: string) {
  return tournament.teams[name];
}
