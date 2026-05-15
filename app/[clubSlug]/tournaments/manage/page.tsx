import { InvalidClubPage } from "@/components/InvalidClubPage";
import { TournamentManageClient } from "@/components/TournamentManageClient";
import { isKnownClubSlug } from "@/lib/domain/club";
import { requireAdmin } from "@/lib/server/auth/admin-session";
import { loadTournamentStateFromDb } from "@/lib/server/repositories/tournament-repository";

export default async function ClubTournamentManagePage({
  params,
  searchParams
}: {
  params: Promise<{ clubSlug: string }>;
  searchParams?: Promise<{ tournamentId?: string }>;
}) {
  const { clubSlug } = await params;
  if (!isKnownClubSlug(clubSlug)) return <InvalidClubPage />;

  await requireAdmin(clubSlug);
  const query = await searchParams;
  const state = await loadTournamentStateFromDb(clubSlug, query?.tournamentId);

  return <TournamentManageClient initialState={state} clubSlug={clubSlug} />;
}
