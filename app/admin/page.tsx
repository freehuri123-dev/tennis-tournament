"use client";

import Link from "next/link";
import { CalendarDays, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { loadTournamentState } from "@/lib/store/tournament-store";

export default function AdminHomePage() {
  const state = loadTournamentState();
  const recentTournaments = [...state.tournaments].sort((left, right) => right.date.localeCompare(left.date)).slice(0, 3);

  return (
    <AppShell title="메인페이지" subtitle="회원관리와 대회관리를 선택하세요" active="home">
      <div className="page">
        <section className="section-card">
          <strong className="section-head">관리 메뉴</strong>
          <div className="quick-grid">
            <Link className="quick-card" href="/admin/members">
              <Users size={24} />
              <strong>회원관리</strong>
            </Link>
            <Link className="quick-card" href="/admin/tournaments">
              <CalendarDays size={24} />
              <strong>대회관리</strong>
            </Link>
          </div>
        </section>

        <section className="section-card">
          <strong className="section-head">최근 대회</strong>
          <div className="list-stack">
            {recentTournaments.map((tournament) => (
              <Link className="list-card" href="/admin/tournaments" key={tournament.id}>
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
    </AppShell>
  );
}
