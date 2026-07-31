import { AppShell } from "@/components/AppShell";
import { HomeDashboard } from "@/components/HomeDashboard";
import { InvalidClubPage } from "@/components/InvalidClubPage";
import { clubs, isKnownClubSlug } from "@/lib/domain/club";
import { listTournamentsByClub } from "@/lib/server/repositories/tournament-repository";

export const revalidate = 3600;

export function generateStaticParams() {
  return clubs.map((club) => ({ clubSlug: club.slug }));
}

export default async function ClubHomePage({ params }: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  if (!isKnownClubSlug(clubSlug)) return <InvalidClubPage />;
  const tournaments = await listTournamentsByClub(clubSlug);

  return (
    <AppShell title="테니스매치업" subtitle="동호회 대진표와 대회를 한곳에서 관리하세요" active="home" clubSlug={clubSlug} brandTitle>
      <HomeDashboard clubSlug={clubSlug} tournaments={tournaments} />
    </AppShell>
  );
}
