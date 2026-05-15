import Link from "next/link";
import { Mars, PhoneCall, Plus, Search, Venus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { InvalidClubPage } from "@/components/InvalidClubPage";
import { buildClubPath, isKnownClubSlug } from "@/lib/domain/club";
import { listMembersByClub } from "@/lib/server/repositories/tournament-repository";

function maskPhone(phone?: string) {
  if (!phone) return "연락처 없음";
  return phone.replace(/(\d{3})-?(\d{4})-?(\d{4})/, "$1-****-$3");
}

export default async function ClubMembersPage({
  params,
  searchParams
}: {
  params: Promise<{ clubSlug: string }>;
  searchParams?: Promise<{ q?: string }>;
}) {
  const { clubSlug } = await params;
  if (!isKnownClubSlug(clubSlug)) return <InvalidClubPage />;

  const queryParams = await searchParams;
  const query = queryParams?.q ?? "";
  const keyword = query.trim();
  const members = await listMembersByClub(clubSlug);
  const visibleMembers = keyword
    ? members.filter((member) => member.name.includes(keyword))
    : members;

  return (
    <AppShell title="회원관리" subtitle="회원 목록을 확인합니다" active="members" clubSlug={clubSlug}>
      <div className="page">
        <section className="section-card">
          <form className="search-box">
            <Search size={18} />
            <input defaultValue={query} name="q" placeholder="이름으로 검색" type="search" />
          </form>
        </section>

        <section className="section-card">
          <div className="today-card-top">
            <strong className="section-head" style={{ marginBottom: 0 }}>회원 목록</strong>
          </div>
          <Link className="member-create-button" href={buildClubPath(clubSlug, "members/new")}>
            <Plus size={20} />
            회원등록
          </Link>
          <div className="list-stack" style={{ marginTop: 12 }}>
            {visibleMembers.map((member) => (
              <div className={`member-card member-row-card ${member.active === false ? "inactive" : ""}`} key={member.id}>
                <Link className="member-row-link" href={buildClubPath(clubSlug, `members/edit/${member.id}`)}>
                  <div className="member-name-block">
                    <span className={`member-gender-dot ${member.gender === "female" ? "female" : "male"}`}>
                      {member.gender === "female" ? <Venus size={20} /> : <Mars size={20} />}
                    </span>
                    <div>
                      <strong className="member-name">{member.name}</strong>
                      <span className="member-phone">{maskPhone(member.phone)}</span>
                    </div>
                  </div>
                </Link>
                {member.phone ? (
                  <a className="member-call-pill" href={`tel:${member.phone}`}>
                    <PhoneCall size={14} />
                    통화
                  </a>
                ) : (
                  <span className="member-call-pill" aria-disabled="true">
                    <PhoneCall size={14} />
                    통화
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
