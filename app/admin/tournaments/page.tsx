"use client";

import { CalendarPlus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { createTournamentSlug } from "@/lib/domain/public-access";
import { withDateStatus } from "@/lib/domain/tournament-status";
import type { Tournament } from "@/lib/domain/types";
import { loadTournamentState, saveTournamentState, type TournamentState } from "@/lib/store/tournament-store";

export default function TournamentListPage() {
  const [state, setState] = useState<TournamentState>(() => loadTournamentState());
  const [tab, setTab] = useState<"current" | "completed">("current");

  const tournaments = useMemo(() => state.tournaments.map((tournament) => withDateStatus(tournament)), [state.tournaments]);
  const visibleTournaments = useMemo(() => {
    return tournaments
      .filter((tournament) => (tab === "completed" ? tournament.status === "completed" : tournament.status !== "completed"))
      .sort((left, right) => right.date.localeCompare(left.date));
  }, [tournaments, tab]);

  function persist(next: TournamentState) {
    saveTournamentState(next);
    setState(next);
  }

  function createTournament() {
    const today = new Date().toISOString().slice(0, 10);
    const id = `tournament-${Date.now()}`;
    const tournament: Tournament = withDateStatus({
      id,
      name: "새 월례대회",
      date: today,
      publicSlug: createTournamentSlug(id),
      status: "draft"
    });

    persist({
      ...state,
      tournaments: [tournament, ...tournaments],
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
      tournaments,
      currentTournamentId: tournament.id,
      tournament
    });
    window.location.assign("/admin/tournaments/manage");
  }

  function deleteTournament(tournament: Tournament) {
    if (!window.confirm(`${tournament.name} 대회를 삭제할까요?`)) return;
    const nextTournaments = tournaments.filter((item) => item.id !== tournament.id);
    const fallback = nextTournaments[0] ?? state.tournament;
    persist({
      ...state,
      tournaments: nextTournaments,
      currentTournamentId: fallback.id,
      tournament: fallback,
      deletedPublicSlugs: Array.from(new Set([...(state.deletedPublicSlugs ?? []), tournament.publicSlug])),
      ...(tournament.id === state.tournament.id ? { groups: [], groupMemberIds: {}, matches: [] } : {})
    });
  }

  return (
    <AppShell title="대회관리" subtitle="대회 날짜에 따라 준비, 진행, 완료로 자동 구분합니다" active="tournaments">
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
          <strong className="section-head">{tab === "current" ? "준비/진행 대회" : "완료된 대회"}</strong>
          <div className="list-stack">
            {visibleTournaments.map((tournament) => (
              <div className="tournament-list-row" key={tournament.id}>
                <button className="tournament-card" onClick={() => openTournament(tournament)} type="button">
                  <div className="list-card-top">
                    <strong>{tournament.name}</strong>
                    <StatusBadge status={tournament.status} />
                  </div>
                  <div className="list-card-meta">
                    <span>{tournament.date}</span>
                    <span>{tournament.status === "completed" ? "조회만 가능" : "상세 관리로 이동"}</span>
                  </div>
                </button>
                <button className="icon-danger-button" aria-label={`${tournament.name} 삭제`} onClick={() => deleteTournament(tournament)} type="button">
                  <Trash2 size={18} />
                </button>
              </div>
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
