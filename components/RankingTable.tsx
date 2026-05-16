import type { RankingRow } from "@/lib/domain/types";

type RankingTableRow = RankingRow & { groupName?: string };

type RankingTableProps = {
  rows: RankingTableRow[];
};

export function RankingTable({ rows }: RankingTableProps) {
  function hasPointDiffTie(row: RankingTableRow) {
    return rows.some((other) =>
      other.memberId !== row.memberId &&
      other.groupName === row.groupName &&
      other.rankingPoints === row.rankingPoints &&
      other.wins === row.wins &&
      other.pointDiff === row.pointDiff
    );
  }

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
          {hasPointDiffTie(row) && (
            <small className="ranking-tie-detail">득실 동률: 득점 {row.pointsFor} / 실점 {row.pointsAgainst}</small>
          )}
        </article>
      ))}
      {rows.length === 0 && <p className="lead">아직 순위에 표시할 선수가 없습니다.</p>}
    </div>
  );
}
