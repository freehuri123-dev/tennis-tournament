import { TournamentManageClient } from "@/components/TournamentManageClient";
import { requireAdmin } from "@/lib/server/auth/admin-session";
import { loadTournamentStateFromDb } from "@/lib/server/repositories/tournament-repository";

export default async function TournamentManagePage() {
  await requireAdmin();
  const state = await loadTournamentStateFromDb("stc");

  return <TournamentManageClient initialState={state} clubSlug="stc" />;
}
