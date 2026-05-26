import type { Match, Member } from "../lib/domain/types";

export function PublicMatchCard({ match, members }: { match: Match; members: Member[] }) {
  const nameOf = (id: string) => members.find((member) => member.id === id)?.name ?? "미정";
  const sideANames = match.sideAPlayerIds.map(nameOf);
  const sideBNames = match.sideBPlayerIds.map(nameOf);
  const hasScore = match.sideAScore !== null && match.sideBScore !== null;
  const scoreText = hasScore ? `${match.sideAScore}:${match.sideBScore}` : "VS";

  return (
    <article className="public-match-card">
      <div className="public-match-summary">
        <span className="match-number-badge">경기 {match.matchNumber}</span>
        <span className={`status-pill ${hasScore ? "completed" : "draft"}`}>{hasScore ? "완료" : "대기"}</span>
      </div>
      <div className="match-team-grid public-team-grid">
        <div className="match-team match-team-a">
          {sideANames.length > 0 ? (
            sideANames.map((name, index) => (
              <span className="match-player" key={`${match.id}-a-${index}`}>
                {name}
              </span>
            ))
          ) : (
            <span className="match-player">선수 미정</span>
          )}
        </div>
        <div className={`match-vs public-match-score ${hasScore ? "completed" : ""}`}>{scoreText}</div>
        <div className="match-team match-team-b">
          {sideBNames.length > 0 ? (
            sideBNames.map((name, index) => (
              <span className="match-player" key={`${match.id}-b-${index}`}>
                {name}
              </span>
            ))
          ) : (
            <span className="match-player">선수 미정</span>
          )}
        </div>
      </div>
    </article>
  );
}
