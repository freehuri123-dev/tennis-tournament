import { AppShell } from "@/components/AppShell";
import { HomeDashboard } from "@/components/HomeDashboard";
import { InvalidClubPage } from "@/components/InvalidClubPage";
import { isKnownClubSlug } from "@/lib/domain/club";
import { listTournamentsByClub } from "@/lib/server/repositories/tournament-repository";

export default async function ClubHomePage({ params }: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  if (!isKnownClubSlug(clubSlug)) return <InvalidClubPage />;
  const tournaments = await listTournamentsByClub(clubSlug);

  return (
    <AppShell title="메인페이지" subtitle="회원관리와 대회관리를 선택하세요" active="home" clubSlug={clubSlug}>
      <HomeDashboard clubSlug={clubSlug} tournaments={tournaments} />
    </AppShell>
  );
}
