import { CalendarPlus } from "lucide-react";
import { FormPendingOverlay, PendingButton } from "@/components/ActionFormControls";
import { AppShell } from "@/components/AppShell";
import { PendingLink } from "@/components/PendingLink";
import { StatusBadge } from "@/components/StatusBadge";
import { buildClubPath, type ClubSlug } from "@/lib/domain/club";
import { withDateStatus } from "@/lib/domain/tournament-status";
import { createTournamentAction } from "@/lib/server/actions/tournament-actions";
import { requireAdmin } from "@/lib/server/auth/admin-session";
import { listTournamentsByClub } from "@/lib/server/repositories/tournament-repository";

type TournamentTab = "current" | "completed";

type TournamentListPageProps = {
  clubSlug?: ClubSlug;
  tab?: TournamentTab;
};

type AdminTournamentsPageProps = {
  searchParams?: Promise<{ tab?: string }>;
};

function normalizeTournamentTab(tab?: string): TournamentTab {
  return tab === "completed" ? "completed" : "current";
}

function tournamentManagePath(clubSlug: ClubSlug, tournamentId: string) {
  return `${buildClubPath(clubSlug, "tournaments/manage")}?tournamentId=${encodeURIComponent(tournamentId)}`;
}

async function TournamentListPage({ clubSlug = "stc", tab = "current" }: TournamentListPageProps) {
  const tournaments = (await listTournamentsByClub(clubSlug)).map((tournament) => withDateStatus(tournament));
  const visibleTournaments = tournaments.filter((tournament) =>
    tab === "completed" ? tournament.status === "completed" : tournament.status !== "completed"
  );

  return (
    <AppShell title="대회관리" subtitle="대회 날짜에 따라 준비, 진행, 완료로 자동 구분됩니다." active="tournaments" clubSlug={clubSlug}>
      <div className="page">
        <section className="section-card">
          <div className="tab-row two-tabs">
            <PendingLink className={`tab-button ${tab === "current" ? "active" : ""}`} href={buildClubPath(clubSlug, "tournaments")}>
              현재 대회
            </PendingLink>
            <PendingLink
              className={`tab-button ${tab === "completed" ? "active" : ""}`}
              href={`${buildClubPath(clubSlug, "tournaments")}?tab=completed`}
            >
              완료 대회
            </PendingLink>
          </div>
        </section>

        <section className="section-card">
          <strong className="section-head">{tab === "current" ? "준비/진행 대회" : "완료된 대회"}</strong>
          <div className="list-stack">
            {visibleTournaments.map((tournament) => (
              <div className="tournament-list-row single-action" key={tournament.id}>
                <PendingLink className="tournament-card" href={tournamentManagePath(clubSlug, tournament.id)}>
                  <div className="list-card-top">
                    <strong>{tournament.name}</strong>
                    <StatusBadge status={tournament.status} />
                  </div>
                  <div className="list-card-meta">
                    <span>{tournament.date}</span>
                    <span>{tournament.status === "completed" ? "결과 조회" : "상세 관리로 이동"}</span>
                  </div>
                </PendingLink>
              </div>
            ))}
            {visibleTournaments.length === 0 && <p className="lead">표시할 대회가 없습니다.</p>}
          </div>
        </section>

        <form action={createTournamentAction} className="sticky-footer single action-form">
          <FormPendingOverlay label="대회 만드는 중..." />
          <input name="clubSlug" type="hidden" value={clubSlug} />
          <PendingButton className="primary-button" pendingLabel="대회 만드는 중...">
            <CalendarPlus size={20} />새 대회 만들기
          </PendingButton>
        </form>
      </div>
    </AppShell>
  );
}

export default async function AdminTournamentsPage({ searchParams }: AdminTournamentsPageProps) {
  await requireAdmin();
  const params = await searchParams;
  return <TournamentListPage clubSlug="stc" tab={normalizeTournamentTab(params?.tab)} />;
}
