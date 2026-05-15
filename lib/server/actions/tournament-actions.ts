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

function revalidateTournamentAdminPaths(clubSlug: string) {
  revalidatePath(`/${clubSlug}/tournaments/manage`);
  revalidatePath(`/${clubSlug}/tournaments`);
  revalidatePath("/admin/tournaments/manage");
  revalidatePath("/admin/tournaments");
}

export async function saveTournamentAction(formData: FormData) {
  const input = tournamentInputSchema.parse({
    id: formString(formData, "id"),
    clubSlug: formString(formData, "clubSlug"),
    name: formString(formData, "name"),
    date: formString(formData, "date"),
    publicSlug: formString(formData, "publicSlug")
  });

  await requireAdmin(input.clubSlug);
  const tournament = await upsertTournament(input);
  revalidateTournamentAdminPaths(input.clubSlug);
  revalidatePath(`/public/${input.clubSlug}/${input.publicSlug}`);
  return { ok: true as const, tournament };
}

export async function persistTournamentStateAction(clubSlug: unknown, state: TournamentState) {
  const parsedClubSlug = clubSlugSchema.parse(clubSlug);
  await requireAdmin(parsedClubSlug);
  await replaceTournamentState(parsedClubSlug, state);
  revalidateTournamentAdminPaths(parsedClubSlug);
  revalidatePath(`/public/${parsedClubSlug}/${state.tournament.publicSlug}`);

  return { ok: true as const };
}

export async function createTournamentAction(formData: FormData) {
  const clubSlug = clubSlugSchema.parse(formString(formData, "clubSlug"));
  await requireAdmin(clubSlug);
  const idSeed = `tournament-${Date.now()}`;
  const input = tournamentInputSchema.parse({
    clubSlug,
    name: "새 월례대회",
    date: new Date().toISOString().slice(0, 10),
    publicSlug: createTournamentSlug(idSeed)
  });

  await upsertTournament(input);
  revalidateTournamentAdminPaths(clubSlug);
  redirect(`/${clubSlug}/tournaments`);
}
