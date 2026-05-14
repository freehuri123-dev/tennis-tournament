import type { RankingRow } from "@/lib/domain/types";

type RankingTableProps = {
  rows: Array<RankingRow & { groupName?: string }>;
};

export function RankingTable({ rows }: RankingTableProps) {
  return (
    <div className="ranking-card-list">
      {rows.map((row) => (
        <article key={`${row.memberId}-${row.groupName ?? "group"}`} className={`ranking-card rank-${row.rank <= 3 ? row.rank : "normal"}`}>
          <div className="ranking-card-main">
            <span className="ranking-badge">{row.rank}위</span>
            <div>
              <strong>{row.name}</strong>
              {row.groupName && <small>{row.groupName}</small>}
            </div>
          </div>
          <div className="ranking-stat-grid">
            <span><b>{row.wins}</b>승</span>
            <span><b>{row.draws}</b>무</span>
            <span><b>{row.losses}</b>패</span>
            <span><b>{row.rankingPoints}</b>승점</span>
            <span><b>{row.pointDiff > 0 ? `+${row.pointDiff}` : row.pointDiff}</b>득실차</span>
          </div>
        </article>
      ))}
      {rows.length === 0 && <p className="lead">아직 순위에 표시할 선수가 없습니다.</p>}
    </div>
  );
}
