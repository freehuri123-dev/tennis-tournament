import { InvalidClubPage } from "@/components/InvalidClubPage";
import { PublicTournamentView } from "@/components/PublicTournamentView";
import { isKnownClubSlug } from "@/lib/domain/club";
import { loadPublicTournamentState } from "@/lib/server/repositories/tournament-repository";
import { notFound } from "next/navigation";

export default async function ClubPublicTournamentPage({ params }: { params: Promise<{ clubSlug: string; slug: string }> }) {
  const { clubSlug, slug } = await params;
  if (!isKnownClubSlug(clubSlug)) return <InvalidClubPage />;
  const state = await loadPublicTournamentState(clubSlug, slug);
  if (!state) notFound();
  return <PublicTournamentView state={state} slug={slug} clubSlug={clubSlug} />;
}
