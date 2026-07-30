import { calculateRankings } from "@/lib/domain/ranking";
import type { Match, Member } from "@/lib/domain/types";

type TeamBattleDetailsProps = {
  blueMembers: Member[];
  whiteMembers: Member[];
  matches: Match[];
};

type ContributionRow = {
  member: Member;
  percent: number;
};

function calculateContribution(members: Member[], matches: Match[]): ContributionRow[] {
  const winsByMemberId = new Map(calculateRankings(members, matches).map((row) => [row.memberId, row.wins]));
  const memberIds = new Set(members.map((member) => member.id));
  const teamWins = matches.filter((match) => {
    if (match.status !== "completed" || match.sideAScore === null || match.sideBScore === null) return false;
    const hasSideAMember = match.sideAPlayerIds.some((memberId) => memberIds.has(memberId));
    const hasSideBMember = match.sideBPlayerIds.some((memberId) => memberIds.has(memberId));
    return (hasSideAMember && match.sideAScore > match.sideBScore)
      || (hasSideBMember && match.sideBScore > match.sideAScore);
  }).length;

  return members
    .map((member) => ({
      member,
      percent: teamWins > 0 ? Math.round(((winsByMemberId.get(member.id) ?? 0) / teamWins) * 100) : 0
    }))
    .sort((left, right) => right.percent - left.percent || left.member.name.localeCompare(right.member.name, "ko"));
}

export function TeamBattleRoster({ blueMembers, whiteMembers }: Omit<TeamBattleDetailsProps, "matches">) {
  return (
    <div className="team-battle-roster-summary">
      {([
        ["blue", "청팀", blueMembers],
        ["white", "백팀", whiteMembers]
      ] as const).map(([side, label, members]) => (
        <section className={`team-roster-summary-card ${side}`} key={side}>
          <div className="team-roster-summary-head">
            <span className={`team-side-badge ${side}`}>{label}</span>
            <strong>{members.length}명</strong>
          </div>
          <div className="team-roster-member-list">
            {members.map((member) => <span key={member.id}>{member.name}</span>)}
            {members.length === 0 && <small>배정된 선수가 없습니다.</small>}
          </div>
        </section>
      ))}
    </div>
  );
}

export function TeamBattleContributionDetails({ blueMembers, whiteMembers, matches }: TeamBattleDetailsProps) {
  const teams = [
    { side: "blue" as const, label: "청팀", rows: calculateContribution(blueMembers, matches) },
    { side: "white" as const, label: "백팀", rows: calculateContribution(whiteMembers, matches) }
  ];

  return (
    <section className="team-battle-contribution-section">
      <div className="team-battle-contribution-head">
        <strong>팀 기여도</strong>
        <small>팀 승리 참여 비율</small>
      </div>
      <div className="team-battle-contribution-grid">
        {teams.map(({ side, label, rows }) => (
          <section className={`team-contribution-card ${side}`} key={side}>
            <div className="team-personal-ranking-head">
              <span className={`team-side-badge ${side}`}>{label}</span>
              <strong>{rows.length}명</strong>
            </div>
            <div className="team-contribution-list">
              {rows.map(({ member, percent }) => (
                <div className="team-contribution-member" key={member.id}>
                  <div className="team-contribution-member-head">
                    <strong>{member.name}</strong>
                    <b>{percent}%</b>
                  </div>
                  <div className="team-contribution-track" aria-label={`${member.name} 팀 승리 기여도 ${percent}%`}>
                    <span style={{ width: `${percent}%` }} />
                  </div>
                </div>
              ))}
              {rows.length === 0 && <p className="notice-text">배정된 선수가 없습니다.</p>}
            </div>
          </section>
        ))}
      </div>
      <p className="team-contribution-note">기여도는 팀 전체 승리 경기 중 각 선수가 승리에 참여한 비율입니다.</p>
    </section>
  );
}