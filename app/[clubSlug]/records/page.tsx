import { Medal, Percent, Sparkles, Trophy, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { InvalidClubPage } from "@/components/InvalidClubPage";
import { buildClubPath, isKnownClubSlug } from "@/lib/domain/club";
import { calculateClubRecords, type MemberRecord } from "@/lib/domain/records";
import { loadClubRecordData } from "@/lib/server/repositories/tournament-repository";

function formatPercent(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

function formatDiff(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

function resultLabel(result: "win" | "draw" | "loss") {
  if (result === "win") return "승";
  if (result === "draw") return "무";
  return "패";
}

function currentYearString() {
  return new Date().getFullYear().toString();
}

function normalizeYear(value?: string) {
  return value && /^\d{4}$/.test(value) ? value : currentYearString();
}

function yearsFromDates(dates: string[], selectedYear: string) {
  return Array.from(new Set([selectedYear, currentYearString(), ...dates.map((date) => date.slice(0, 4)).filter((year) => /^\d{4}$/.test(year))])).sort((a, b) => b.localeCompare(a));
}

function AwardCard({
  title,
  record,
  value,
  icon: Icon
}: {
  title: string;
  record?: MemberRecord;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <article className="record-award-card">
      <span className="record-award-icon">
        <Icon size={22} />
      </span>
      <div>
        <small>{title}</small>
        <strong>{record?.name ?? "기록 없음"}</strong>
        <em>{record ? value : "-"}</em>
      </div>
    </article>
  );
}

export default async function ClubRecordsPage({
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
  const hasYearRecords = rankingMembers.length > 0;
  const selectableYears = yearsFromDates(data.tournaments.map((tournament) => tournament.date), selectedYear);

  return (
    <AppShell title="기록/랭킹" subtitle={`${selectedYear}년도 누적 기록과 어워드`} active="records" clubSlug={clubSlug}>
      <div className="page">
        <section className="record-hero">
          <div>
            <span>{selectedYear} 클럽 기록실</span>
            <strong>한 해 동안 쌓인 경기 기록과 랭킹</strong>
            <p>선택한 연도에 완료된 경기 기준으로 개인 기록, 승률, 득실, 파트너 기록을 자동 계산합니다.</p>
          </div>
          <div className="record-hero-stats">
            <span>
              <b>{yearTournaments.length}</b>
              대회
            </span>
            <span>
              <b>{completedMatchCount}</b>
              완료 경기
            </span>
            <span>
              <b>{rankingMembers.length}</b>
              기록 회원
            </span>
          </div>
        </section>

        <section className="section-card stack">
          <strong className="section-head">연도 선택</strong>
          <div className="record-year-tabs" aria-label="기록 연도 선택">
            {selectableYears.map((year) => (
              <a className={year === selectedYear ? "active" : ""} href={`${buildClubPath(clubSlug, "records")}?year=${year}`} key={year}>
                {year}년
              </a>
            ))}
          </div>
        </section>

        {hasYearRecords && (
          <section className="section-card stack">
            <strong className="section-head">{selectedYear}년 어워드</strong>
            <div className="record-award-grid">
              <AwardCard title="MVP" record={records.awards.mvp} value={`${records.awards.mvp?.wins ?? 0}승 · 득실 ${formatDiff(records.awards.mvp?.pointDiff ?? 0)}`} icon={Sparkles} />
              <AwardCard title="최다 승리" record={records.awards.mostWins} value={`${records.awards.mostWins?.wins ?? 0}승`} icon={Trophy} />
              <AwardCard title="최고 승률" record={records.awards.highestWinRate} value={formatPercent(records.awards.highestWinRate?.winRate ?? 0)} icon={Percent} />
              <AwardCard title="최다 득점" record={records.awards.mostPointsFor} value={`${records.awards.mostPointsFor?.pointsFor ?? 0}점`} icon={Medal} />
              <AwardCard title="최근 상승세" record={records.awards.risingStar} value={`최근 5경기 ${records.awards.risingStar?.recentResults.filter((result) => result === "win").length ?? 0}승`} icon={Sparkles} />
            </div>
            {records.awards.bestPartner && (
              <article className="record-partner-spotlight">
                <span>베스트 파트너</span>
                <strong>{records.awards.bestPartner.names.join(" & ")}</strong>
                <p>
                  {records.awards.bestPartner.matchCount}경기 · {records.awards.bestPartner.wins}승 · 승률 {formatPercent(records.awards.bestPartner.winRate)} · 득실 {formatDiff(records.awards.bestPartner.pointDiff)}
                </p>
              </article>
            )}
          </section>
        )}

        <section className="section-card stack">
          <strong className="section-head">{selectedYear}년 전체 랭킹</strong>
          <p className="record-ranking-note">선택한 연도에 완료 경기 기록이 있는 회원만 표시합니다.</p>
          <p className="record-ranking-rule">순위 기준: 승수 → 승률 → 득실 → 경기 수 → 이름순</p>
          <div className="record-ranking-list">
            {rankingMembers.map((record, index) => (
              <article className={`record-ranking-card rank-${index < 3 ? index + 1 : "normal"}`} key={record.memberId}>
                <div className="record-rank-main">
                  <span>{index + 1}</span>
                  <div>
                    <strong>{record.name}</strong>
                    <small>
                      {record.matchCount}경기 · {record.wins}승 {record.draws}무 {record.losses}패
                    </small>
                  </div>
                </div>
                <div className="record-stat-strip">
                  <span>
                    <b>{formatPercent(record.winRate)}</b>
                    승률
                  </span>
                  <span>
                    <b>{formatDiff(record.pointDiff)}</b>
                    득실
                  </span>
                  <span>
                    <b>{record.pointsFor}</b>
                    득점
                  </span>
                  <span>
                    <b>{record.tournamentCount}</b>
                    참가
                  </span>
                </div>
                <div className="record-recent-results">
                  {record.recentResults.length > 0 ? (
                    record.recentResults.map((result, resultIndex) => (
                      <span className={result} key={`${record.memberId}-${resultIndex}`}>
                        {resultLabel(result)}
                      </span>
                    ))
                  ) : (
                    <small>최근 경기 없음</small>
                  )}
                </div>
              </article>
            ))}
            {rankingMembers.length === 0 && <p className="lead">{selectedYear}년에 완료된 경기 기록이 없습니다.</p>}
          </div>
        </section>

        {hasYearRecords && records.partnerRecords.length > 0 && (
          <section className="section-card stack">
            <strong className="section-head">{selectedYear}년 파트너 궁합 TOP 5</strong>
            <div className="record-partner-list">
              {records.partnerRecords.slice(0, 5).map((partner, index) => (
                <article className="record-partner-card" key={partner.playerIds.join(":")}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{partner.names.join(" & ")}</strong>
                    <small>
                      {partner.matchCount}경기 · {partner.wins}승 · 승률 {formatPercent(partner.winRate)} · 득실 {formatDiff(partner.pointDiff)}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
