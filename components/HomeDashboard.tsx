"use client";

import Link from "next/link";
import { CalendarDays, Users } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { buildClubPath, type ClubSlug } from "@/lib/domain/club";
import type { Tournament } from "@/lib/domain/types";

export function HomeDashboard({ clubSlug = "stc", tournaments = [] }: { clubSlug?: ClubSlug; tournaments?: Tournament[] }) {
  const recentTournaments = [...tournaments].sort((left, right) => right.date.localeCompare(left.date)).slice(0, 4);

  return (
    <div className="page">
      <section className="section-card">
        <strong className="section-head">관리 메뉴</strong>
        <div className="quick-grid">
          <Link className="quick-card" href={buildClubPath(clubSlug, "members")}>
            <Users size={24} />
            <strong>회원관리</strong>
          </Link>
          <Link className="quick-card" href={buildClubPath(clubSlug, "tournaments")}>
            <CalendarDays size={24} />
            <strong>대회관리</strong>
          </Link>
        </div>
      </section>

      <section className="section-card">
        <strong className="section-head">최근 대회</strong>
        <div className="list-stack">
          {recentTournaments.map((tournament) => (
            <Link className="list-card" href={buildClubPath(clubSlug, "tournaments")} key={tournament.id}>
              <div className="list-card-top">
                <strong>{tournament.name}</strong>
                <StatusBadge status={tournament.status} />
              </div>
              <div className="list-card-meta">
                <span>{tournament.date}</span>
                <span>대회관리에서 확인</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
