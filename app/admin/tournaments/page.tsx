"use client";

import { CalendarPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import type { Tournament } from "@/lib/domain/types";
import { loadTournamentState, saveTournamentState, type TournamentState } from "@/lib/store/tournament-store";

export default function TournamentListPage() {
  const [state, setState] = useState<TournamentState>(() => loadTournamentState());
  const [tab, setTab] = useState<"current" | "completed">("current");

  const visibleTournaments = useMemo(() => {
    return state.tournaments
      .filter((tournament) => (tab === "completed" ? tournament.status === "completed" : tournament.status !== "completed"))
      .sort((left, right) => right.date.localeCompare(left.date));
  }, [state.tournaments, tab]);

  function persist(next: TournamentState) {
    saveTournamentState(next);
    setState(next);
  }

  function createTournament() {
    const today = new Date().toISOString().slice(0, 10);
    const tournament: Tournament = {
      id: `tournament-${Date.now()}`,
      name: "새 월례대회",
      date: today,
      publicSlug: "monthly-demo",
      status: "draft"
    };

    persist({
      ...state,
      tournaments: [tournament, ...state.tournaments],
      currentTournamentId: tournament.id,
      tournament,
      groups: [],
      groupMemberIds: {},
      matches: []
    });
    window.location.assign("/admin/tournaments/manage");
  }

  function openTournament(tournament: Tournament) {
    persist({
      ...state,
      currentTournamentId: tournament.id,
      tournament
    });
    window.location.assign("/admin/tournaments/manage");
  }

  return (
    <AppShell title="대회관리" subtitle="진행 중인 대회와 완료된 대회를 따로 확인합니다" active="tournaments">
      <div className="page">
        <section className="section-card">
          <div className="tab-row two-tabs">
            <button className={`tab-button ${tab === "current" ? "active" : ""}`} onClick={() => setTab("current")} type="button">
              현재 대회
            </button>
            <button className={`tab-button ${tab === "completed" ? "active" : ""}`} onClick={() => setTab("completed")} type="button">
              완료 대회
            </button>
          </div>
        </section>

        <section className="section-card">
          <strong className="section-head">{tab === "current" ? "현재 만들고 있는 대회" : "완료된 대회"}</strong>
          <div className="list-stack">
            {visibleTournaments.map((tournament) => (
              <button className="tournament-card" key={tournament.id} onClick={() => openTournament(tournament)} type="button">
                <div className="list-card-top">
                  <strong>{tournament.name}</strong>
                  <StatusBadge status={tournament.status} />
                </div>
                <div className="list-card-meta">
                  <span>{tournament.date}</span>
                  <span>상세 관리로 이동</span>
                </div>
              </button>
            ))}
            {visibleTournaments.length === 0 && (
              <p className="lead">표시할 대회가 없습니다.</p>
            )}
          </div>
        </section>

        <div className="sticky-footer single">
          <button className="primary-button" onClick={createTournament} type="button">
            <CalendarPlus size={20} />
            새 대회 만들기
          </button>
        </div>
      </div>
    </AppShell>
  );
}
