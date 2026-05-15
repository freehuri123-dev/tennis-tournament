import type { Match, Member } from "@/lib/domain/types";

export function MatchCard({ match, members }: { match: Match; members: Member[] }) {
  const nameOf = (id: string) => members.find((member) => member.id === id)?.name ?? "미정";
  const hasScore = match.sideAScore !== null && match.sideBScore !== null;

  return (
    <article className="match-card">
      <div className="match-card-top">
        <strong>경기 {match.matchNumber}</strong>
        <span className={`status-pill ${hasScore ? "completed" : "draft"}`}>{hasScore ? "완료" : "대기"}</span>
      </div>
      <div className="match-team-grid">
        <div className="match-team match-team-a">
          {match.sideAPlayerIds.map((id, index) => (
            <span className="match-player" key={`${id || "empty"}-a-${index}`}>
              {nameOf(id)}
            </span>
          ))}
        </div>
        <div className="match-vs">{hasScore ? `${match.sideAScore}:${match.sideBScore}` : "VS"}</div>
        <div className="match-team match-team-b">
          {match.sideBPlayerIds.map((id, index) => (
            <span className="match-player" key={`${id || "empty"}-b-${index}`}>
              {nameOf(id)}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
