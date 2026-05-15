"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../auth/admin-session";
import { upsertTournament } from "../repositories/tournament-repository";
import { tournamentInputSchema } from "../validation";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

export async function saveTournamentAction(formData: FormData) {
  await requireAdmin();

  const input = tournamentInputSchema.parse({
    id: formString(formData, "id"),
    clubSlug: formString(formData, "clubSlug"),
    name: formString(formData, "name"),
    date: formString(formData, "date"),
    publicSlug: formString(formData, "publicSlug")
  });

  const tournament = await upsertTournament(input);
  revalidatePath(`/${input.clubSlug}/tournaments`);
  revalidatePath(`/${input.clubSlug}/tournaments/manage`);
  revalidatePath(`/public/${input.clubSlug}/${input.publicSlug}`);
  return { ok: true as const, tournament };
}
