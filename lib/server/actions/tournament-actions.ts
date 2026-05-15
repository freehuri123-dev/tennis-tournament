"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createTournamentSlug } from "../../domain/public-access";
import type { TournamentState } from "../../store/tournament-store";
import { requireAdmin } from "../auth/admin-session";
import { replaceTournamentState, upsertTournament } from "../repositories/tournament-repository";
import { clubSlugSchema, tournamentInputSchema } from "../validation";

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

export async function persistTournamentStateAction(clubSlug: unknown, state: TournamentState) {
  await requireAdmin();

  const parsedClubSlug = clubSlugSchema.parse(clubSlug);
  await replaceTournamentState(parsedClubSlug, state);
  revalidatePath(`/${parsedClubSlug}/tournaments/manage`);
  revalidatePath(`/${parsedClubSlug}/tournaments`);
  revalidatePath(`/public/${parsedClubSlug}/${state.tournament.publicSlug}`);

  return { ok: true as const };
}

export async function createTournamentAction(formData: FormData) {
  await requireAdmin();

  const clubSlug = clubSlugSchema.parse(formString(formData, "clubSlug"));
  const idSeed = `tournament-${Date.now()}`;
  const input = tournamentInputSchema.parse({
    clubSlug,
    name: "새 월례대회",
    date: new Date().toISOString().slice(0, 10),
    publicSlug: createTournamentSlug(idSeed)
  });

  await upsertTournament(input);
  revalidatePath(`/${clubSlug}/tournaments`);
  redirect(`/${clubSlug}/tournaments`);
}
