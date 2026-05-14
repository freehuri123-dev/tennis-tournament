import type { Match, Member } from "@/lib/domain/types";

export function MatchCard({ match, members }: { match: Match; members: Member[] }) {
  const nameOf = (id: string) => members.find((member) => member.id === id)?.name ?? "미정";

  return (
    <article className="rounded-lg border border-line bg-white p-4">
      <div className="mb-3 text-base font-bold text-slate-600">경기 {match.matchNumber}</div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-lg font-bold">
        <div>{match.sideAPlayerIds.map(nameOf).join(" / ")}</div>
        <div className="text-center text-xl">
          {match.sideAScore ?? "-"} : {match.sideBScore ?? "-"}
        </div>
        <div className="text-right">{match.sideBPlayerIds.map(nameOf).join(" / ")}</div>
      </div>
    </article>
  );
}
