"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createTournamentSlug } from "../../domain/public-access";
import type { TournamentState } from "../../store/tournament-store";
import { requireAdmin } from "../auth/admin-session";
import { deleteTournament, replaceTournamentState, updateTournamentDate, updateTournamentName, upsertTournament } from "../repositories/tournament-repository";
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

function tomorrowDateString() {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric"
  }).formatToParts(new Date());
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const tomorrow = new Date(Date.UTC(value("year"), value("month") - 1, value("day") + 1));
  return tomorrow.toISOString().slice(0, 10);
}

export async function saveTournamentAction(formData: FormData) {
  const input = tournamentInputSchema.parse({
    id: formString(formData, "id"),
    clubSlug: formString(formData, "clubSlug"),
    name: formString(formData, "name"),
    date: formString(formData, "date"),
    publicSlug: formString(formData, "publicSlug"),
    type: formString(formData, "type"),
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

export async function updateTournamentNameAction(clubSlug: unknown, tournamentId: unknown, name: unknown) {
  const parsedClubSlug = clubSlugSchema.parse(clubSlug);
  if (typeof tournamentId !== "string" || tournamentId.trim() === "") throw new Error("Tournament id is required");
  if (typeof name !== "string" || name.trim() === "") throw new Error("Tournament name is required");

  await requireAdmin(parsedClubSlug);
  const tournament = await updateTournamentName(parsedClubSlug, tournamentId, name);
  revalidateTournamentAdminPaths(parsedClubSlug);
  revalidatePath(`/public/${parsedClubSlug}/${tournament.publicSlug}`);

  return { ok: true as const, tournament };
}

export async function updateTournamentDateAction(clubSlug: unknown, tournamentId: unknown, date: unknown) {
  const parsedClubSlug = clubSlugSchema.parse(clubSlug);
  if (typeof tournamentId !== "string" || tournamentId.trim() === "") throw new Error("Tournament id is required");
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Tournament date is invalid");

  await requireAdmin(parsedClubSlug);
  const tournament = await updateTournamentDate(parsedClubSlug, tournamentId, date);
  revalidateTournamentAdminPaths(parsedClubSlug);
  revalidatePath(`/public/${parsedClubSlug}/${tournament.publicSlug}`);

  return { ok: true as const, tournament };
}

export async function createTournamentAction(formData: FormData) {
  const clubSlug = clubSlugSchema.parse(formString(formData, "clubSlug"));
  await requireAdmin(clubSlug);
  const idSeed = `tournament-${Date.now()}`;
  const input = tournamentInputSchema.parse({
    clubSlug,
    name: "새 대회",
    date: tomorrowDateString(),
    publicSlug: createTournamentSlug(idSeed),
    type: formString(formData, "type") ?? "general",
  });

  const tournament = await upsertTournament(input);
  revalidateTournamentAdminPaths(clubSlug);
  redirect(`/${clubSlug}/tournaments/manage?tournamentId=${tournament.id}`);
}

export async function deleteTournamentAction(formData: FormData) {
  const clubSlug = clubSlugSchema.parse(formString(formData, "clubSlug"));
  const id = formString(formData, "id");
  if (!id) throw new Error("Tournament id is required");

  await requireAdmin(clubSlug);
  await deleteTournament(clubSlug, id);
  revalidateTournamentAdminPaths(clubSlug);
  redirect(`/${clubSlug}/tournaments`);
}
