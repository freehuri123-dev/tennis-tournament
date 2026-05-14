import type { RankingRow } from "@/lib/domain/types";

type RankingTableProps = {
  rows: Array<RankingRow & { groupName?: string }>;
};

export function RankingTable({ rows }: RankingTableProps) {
  return (
    <div className="ranking-list">
      {rows.map((row) => (
        <div key={`${row.memberId}-${row.groupName ?? "group"}`} className="ranking-row-card">
          <div className="ranking-left">
            <span className="ranking-rank">{row.rank}</span>
            <div>
              <strong className="ranking-name">{row.name}</strong>
              {row.groupName && <span className="group-chip">{row.groupName}</span>}
            </div>
          </div>
          <div className="ranking-stats">
            <span>
              승<strong>{row.wins}</strong>
            </span>
            <span>
              패<strong>{row.losses}</strong>
            </span>
            <span>
              득실<strong>{row.pointDiff > 0 ? `+${row.pointDiff}` : row.pointDiff}</strong>
            </span>
            <span>
              득점<strong>{row.pointsFor}</strong>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
