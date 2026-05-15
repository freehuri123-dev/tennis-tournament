"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../auth/admin-session";
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

  revalidatePath(`/${input.clubSlug}/tournaments/manage`);
  return { ok: false as const, reason: "Tournament mutations are not implemented in this task." };
}
