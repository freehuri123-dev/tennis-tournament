import { AppShell } from "@/components/AppShell";
import { HomeDashboard } from "@/components/HomeDashboard";
import { requireAdmin } from "@/lib/server/auth/admin-session";
import { listTournamentsByClub } from "@/lib/server/repositories/tournament-repository";

export default async function AdminHomePage() {
  await requireAdmin();
  const tournaments = await listTournamentsByClub("stc");

  return (
    <AppShell title="테니스매치업" subtitle="동호회 대진표와 대회를 한곳에서 관리하세요" active="home" brandTitle>
      <HomeDashboard clubSlug="stc" tournaments={tournaments} />
    </AppShell>
  );
}
