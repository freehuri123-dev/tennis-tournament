import { InvalidClubPage } from "@/components/InvalidClubPage";
import { PublicTournamentView } from "@/components/PublicTournamentView";
import { getClubBySlug, isKnownClubSlug } from "@/lib/domain/club";
import { loadPublicTournamentState } from "@/lib/server/repositories/tournament-repository";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

type PublicTournamentPageProps = { params: Promise<{ clubSlug: string; slug: string }> };

const loadTournamentPageState = cache(loadPublicTournamentState);

export async function generateMetadata({ params }: PublicTournamentPageProps): Promise<Metadata> {
  const { clubSlug, slug } = await params;
  if (!isKnownClubSlug(clubSlug)) return {};

  const state = await loadTournamentPageState(clubSlug, slug);
  if (!state) return {};

  const clubName = getClubBySlug(clubSlug)?.name ?? "테니스 클럽";
  return { title: `${clubName} - ${state.tournament.name} - 대진표` };
}

export default async function ClubPublicTournamentPage({ params }: PublicTournamentPageProps) {
  const { clubSlug, slug } = await params;
  if (!isKnownClubSlug(clubSlug)) return <InvalidClubPage />;
  const state = await loadTournamentPageState(clubSlug, slug);
  if (!state) notFound();
  return <PublicTournamentView state={state} slug={slug} clubSlug={clubSlug} />;
}
