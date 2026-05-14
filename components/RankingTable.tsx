import type { RankingRow } from "@/lib/domain/types";

type RankingTableProps = {
  rows: Array<RankingRow & { groupName?: string }>;
};

export function RankingTable({ rows }: RankingTableProps) {
  return (
    <div className="ranking-table">
      <div className="ranking-header">
        <span>순위</span>
        <span>이름</span>
        <span>승</span>
        <span>무</span>
        <span>패</span>
        <span>승점</span>
        <span>득실</span>
      </div>
      {rows.map((row) => (
        <div key={`${row.memberId}-${row.groupName ?? "group"}`} className="ranking-line">
          <strong>{row.rank}</strong>
          <div>
            <strong>{row.name}</strong>
            {row.groupName && <small>{row.groupName}</small>}
          </div>
          <span>{row.wins}</span>
          <span>{row.draws}</span>
          <span>{row.losses}</span>
          <span>{row.rankingPoints}</span>
          <span>{row.pointDiff > 0 ? `+${row.pointDiff}` : row.pointDiff}</span>
        </div>
      ))}
    </div>
  );
}
