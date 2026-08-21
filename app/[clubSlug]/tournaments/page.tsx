import { Trash2 } from "lucide-react";
import { ConfirmActionForm, PendingButton } from "@/components/ActionFormControls";
import { AppShell } from "@/components/AppShell";
import { InvalidClubPage } from "@/components/InvalidClubPage";
import { PendingLink } from "@/components/PendingLink";
import { StatusBadge } from "@/components/StatusBadge";
import { TournamentCreateForm } from "@/components/TournamentCreateForm";
import { buildClubPath, isKnownClubSlug, type ClubSlug } from "@/lib/domain/club";
import { isScheduleLocked } from "@/lib/domain/tournament-policy";
import { withDateStatus } from "@/lib/domain/tournament-status";
import { createTournamentAction, deleteTournamentAction } from "@/lib/server/actions/tournament-actions";
import { listTournamentsByClub } from "@/lib/server/repositories/tournament-repository";

type TournamentTab = "current" | "completed";

function normalizeTournamentTab(tab?: string): TournamentTab {
  return tab === "completed" ? "completed" : "current";
}

function tournamentManagePath(clubSlug: ClubSlug, tournamentId: string) {
  return `${buildClubPath(clubSlug, "tournaments/manage")}?tournamentId=${encodeURIComponent(tournamentId)}`;
}

async function TournamentListPage({ clubSlug, tab }: { clubSlug: ClubSlug; tab: TournamentTab }) {
  const tournaments = (await listTournamentsByClub(clubSlug)).map((tournament) => withDateStatus(tournament));
  const visibleTournaments = tournaments.filter((tournament) =>
    tab === "completed" ? tournament.status === "completed" : tournament.status !== "completed"
  );

  return (
    <AppShell title="대회관리" subtitle="대회 날짜에 따라 준비, 진행, 완료로 자동 구분됩니다." active="tournaments" clubSlug={clubSlug}>
      <div className="page">
        <section className="section-card">
          <div className="tab-row two-tabs">
            <PendingLink className={`tab-button ${tab === "current" ? "active" : ""}`} href={buildClubPath(clubSlug, "tournaments")} showPending={false}>
              현재 대회
            </PendingLink>
            <PendingLink
              className={`tab-button ${tab === "completed" ? "active" : ""}`}
              href={`${buildClubPath(clubSlug, "tournaments")}?tab=completed`}
              showPending={false}
            >
              완료 대회
            </PendingLink>
          </div>
        </section>

        <section className="section-card">
          <strong className="section-head">{tab === "current" ? "준비/진행 대회" : "완료된 대회"}</strong>
          <div className="list-stack">
            {visibleTournaments.map((tournament) => (
              <div className="tournament-list-row" key={tournament.id}>
                <PendingLink className="tournament-card" href={tournamentManagePath(clubSlug, tournament.id)}>
                  <div className="list-card-top">
                    <strong>{tournament.name}</strong>
                    <StatusBadge status={tournament.status} />
                  </div>
                  <div className="list-card-meta">
                    <span>{tournament.date}</span>
                    <span>{tournament.type === "team-battle" ? "청백전 · 단체전" : tournament.type === "tournament" ? "토너먼트" : "일반 대회"}</span>
                  </div>
                </PendingLink>
                {!isScheduleLocked(tournament) && (
                  <ConfirmActionForm action={deleteTournamentAction} confirmMessage="대회를 삭제하시겠습니까?" pendingLabel="대회 삭제 중...">
                    <input name="clubSlug" type="hidden" value={clubSlug} />
                    <input name="id" type="hidden" value={tournament.id} />
                    <PendingButton className="icon-danger-button tournament-delete-button" pendingLabel="삭제 중...">
                      <Trash2 size={20} />
                    </PendingButton>
                  </ConfirmActionForm>
                )}
              </div>
            ))}
            {visibleTournaments.length === 0 && <p className="lead">표시할 대회가 없습니다.</p>}
          </div>
        </section>

        <TournamentCreateForm action={createTournamentAction} clubSlug={clubSlug} />
      </div>
    </AppShell>
  );
}

export default async function ClubTournamentsPage({
  params,
  searchParams
}: {
  params: Promise<{ clubSlug: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { clubSlug } = await params;
  if (!isKnownClubSlug(clubSlug)) return <InvalidClubPage />;

  const query = await searchParams;
  return <TournamentListPage clubSlug={clubSlug} tab={normalizeTournamentTab(query?.tab)} />;
}
