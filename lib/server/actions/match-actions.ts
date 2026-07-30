"use server";

import { revalidatePath } from "next/cache";
import type { ClubSlug } from "../../domain/club";
import { requireAdmin } from "../auth/admin-session";
import { updateMatchScore, updateTournamentMatchStates } from "../repositories/tournament-repository";
import { matchScoreInputSchema, tournamentMatchStatesInputSchema } from "../validation";

export async function updateMatchScoreAction(input: unknown, clubSlug: ClubSlug) {
  await requireAdmin(clubSlug);

  const scoreInput = matchScoreInputSchema.parse(input);
  await updateMatchScore(clubSlug, scoreInput);
  revalidatePath(`/${clubSlug}/tournaments/manage`);
  revalidatePath("/admin/tournaments/manage");
}
export async function updateTournamentMatchStatesAction(input: unknown, clubSlug: ClubSlug) {
  await requireAdmin(clubSlug);

  const parsed = tournamentMatchStatesInputSchema.parse(input);
  await updateTournamentMatchStates(clubSlug, parsed.matches);
  revalidatePath(`/${clubSlug}/tournaments/manage`);
  revalidatePath("/admin/tournaments/manage");
  revalidatePath(`/public/${clubSlug}/${parsed.publicSlug}`);
}