import type { Match, Member } from "@/lib/domain/types";

export function MatchCard({ match, members }: { match: Match; members: Member[] }) {
  const nameOf = (id: string) => members.find((member) => member.id === id)?.name ?? "미정";
  const hasScore = match.sideAScore !== null && match.sideBScore !== null;
  const sideANames = match.sideAPlayerIds.map(nameOf);
  const sideBNames = match.sideBPlayerIds.map(nameOf);
  const scoreText = hasScore ? `${match.sideAScore}:${match.sideBScore}` : "VS";

  return (
    <details className={`match-card ${hasScore ? "completed" : "pending"}`} open={!hasScore}>
      <summary className="match-summary">
        <span className="match-number-badge">경기 {match.matchNumber}</span>
        <span className="match-summary-body">
          <span className="match-summary-teams">
            <span>{sideANames.join(", ")}</span>
            <span>{sideBNames.join(", ")}</span>
          </span>
          <b className="match-summary-score">{scoreText}</b>
        </span>
        <span className={`status-pill ${hasScore ? "completed" : "draft"}`}>{hasScore ? "완료" : "대기"}</span>
      </summary>
      <div className="match-team-grid">
        <div className="match-team match-team-a">
          {sideANames.map((name, index) => (
            <span className="match-player" key={`${match.id}-a-${index}`}>
              {name}
            </span>
          ))}
        </div>
        <div className="match-vs">{scoreText}</div>
        <div className="match-team match-team-b">
          {sideBNames.map((name, index) => (
            <span className="match-player" key={`${match.id}-b-${index}`}>
              {name}
            </span>
          ))}
        </div>
      </div>
    </details>
  );
}
