"use client";

import { ArrowRight, CalendarDays, Trophy, Users } from "lucide-react";
import { PendingLink } from "@/components/PendingLink";
import { StatusBadge } from "@/components/StatusBadge";
import { buildClubPath, type ClubSlug } from "@/lib/domain/club";
import type { Tournament } from "@/lib/domain/types";

function tournamentManagePath(clubSlug: ClubSlug, tournamentId: string) {
  return `${buildClubPath(clubSlug, "tournaments/manage")}?tournamentId=${encodeURIComponent(tournamentId)}`;
}

export function HomeDashboard({ clubSlug = "stc", tournaments = [] }: { clubSlug?: ClubSlug; tournaments?: Tournament[] }) {
  const recentTournaments = [...tournaments].sort((left, right) => right.date.localeCompare(left.date)).slice(0, 4);
  const featuredTournament = recentTournaments[0];
  const remainingTournaments = recentTournaments.slice(1);

  return (
    <div className="page home-dashboard">
      {featuredTournament ? (
        <section className="home-feature-card" aria-labelledby="featured-tournament-title">
          <div className="home-feature-top">
            <span className="home-feature-label">가장 최근 대회</span>
            <StatusBadge status={featuredTournament.status} />
          </div>
          <div className="home-feature-copy">
            <strong id="featured-tournament-title">{featuredTournament.name}</strong>
            <span className="home-feature-date">
              <CalendarDays size={16} aria-hidden="true" />
              {featuredTournament.date}
            </span>
          </div>
          <PendingLink
            className="primary-button home-feature-action"
            href={tournamentManagePath(clubSlug, featuredTournament.id)}
          >
            대회 바로 관리
            <ArrowRight size={18} aria-hidden="true" />
          </PendingLink>
        </section>
      ) : (
        <section className="home-feature-card home-feature-empty">
          <span className="home-feature-label">대회 중심 허브</span>
          <div className="home-feature-copy">
            <strong>첫 대회를 준비해보세요</strong>
            <span className="home-feature-date">대회를 만들면 이곳에서 바로 관리할 수 있어요.</span>
          </div>
          <PendingLink className="primary-button home-feature-action" href={buildClubPath(clubSlug, "tournaments")}>
            대회 관리로 이동
            <ArrowRight size={18} aria-hidden="true" />
          </PendingLink>
        </section>
      )}

      <section className="section-card home-menu-section">
        <div className="home-section-intro">
          <strong className="section-head">관리 메뉴</strong>
          <span>필요한 관리 화면으로 빠르게 이동하세요.</span>
        </div>
        <div className="home-quick-grid">
          <PendingLink className="home-quick-card" href={buildClubPath(clubSlug, "members")}>
            <span className="home-quick-icon"><Users size={23} aria-hidden="true" /></span>
            <span><strong>회원관리</strong><small>회원 정보</small></span>
          </PendingLink>
          <PendingLink className="home-quick-card" href={buildClubPath(clubSlug, "tournaments")}>
            <span className="home-quick-icon"><CalendarDays size={23} aria-hidden="true" /></span>
            <span><strong>대회관리</strong><small>대진 · 결과</small></span>
          </PendingLink>
          <PendingLink className="home-quick-card" href={buildClubPath(clubSlug, "records")}>
            <span className="home-quick-icon"><Trophy size={23} aria-hidden="true" /></span>
            <span><strong>기록/랭킹</strong><small>대회 기록</small></span>
          </PendingLink>
        </div>
      </section>

      {remainingTournaments.length > 0 ? (
        <section className="section-card home-recent-section">
          <div className="home-section-intro home-recent-heading">
            <strong className="section-head">이전 대회</strong>
            <span>최근 3개 대회</span>
          </div>
          <div className="list-stack">
            {remainingTournaments.map((tournament) => (
              <PendingLink
                className="list-card home-recent-card"
                href={tournamentManagePath(clubSlug, tournament.id)}
                key={tournament.id}
              >
                <div className="list-card-top">
                  <strong>{tournament.name}</strong>
                  <StatusBadge status={tournament.status} />
                </div>
                <div className="list-card-meta">
                  <span>{tournament.date}</span>
                  <span className="home-recent-link">상세 관리 <ArrowRight size={14} aria-hidden="true" /></span>
                </div>
              </PendingLink>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
