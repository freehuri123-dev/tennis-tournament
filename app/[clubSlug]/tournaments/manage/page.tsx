import TournamentManagePage from "@/app/admin/tournaments/manage/page";
import { InvalidClubPage } from "@/components/InvalidClubPage";
import { isKnownClubSlug } from "@/lib/domain/club";

export default async function ClubTournamentManagePage({ params }: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  if (!isKnownClubSlug(clubSlug)) return <InvalidClubPage />;
  return <TournamentManagePage />;
}
