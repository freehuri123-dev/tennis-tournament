import type { RankingRow } from "@/lib/domain/types";

type RankingTableProps = {
  rows: Array<RankingRow & { groupName?: string }>;
};

export function RankingTable({ rows }: RankingTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white">
      {rows.map((row) => (
        <div key={`${row.memberId}-${row.groupName ?? "group"}`} className="grid grid-cols-[3rem_1fr_4rem] items-center gap-2 border-b border-line p-3 last:border-b-0">
          <div className="text-xl font-bold text-court">{row.rank}</div>
          <div>
            <div className="text-lg font-bold">{row.name}</div>
            <div className="text-sm text-slate-600">
              {row.groupName ? `${row.groupName} · ` : ""}득점 {row.pointsFor} · 실점 {row.pointsAgainst}
            </div>
          </div>
          <div className="text-right text-base font-bold">
            {row.wins}승 {row.losses}패
            <div className="text-sm text-slate-600">{row.pointDiff > 0 ? `+${row.pointDiff}` : row.pointDiff}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
