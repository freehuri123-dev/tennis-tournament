"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getClubBySlug, type ClubSlug } from "../lib/domain/club";
import { calculateRankings } from "../lib/domain/ranking";
import type { Match, Member, RankingRow, TournamentGroup } from "../lib/domain/types";
import type { TournamentState } from "../lib/store/tournament-store";

type GroupSummary = {
  group: TournamentGroup;
  currentMatch: Match | null;
  nextMatch: Match | null;
  thirdMatch: Match | null;
  completedCount: number;
  totalCount: number;
};

type RankingGroup = {
  group: TournamentGroup;
  rows: RankingRow[];
};

type TvSlideType = "schedule" | "ranking";

const REFRESH_INTERVAL_MS = 10_000;
const SLIDE_INTERVAL_MS = 8_000;
const SLIDES: TvSlideType[] = ["schedule", "ranking"];

export function PublicTvTournamentView({ state, clubSlug }: { state: TournamentState; clubSlug: ClubSlug }) {
  const router = useRouter();
  const [slideIndex, setSlideIndex] = useState(0);
  const club = getClubBySlug(clubSlug);

  const membersById = useMemo(() => new Map(state.members.map((member) => [member.id, member])), [state.members]);
  const matchesByGroupId = useMemo(() => {
    const grouped = new Map(state.groups.map((group) => [group.id, [] as Match[]]));
    for (const match of state.matches) {
      const matches = grouped.get(match.groupId);
      if (matches) matches.push(match);
    }
    for (const matches of grouped.values()) {
      matches.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return grouped;
  }, [state.groups, state.matches]);

  const groupSummaries = useMemo<GroupSummary[]>(() => {
    return [...state.groups]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((group) => {
        const matches = matchesByGroupId.get(group.id) ?? [];
        const pendingMatches = matches.filter((match) => match.status !== "completed" || match.sideAScore === null || match.sideBScore === null);
        return {
          group,
          currentMatch: pendingMatches[0] ?? null,
          nextMatch: pendingMatches[1] ?? null,
          thirdMatch: pendingMatches[2] ?? null,
          completedCount: matches.length - pendingMatches.length,
          totalCount: matches.length
        };
      });
  }, [matchesByGroupId, state.groups]);

  const rankingGroups = useMemo<RankingGroup[]>(() => {
    return [...state.groups]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((group) => {
        const groupMemberIds = state.groupMemberIds[group.id] ?? [];
        const members = groupMemberIds.map((id) => membersById.get(id)).filter((member): member is Member => Boolean(member));
        return {
          group,
          rows: calculateRankings(members, matchesByGroupId.get(group.id) ?? [])
        };
      });
  }, [matchesByGroupId, membersById, state.groupMemberIds, state.groups]);

  const activeSlide = SLIDES[slideIndex % SLIDES.length];

  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [router]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlideIndex((current) => (current + 1) % SLIDES.length);
    }, SLIDE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="tv-page">
      <header className="tv-header">
        <div>
          <span>{club?.name ?? "테니스 모임"}</span>
          <strong>{state.tournament.name}</strong>
        </div>
        <p>{state.tournament.date}</p>
      </header>

      <section className="tv-slide-shell" aria-live="polite">
        {activeSlide === "schedule" ? (
          <div className="tv-slide tv-slide-card tv-slide-animate" key="schedule">
            <div className="tv-slide-head">
              <span>전체 대진표</span>
              <strong>현재 경기 / 다음 경기 / 다다음 경기</strong>
            </div>
            <div className="tv-all-groups-grid">
              {groupSummaries.map((summary) => (
                <article className="tv-group-board" key={summary.group.id}>
                  <div className="tv-group-board-head">
                    <strong>{summary.group.name}</strong>
                    <span>
                      {summary.completedCount} / {summary.totalCount} 완료
                    </span>
                  </div>
                  <div className="tv-group-board-matches">
                    <TvCompactMatchPanel label="현재" match={summary.currentMatch} membersById={membersById} teamBattle={summary.group.scheduleFormat === "team-battle"} highlight />
                    <TvCompactMatchPanel label="다음" match={summary.nextMatch} membersById={membersById} teamBattle={summary.group.scheduleFormat === "team-battle"} />
                    <TvCompactMatchPanel label="다다음" match={summary.thirdMatch} membersById={membersById} teamBattle={summary.group.scheduleFormat === "team-battle"} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="tv-slide tv-slide-card tv-slide-animate" key="ranking">
            <div className="tv-slide-head">
              <span>조별 순위 요약</span>
              <strong>전체 순위</strong>
            </div>
            <div className="tv-ranking-grid">
              {rankingGroups.map(({ group, rows }) => (
                <article className="tv-ranking-group" key={group.id}>
                  <strong>{group.name}</strong>
                  <ol>
                    {rows.map((row) => (
                      <li key={row.memberId}>
                        <b>{row.rank}위</b>
                        <span>{row.name}</span>
                        <em>
                          {row.wins}승 · {row.pointDiff > 0 ? `+${row.pointDiff}` : row.pointDiff}
                        </em>
                      </li>
                    ))}
                    {rows.length === 0 && <li className="tv-empty-row">순위 데이터 없음</li>}
                  </ol>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      <footer className="tv-footer">
        <div className="tv-progress-dots" aria-label="슬라이드 진행">
          {SLIDES.map((slide, index) => (
            <span className={index === slideIndex % SLIDES.length ? "active" : ""} key={slide} />
          ))}
        </div>
        <span>10초마다 자동 업데이트</span>
      </footer>
    </main>
  );
}

function TvCompactMatchPanel({
  label,
  match,
  membersById,
  teamBattle = false,
  highlight = false
}: {
  label: string;
  match: Match | null;
  membersById: Map<string, Member>;
  teamBattle?: boolean;
  highlight?: boolean;
}) {
  return (
    <article className={`tv-compact-match ${highlight ? "highlight" : ""}`}>
      <div className="tv-compact-label">
        <span>{label}</span>
        {match && <div className="tv-match-badges"><strong>경기 {match.matchNumber}</strong>{match.courtNumber && <em className="tv-court-badge">{match.courtNumber}번 코트</em>}</div>}
      </div>
      {match ? (
        <div className="tv-compact-teams">
          <TvTeam label={teamBattle ? "청팀" : undefined} side="blue" names={match.sideAPlayerIds.map((id) => membersById.get(id)?.name ?? "미정")} />
          <div className="tv-compact-vs">VS</div>
          <TvTeam label={teamBattle ? "백팀" : undefined} side="white" names={match.sideBPlayerIds.map((id) => membersById.get(id)?.name ?? "미정")} />
        </div>
      ) : (
        <div className="tv-compact-empty">대기 경기 없음</div>
      )}
    </article>
  );
}

function TvTeam({ names, label, side }: { names: string[]; label?: string; side: "blue" | "white" }) {
  return (
    <div className="tv-team">
      {label && <em className={`team-side-badge ${side}`}>{label}</em>}
      {names.length > 0 ? names.map((name, index) => <strong key={`${name}-${index}`}>{name}</strong>) : <strong>선수 미정</strong>}
    </div>
  );
}
