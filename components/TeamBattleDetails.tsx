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
  const rankingsByMemberId = new Map(calculateRankings(members, matches).map((row) => [row.memberId, row]));

  return members
    .map((member) => {
      const ranking = rankingsByMemberId.get(member.id);
      const completedMatches = ranking ? ranking.wins + ranking.draws + ranking.losses : 0;
      return {
        member,
        percent: completedMatches > 0 ? Math.round(((ranking?.wins ?? 0) / completedMatches) * 100) : 0
      };
    })
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
        <small>개인 경기 승률</small>
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
                  <div className="team-contribution-track" aria-label={`${member.name} 승률 ${percent}%`}>
                    <span style={{ width: `${percent}%` }} />
                  </div>
                </div>
              ))}
              {rows.length === 0 && <p className="notice-text">배정된 선수가 없습니다.</p>}
            </div>
          </section>
        ))}
      </div>
      <p className="team-contribution-note">기여도는 각 선수의 완료 경기 중 승리한 경기의 비율입니다.</p>
    </section>
  );
}
