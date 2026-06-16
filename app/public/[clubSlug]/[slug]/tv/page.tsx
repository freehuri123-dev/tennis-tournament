import { InvalidClubPage } from "@/components/InvalidClubPage";
import { PublicTvTournamentView } from "@/components/PublicTvTournamentView";
import { isKnownClubSlug } from "@/lib/domain/club";
import { loadPublicTournamentState } from "@/lib/server/repositories/tournament-repository";
import { notFound } from "next/navigation";

export default async function ClubPublicTournamentTvPage({ params }: { params: Promise<{ clubSlug: string; slug: string }> }) {
  const { clubSlug, slug } = await params;
  if (!isKnownClubSlug(clubSlug)) return <InvalidClubPage />;
  const state = await loadPublicTournamentState(clubSlug, slug);
  if (!state) notFound();
  return <PublicTvTournamentView state={state} clubSlug={clubSlug} />;
}
