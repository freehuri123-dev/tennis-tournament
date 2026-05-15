"use server";

import { revalidatePath } from "next/cache";
import type { ClubSlug } from "../../domain/club";
import { requireAdmin } from "../auth/admin-session";
import { updateMatchScore } from "../repositories/tournament-repository";
import { matchScoreInputSchema } from "../validation";

export async function updateMatchScoreAction(input: unknown, clubSlug: ClubSlug) {
  await requireAdmin();

  const scoreInput = matchScoreInputSchema.parse(input);
  await updateMatchScore(scoreInput);
  revalidatePath(`/${clubSlug}/tournaments/manage`);
}
