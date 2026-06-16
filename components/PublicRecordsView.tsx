import { Medal, Percent, Sparkles, Trophy, type LucideIcon } from "lucide-react";
import { PublicShell } from "./AppShell";
import type { ClubSlug } from "../lib/domain/club";
import type { MemberRecord, PartnerRecord } from "../lib/domain/records";

type PublicRecordsViewProps = {
  clubSlug: ClubSlug;
  selectedYear: string;
  selectableYears: string[];
  recordsPath: string;
  tournamentCount: number;
  completedMatchCount: number;
  rankingMembers: MemberRecord[];
  awards: {
    mvp?: MemberRecord;
    mostWins?: MemberRecord;
    highestWinRate?: MemberRecord;
    mostPointsFor?: MemberRecord;
    mostParticipations?: MemberRecord;
    bestPartner?: PartnerRecord;
    risingStar?: MemberRecord;
  };
  partnerRecords: PartnerRecord[];
};

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

export function PublicRecordsView({
  clubSlug,
  selectedYear,
  selectableYears,
  recordsPath,
  tournamentCount,
  completedMatchCount,
  rankingMembers,
  awards,
  partnerRecords
}: PublicRecordsViewProps) {
  const hasYearRecords = rankingMembers.length > 0;

  return (
    <PublicShell title={`${selectedYear} 기록/랭킹`} subtitle="회원 공개용 시즌 기록" clubSlug={clubSlug}>
      <div className="page public-records-page">
        <section className="record-hero">
          <div>
            <span>{selectedYear} 시즌 기록</span>
            <strong>올해 경기 기록과 랭킹을 한눈에</strong>
            <p>완료된 경기 기준으로 랭킹, 어워드, 파트너 궁합을 자동 계산합니다.</p>
          </div>
          <div className="record-hero-stats">
            <span>
              <b>{tournamentCount}</b>
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
              <a className={year === selectedYear ? "active" : ""} href={`${recordsPath}?year=${year}`} key={year}>
                {year}년
              </a>
            ))}
          </div>
        </section>

        {hasYearRecords && (
          <section className="section-card stack">
            <strong className="section-head">{selectedYear}년 어워드</strong>
            <div className="record-award-grid">
              <AwardCard title="MVP" record={awards.mvp} value={`${awards.mvp?.wins ?? 0}승 · 득실 ${formatDiff(awards.mvp?.pointDiff ?? 0)}`} icon={Sparkles} />
            <AwardCard title="최다 승리" record={awards.mostWins} value={`${awards.mostWins?.wins ?? 0}승`} icon={Trophy} />
            <AwardCard title="최고 승률" record={awards.highestWinRate} value={formatPercent(awards.highestWinRate?.winRate ?? 0)} icon={Percent} />
            <AwardCard title="최다 득점" record={awards.mostPointsFor} value={`${awards.mostPointsFor?.pointsFor ?? 0}점`} icon={Medal} />
            <AwardCard title="최근 상승세" record={awards.risingStar} value={`최근 5경기 ${awards.risingStar?.recentResults.filter((result) => result === "win").length ?? 0}승`} icon={Sparkles} />
          </div>
            {awards.bestPartner && (
              <article className="record-partner-spotlight">
                <span>베스트 파트너</span>
                <strong>{awards.bestPartner.names.join(" & ")}</strong>
                <p>
                  {awards.bestPartner.matchCount}경기 · {awards.bestPartner.wins}승 · 승률 {formatPercent(awards.bestPartner.winRate)} · 득실 {formatDiff(awards.bestPartner.pointDiff)}
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
                  {record.recentResults.map((result, resultIndex) => (
                    <span className={result} key={`${record.memberId}-${resultIndex}`}>
                      {resultLabel(result)}
                    </span>
                  ))}
                </div>
              </article>
            ))}
            {rankingMembers.length === 0 && <p className="lead">{selectedYear}년에 완료된 경기 기록이 없습니다.</p>}
          </div>
        </section>

        {hasYearRecords && partnerRecords.length > 0 && (
          <section className="section-card stack">
            <strong className="section-head">{selectedYear}년 파트너 궁합 TOP 5</strong>
            <div className="record-partner-list">
              {partnerRecords.slice(0, 5).map((partner, index) => (
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
    </PublicShell>
  );
}
