import { InvalidClubPage } from "@/components/InvalidClubPage";
import { PublicTournamentView } from "@/components/PublicTournamentView";
import { isKnownClubSlug } from "@/lib/domain/club";
import { listTournamentsByClub, loadTournamentStateFromDb } from "@/lib/server/repositories/tournament-repository";

export default async function ClubPublicTournamentPage({ params }: { params: Promise<{ clubSlug: string; slug: string }> }) {
  const { clubSlug, slug } = await params;
  if (!isKnownClubSlug(clubSlug)) return <InvalidClubPage />;
  const tournaments = await listTournamentsByClub(clubSlug);
  const tournament = tournaments.find((item) => item.publicSlug === slug);
  const state = await loadTournamentStateFromDb(clubSlug, tournament?.id);
  return <PublicTournamentView state={state} slug={slug} clubSlug={clubSlug} />;
}
