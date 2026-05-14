"use client";

import { useEffect, useMemo, useState } from "react";
import { MatchCard } from "@/components/MatchCard";
import { RankingTable } from "@/components/RankingTable";
import { Tabs } from "@/components/Tabs";
import { calculateRankings } from "@/lib/domain/ranking";
import { createInitialState, loadTournamentState, type TournamentState } from "@/lib/store/tournament-store";

const tabs = [
  { id: "schedule", label: "대진표" },
  { id: "group", label: "그룹 순위" },
  { id: "overall", label: "전체 순위" }
];

export default function PublicTournamentPage() {
  const [activeTab, setActiveTab] = useState("schedule");
  const [state, setState] = useState<TournamentState>(() => createInitialState());

  useEffect(() => {
    setState(loadTournamentState());
  }, []);

  const groupRankings = useMemo(() => {
    return state.groups.map((group) => {
      const groupMemberIds = state.groupMemberIds[group.id] ?? [];
      const members = state.members.filter((member) => groupMemberIds.includes(member.id));
      const matches = state.matches.filter((match) => match.groupId === group.id);
      return { group, rows: calculateRankings(members, matches) };
    });
  }, [state]);

  const overallRanking = useMemo(() => {
    const rows = state.groups.flatMap((group) => {
      const groupMemberIds = state.groupMemberIds[group.id] ?? [];
      const members = state.members.filter((member) => groupMemberIds.includes(member.id));
      const matches = state.matches.filter((match) => match.groupId === group.id);
      return calculateRankings(members, matches).map((row) => ({ ...row, groupName: group.name }));
    });

    return rows.sort(
      (a, b) =>
        b.wins - a.wins ||
        b.pointDiff - a.pointDiff ||
        b.pointsFor - a.pointsFor ||
        a.pointsAgainst - b.pointsAgainst ||
        a.name.localeCompare(b.name, "ko")
    );
  }, [state]);

  return (
    <main className="mx-auto max-w-md px-4 py-5">
      <h1 className="text-3xl font-bold">{state.tournament.name}</h1>
      <p className="mb-4 mt-1 text-lg text-slate-700">{state.tournament.date}</p>
      <Tabs activeId={activeTab} onChange={setActiveTab} tabs={tabs} />

      {activeTab === "schedule" && (
        <div className="mt-5 space-y-6">
          {state.groups.map((group) => (
            <section className="space-y-3" key={group.id}>
              <h2 className="text-2xl font-bold">{group.name}</h2>
              {state.matches
                .filter((match) => match.groupId === group.id)
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((match) => (
                  <MatchCard key={match.id} match={match} members={state.members} />
                ))}
            </section>
          ))}
        </div>
      )}

      {activeTab === "group" && (
        <div className="mt-5 space-y-6">
          {groupRankings.map(({ group, rows }) => (
            <section className="space-y-3" key={group.id}>
              <h2 className="text-2xl font-bold">{group.name}</h2>
              <RankingTable rows={rows} />
            </section>
          ))}
        </div>
      )}

      {activeTab === "overall" && (
        <section className="mt-5 space-y-3">
          <h2 className="text-2xl font-bold">전체 순위</h2>
          <RankingTable rows={overallRanking.map((row, index) => ({ ...row, rank: index + 1 }))} />
        </section>
      )}
    </main>
  );
}
