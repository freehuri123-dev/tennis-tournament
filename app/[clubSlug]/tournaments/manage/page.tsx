import { InvalidClubPage } from "@/components/InvalidClubPage";
import { TournamentManageClient } from "@/components/TournamentManageClient";
import { isKnownClubSlug } from "@/lib/domain/club";
import { requireAdmin } from "@/lib/server/auth/admin-session";
import { loadTournamentStateFromDb } from "@/lib/server/repositories/tournament-repository";

export default async function ClubTournamentManagePage({ params }: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  if (!isKnownClubSlug(clubSlug)) return <InvalidClubPage />;

  await requireAdmin(clubSlug);
  const state = await loadTournamentStateFromDb(clubSlug);

  return <TournamentManageClient initialState={state} clubSlug={clubSlug} />;
}
