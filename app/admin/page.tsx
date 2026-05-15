import { AppShell } from "@/components/AppShell";
import { HomeDashboard } from "@/components/HomeDashboard";
import { requireAdmin } from "@/lib/server/auth/admin-session";
import { listTournamentsByClub } from "@/lib/server/repositories/tournament-repository";

export default async function AdminHomePage() {
  await requireAdmin();
  const tournaments = await listTournamentsByClub("stc");

  return (
    <AppShell title="관리자 홈" subtitle="회원관리와 대회관리를 선택하세요." active="home">
      <HomeDashboard clubSlug="stc" tournaments={tournaments} />
    </AppShell>
  );
}
