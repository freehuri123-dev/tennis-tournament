"use client";

import { CalendarDays, Users } from "lucide-react";
import { PendingLink } from "@/components/PendingLink";
import { StatusBadge } from "@/components/StatusBadge";
import { buildClubPath, type ClubSlug } from "@/lib/domain/club";
import type { Tournament } from "@/lib/domain/types";

function tournamentManagePath(clubSlug: ClubSlug, tournamentId: string) {
  return `${buildClubPath(clubSlug, "tournaments/manage")}?tournamentId=${encodeURIComponent(tournamentId)}`;
}

export function HomeDashboard({ clubSlug = "stc", tournaments = [] }: { clubSlug?: ClubSlug; tournaments?: Tournament[] }) {
  const recentTournaments = [...tournaments].sort((left, right) => right.date.localeCompare(left.date)).slice(0, 4);

  return (
    <div className="page">
      <section className="section-card">
        <strong className="section-head">관리 메뉴</strong>
        <div className="quick-grid">
          <PendingLink className="quick-card" href={buildClubPath(clubSlug, "members")}>
            <Users size={24} />
            <strong>회원관리</strong>
          </PendingLink>
          <PendingLink className="quick-card" href={buildClubPath(clubSlug, "tournaments")}>
            <CalendarDays size={24} />
            <strong>대회관리</strong>
          </PendingLink>
        </div>
      </section>

      <section className="section-card">
        <strong className="section-head">최근 대회</strong>
        <div className="list-stack">
          {recentTournaments.map((tournament) => (
            <PendingLink className="list-card" href={tournamentManagePath(clubSlug, tournament.id)} key={tournament.id}>
              <div className="list-card-top">
                <strong>{tournament.name}</strong>
                <StatusBadge status={tournament.status} />
              </div>
              <div className="list-card-meta">
                <span>{tournament.date}</span>
                <span>상세 관리로 이동</span>
              </div>
            </PendingLink>
          ))}
        </div>
      </section>
    </div>
  );
}
