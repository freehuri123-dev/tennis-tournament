import type { TeamRankingRow } from "@/lib/domain/types";

type TeamRankingTableProps = {
  rows: TeamRankingRow[];
};

export function TeamRankingTable({ rows }: TeamRankingTableProps) {
  return (
    <div className="ranking-card-list">
      {rows.map((row) => (
        <article className={`ranking-card rank-${row.rank <= 3 ? row.rank : "normal"}`} key={row.teamId}>
          <div className="ranking-card-main">
            <span className="ranking-badge">{row.rank}위</span>
            <div>
              <strong>{row.name}</strong>
              <small>고정 페어</small>
            </div>
          </div>
          <div className="ranking-stat-grid team-ranking-stat-grid">
            <span><b>{row.matchesPlayed}</b>경기</span>
            <span><b>{row.wins}</b>승</span>
            <span><b>{row.losses}</b>패</span>
            <span><b>{row.pointsFor}</b>득점</span>
            <span><b>{row.pointsAgainst}</b>실점</span>
            <span><b>{row.pointDiff > 0 ? `+${row.pointDiff}` : row.pointDiff}</b>득실차</span>
          </div>
        </article>
      ))}
      {rows.length === 0 && <p className="lead">아직 순위를 표시할 페어가 없습니다.</p>}
    </div>
  );
}