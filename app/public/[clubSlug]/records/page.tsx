import { InvalidClubPage } from "@/components/InvalidClubPage";
import { PublicRecordsView } from "@/components/PublicRecordsView";
import { isKnownClubSlug } from "@/lib/domain/club";
import { calculateClubRecords } from "@/lib/domain/records";
import { loadClubRecordData } from "@/lib/server/repositories/tournament-repository";

function currentYearString() {
  return new Date().getFullYear().toString();
}

function normalizeYear(value?: string) {
  return value && /^\d{4}$/.test(value) ? value : currentYearString();
}

function yearsFromDates(dates: string[], selectedYear: string) {
  return Array.from(new Set([selectedYear, currentYearString(), ...dates.map((date) => date.slice(0, 4)).filter((year) => /^\d{4}$/.test(year))])).sort((a, b) => b.localeCompare(a));
}

export default async function ClubPublicRecordsPage({
  params,
  searchParams
}: {
  params: Promise<{ clubSlug: string }>;
  searchParams?: Promise<{ year?: string }>;
}) {
  const { clubSlug } = await params;
  if (!isKnownClubSlug(clubSlug)) return <InvalidClubPage />;

  const query = await searchParams;
  const selectedYear = normalizeYear(query?.year);
  const data = await loadClubRecordData(clubSlug);
  const yearTournaments = data.tournaments.filter((tournament) => tournament.date.startsWith(selectedYear));
  const yearTournamentIds = new Set(yearTournaments.map((tournament) => tournament.id));
  const yearMatches = data.matches.filter((match) => yearTournamentIds.has(match.tournamentId));
  const records = calculateClubRecords(data.members, yearTournaments, yearMatches);
  const completedMatchCount = yearMatches.filter((match) => match.status === "completed").length;
  const rankingMembers = records.members.filter((record) => record.matchCount > 0);
  const selectableYears = yearsFromDates(data.tournaments.map((tournament) => tournament.date), selectedYear);

  return (
    <PublicRecordsView
      awards={records.awards}
      clubSlug={clubSlug}
      completedMatchCount={completedMatchCount}
      partnerRecords={records.partnerRecords}
      rankingMembers={rankingMembers}
      recordsPath={`/public/${clubSlug}/records`}
      selectableYears={selectableYears}
      selectedYear={selectedYear}
      tournamentCount={yearTournaments.length}
    />
  );
}
