"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { MatchCard } from "@/components/MatchCard";
import { RankingTable } from "@/components/RankingTable";
import { Section } from "@/components/Section";
import { calculateRankings } from "@/lib/domain/ranking";
import { generateInitialMatches } from "@/lib/domain/schedule";
import type { Match, TournamentGroup } from "@/lib/domain/types";
import { checkAdminPassword, loadTournamentState, saveTournamentState, type TournamentState } from "@/lib/store/tournament-store";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [state, setState] = useState<TournamentState>(() => loadTournamentState());
  const [error, setError] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberLevel, setNewMemberLevel] = useState("B");

  const rankings = useMemo(() => {
    return state.groups.map((group) => {
      const groupMemberIds = state.groupMemberIds[group.id] ?? [];
      const members = state.members.filter((member) => groupMemberIds.includes(member.id));
      const matches = state.matches.filter((match) => match.groupId === group.id);
      return { group, rows: calculateRankings(members, matches) };
    });
  }, [state]);

  function persist(next: TournamentState) {
    saveTournamentState(next);
    return next;
  }

  function unlock() {
    if (!checkAdminPassword(password)) {
      setError("비밀번호가 맞지 않습니다.");
      return;
    }
    setState((current) => ({ ...current, adminUnlocked: true }));
    setError("");
  }

  function createTournament() {
    const today = new Date().toISOString().slice(0, 10);
    setState((current) =>
      persist({
        ...current,
        tournament: {
          id: `tournament-${Date.now()}`,
          name: "새 월례대회",
          date: today,
          publicSlug: "monthly-demo",
          status: "draft"
        },
        groups: [],
        groupMemberIds: {},
        matches: []
      })
    );
  }

  function updateTournamentField(field: "name" | "date", value: string) {
    setState((current) =>
      persist({
        ...current,
        tournament: { ...current.tournament, [field]: value }
      })
    );
  }

  function addMember() {
    const trimmedName = newMemberName.trim();
    if (!trimmedName) return;

    setState((current) =>
      persist({
        ...current,
        members: [
          ...current.members,
          {
            id: `member-${Date.now()}`,
            name: trimmedName,
            level: newMemberLevel,
            notes: ""
          }
        ]
      })
    );

    setNewMemberName("");
    setNewMemberLevel("B");
  }

  function addGroup() {
    setState((current) => {
      const nextGroupNumber = current.groups.length + 1;
      const groupId = `group-${Date.now()}`;
      return persist({
        ...current,
        groups: [
          ...current.groups,
          {
            id: groupId,
            tournamentId: current.tournament.id,
            name: `${String.fromCharCode(64 + nextGroupNumber)}조`,
            scheduleFormat: "hanul-aa",
            sortOrder: nextGroupNumber
          }
        ],
        groupMemberIds: {
          ...current.groupMemberIds,
          [groupId]: []
        }
      });
    });
  }

  function updateGroupFormat(groupId: string, scheduleFormat: TournamentGroup["scheduleFormat"]) {
    setState((current) =>
      persist({
        ...current,
        groups: current.groups.map((group) => (group.id === groupId ? { ...group, scheduleFormat } : group))
      })
    );
  }

  function toggleGroupMember(groupId: string, memberId: string) {
    setState((current) => {
      const currentIds = current.groupMemberIds[groupId] ?? [];
      const nextIds = currentIds.includes(memberId) ? currentIds.filter((id) => id !== memberId) : [...currentIds, memberId];
      return persist({
        ...current,
        groupMemberIds: {
          ...current.groupMemberIds,
          [groupId]: nextIds
        }
      });
    });
  }

  function generateScheduleForGroup(groupId: string) {
    setState((current) => {
      const group = current.groups.find((item) => item.id === groupId);
      if (!group) return current;
      const groupMemberIds = current.groupMemberIds[groupId] ?? [];
      const participants = current.members.filter((member) => groupMemberIds.includes(member.id));
      const generated = generateInitialMatches({
        tournamentId: current.tournament.id,
        groupId,
        format: group.scheduleFormat,
        participants
      });
      return persist({
        ...current,
        matches: [...current.matches.filter((match) => match.groupId !== groupId), ...generated]
      });
    });
  }

  function updateMatch(matchId: string, patch: Partial<Match>) {
    setState((current) =>
      persist({
        ...current,
        matches: current.matches.map((match) => (match.id === matchId ? { ...match, ...patch } : match))
      })
    );
  }

  function addMatch(groupId: string) {
    setState((current) => {
      const groupMatches = current.matches.filter((match) => match.groupId === groupId);
      const nextNumber = groupMatches.length + 1;
      const memberIds = current.groupMemberIds[groupId] ?? [];
      return persist({
        ...current,
        matches: [
          ...current.matches,
          {
            id: `${groupId}-manual-${Date.now()}`,
            tournamentId: current.tournament.id,
            groupId,
            matchNumber: nextNumber,
            sideAPlayerIds: memberIds.slice(0, 2),
            sideBPlayerIds: memberIds.slice(2, 4),
            sideAScore: null,
            sideBScore: null,
            status: "scheduled",
            sortOrder: nextNumber
          }
        ]
      });
    });
  }

  function deleteMatch(matchId: string) {
    setState((current) =>
      persist({
        ...current,
        matches: current.matches.filter((match) => match.id !== matchId)
      })
    );
  }

  function replacePlayer(matchId: string, side: "A" | "B", index: number, memberId: string) {
    setState((current) =>
      persist({
        ...current,
        matches: current.matches.map((match) => {
          if (match.id !== matchId) return match;
          const key = side === "A" ? "sideAPlayerIds" : "sideBPlayerIds";
          const nextIds = [...match[key]];
          nextIds[index] = memberId;
          return { ...match, [key]: nextIds };
        })
      })
    );
  }

  function moveMatch(matchId: string, direction: -1 | 1) {
    setState((current) => {
      const target = current.matches.find((match) => match.id === matchId);
      if (!target) return current;
      const groupMatches = current.matches.filter((match) => match.groupId === target.groupId).sort((a, b) => a.sortOrder - b.sortOrder);
      const index = groupMatches.findIndex((match) => match.id === matchId);
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= groupMatches.length) return current;
      const reordered = [...groupMatches];
      const [removed] = reordered.splice(index, 1);
      reordered.splice(nextIndex, 0, removed);
      const orderMap = new Map(reordered.map((match, orderIndex) => [match.id, orderIndex + 1]));
      return persist({
        ...current,
        matches: current.matches.map((match) =>
          orderMap.has(match.id) ? { ...match, sortOrder: orderMap.get(match.id)!, matchNumber: orderMap.get(match.id)! } : match
        )
      });
    });
  }

  if (!state.adminUnlocked) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-5">
        <h1 className="text-3xl font-bold">관리자 입장</h1>
        <input
          className="min-h-14 rounded-lg border border-line px-4 text-xl"
          inputMode="numeric"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="비밀번호"
          type="password"
          value={password}
        />
        {error && <p className="text-lg font-bold text-red-600">{error}</p>}
        <Button onClick={unlock}>확인</Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-5">
      <h1 className="text-3xl font-bold">{state.tournament.name}</h1>
      <p className="mt-1 text-lg text-slate-700">{state.tournament.date}</p>

      <Section title="대회 설정">
        <Button onClick={createTournament} variant="secondary">
          새 대회 만들기
        </Button>
        <input className="w-full rounded-lg border border-line px-3 py-3 text-lg" onChange={(event) => updateTournamentField("name", event.target.value)} value={state.tournament.name} />
        <input className="w-full rounded-lg border border-line px-3 py-3 text-lg" onChange={(event) => updateTournamentField("date", event.target.value)} type="date" value={state.tournament.date} />
      </Section>

      <Section title="회원 관리">
        <div className="grid grid-cols-[1fr_5rem] gap-2">
          <input className="rounded-lg border border-line px-3 py-3 text-lg" onChange={(event) => setNewMemberName(event.target.value)} placeholder="회원 이름" value={newMemberName} />
          <input className="rounded-lg border border-line px-3 py-3 text-lg" onChange={(event) => setNewMemberLevel(event.target.value)} placeholder="레벨" value={newMemberLevel} />
        </div>
        <Button onClick={addMember}>회원 추가</Button>
        <div className="space-y-2">
          {state.members.map((member) => (
            <div className="rounded-lg border border-line bg-white p-3 text-lg" key={member.id}>
              <strong>{member.name}</strong>
              <span className="ml-2 text-slate-600">{member.level}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="그룹 편성">
        <Button onClick={addGroup} variant="secondary">
          그룹 추가
        </Button>
        {state.groups.map((group) => (
          <div className="space-y-2 rounded-lg border border-line bg-white p-3" key={group.id}>
            <h3 className="text-xl font-bold">{group.name}</h3>
            <select className="w-full rounded-lg border border-line px-3 py-3 text-lg" onChange={(event) => updateGroupFormat(group.id, event.target.value as TournamentGroup["scheduleFormat"])} value={group.scheduleFormat}>
              <option value="hanul-aa">한울AA</option>
              <option value="kdk-v2010">KDK-V2010</option>
            </select>
            <Button onClick={() => generateScheduleForGroup(group.id)}>대진표 생성</Button>
            <div className="grid grid-cols-2 gap-2">
              {state.members.map((member) => {
                const selected = (state.groupMemberIds[group.id] ?? []).includes(member.id);
                return (
                  <button
                    className={`rounded-lg border px-3 py-2 text-left text-base font-bold ${selected ? "border-court bg-court text-white" : "border-line bg-white text-ink"}`}
                    key={member.id}
                    onClick={() => toggleGroupMember(group.id, member.id)}
                    type="button"
                  >
                    {member.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </Section>

      <Section title="대진표 관리">
        {state.groups.map((group) => (
          <div className="space-y-3" key={group.id}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold">{group.name}</h3>
              <Button onClick={() => addMatch(group.id)} variant="secondary">
                경기 추가
              </Button>
            </div>
            {state.matches
              .filter((match) => match.groupId === group.id)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((match) => (
                <div className="space-y-2" key={match.id}>
                  <MatchCard match={match} members={state.members} />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="rounded-lg border border-line px-3 py-3 text-xl"
                      inputMode="numeric"
                      onChange={(event) => updateMatch(match.id, { sideAScore: Number(event.target.value), status: "completed" })}
                      placeholder="A점수"
                      value={match.sideAScore ?? ""}
                    />
                    <input
                      className="rounded-lg border border-line px-3 py-3 text-xl"
                      inputMode="numeric"
                      onChange={(event) => updateMatch(match.id, { sideBScore: Number(event.target.value), status: "completed" })}
                      placeholder="B점수"
                      value={match.sideBScore ?? ""}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[0, 1].map((index) => (
                      <select className="rounded-lg border border-line px-3 py-3 text-base" key={`a-${index}`} onChange={(event) => replacePlayer(match.id, "A", index, event.target.value)} value={match.sideAPlayerIds[index] ?? ""}>
                        <option value="">A팀 {index + 1}: 선택</option>
                        {state.members.map((member) => (
                          <option key={member.id} value={member.id}>
                            A팀 {index + 1}: {member.name}
                          </option>
                        ))}
                      </select>
                    ))}
                    {[0, 1].map((index) => (
                      <select className="rounded-lg border border-line px-3 py-3 text-base" key={`b-${index}`} onChange={(event) => replacePlayer(match.id, "B", index, event.target.value)} value={match.sideBPlayerIds[index] ?? ""}>
                        <option value="">B팀 {index + 1}: 선택</option>
                        {state.members.map((member) => (
                          <option key={member.id} value={member.id}>
                            B팀 {index + 1}: {member.name}
                          </option>
                        ))}
                      </select>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button onClick={() => moveMatch(match.id, -1)} variant="secondary">
                      위로
                    </Button>
                    <Button onClick={() => moveMatch(match.id, 1)} variant="secondary">
                      아래로
                    </Button>
                    <Button onClick={() => deleteMatch(match.id)} variant="danger">
                      삭제
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        ))}
      </Section>

      <Section title="그룹별 순위">
        {rankings.map(({ group, rows }) => (
          <div className="space-y-2" key={group.id}>
            <h3 className="text-xl font-bold">{group.name}</h3>
            <RankingTable rows={rows} />
          </div>
        ))}
      </Section>
    </main>
  );
}
