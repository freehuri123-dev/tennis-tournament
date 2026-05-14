"use client";

import Link from "next/link";
import { PhoneCall, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { loadTournamentState, type TournamentState } from "@/lib/store/tournament-store";

function maskPhone(phone?: string) {
  if (!phone) return "연락처 없음";
  return phone.replace(/(\d{3})-?(\d{4})-?(\d{4})/, "$1-****-$3");
}

export default function MemberManagementPage() {
  const [state] = useState<TournamentState>(() => loadTournamentState());
  const [query, setQuery] = useState("");
  const [showHidden, setShowHidden] = useState(false);

  const visibleMembers = useMemo(() => {
    const keyword = query.trim();
    return state.members
      .filter((member) => showHidden || member.active !== false)
      .filter((member) => member.name.includes(keyword))
      .sort((left, right) => Number(left.active === false) - Number(right.active === false) || left.name.localeCompare(right.name, "ko"));
  }, [query, showHidden, state.members]);

  return (
    <AppShell title="회원관리" subtitle="회원 목록을 먼저 확인합니다" active="members">
      <div className="page">
        <section className="section-card">
          <div className="search-box">
            <Search size={18} />
            <input onChange={(event) => setQuery(event.target.value)} placeholder="이름으로 검색" type="search" value={query} />
          </div>
        </section>

        <section className="section-card">
          <div className="today-card-top">
            <strong className="section-head" style={{ marginBottom: 0 }}>회원 목록</strong>
            <button className={`small-filter-button ${showHidden ? "active" : ""}`} onClick={() => setShowHidden((current) => !current)} type="button">
              숨김 포함
            </button>
          </div>
          <Link className="member-create-button" href="/admin/members/new">
            <Plus size={20} />
            회원등록
          </Link>
          <div className="list-stack" style={{ marginTop: 12 }}>
            {visibleMembers.map((member) => (
              <div className={`member-card member-row-card ${member.active === false ? "inactive" : ""}`} key={member.id}>
                <Link className="member-row-link" href={`/admin/members/edit/${member.id}`}>
                  <div className="member-name-block">
                    <span className="member-level-dot">{member.name.slice(0, 1)}</span>
                    <div>
                      <strong className="member-name">{member.name}</strong>
                      <span className="member-phone">{maskPhone(member.phone)}</span>
                    </div>
                  </div>
                </Link>
                <a className="member-call-pill" href={`tel:${member.phone ?? ""}`} onClick={(event) => !member.phone && event.preventDefault()}>
                  <PhoneCall size={14} />
                  통화
                </a>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
