"use client";

import { PhoneCall, Plus, Search, ToggleLeft, ToggleRight } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import type { Member } from "@/lib/domain/types";
import { loadTournamentState, saveTournamentState, type TournamentState } from "@/lib/store/tournament-store";

type MemberForm = {
  id?: string;
  name: string;
  phone: string;
  notes: string;
  active: boolean;
};

const emptyForm: MemberForm = {
  name: "",
  phone: "",
  notes: "",
  active: true
};

function maskPhone(phone?: string) {
  if (!phone) return "연락처 없음";
  return phone.replace(/(\d{3})-?(\d{4})-?(\d{4})/, "$1-****-$3");
}

export default function MemberManagementPage() {
  const [state, setState] = useState<TournamentState>(() => loadTournamentState());
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<MemberForm>(emptyForm);

  const visibleMembers = useMemo(() => {
    const keyword = query.trim();
    return state.members.filter((member) => member.name.includes(keyword));
  }, [query, state.members]);

  function persist(next: TournamentState) {
    saveTournamentState(next);
    setState(next);
  }

  function editMember(member: Member) {
    setForm({
      id: member.id,
      name: member.name,
      phone: member.phone ?? "",
      notes: member.notes,
      active: member.active ?? true
    });
  }

  function saveMember() {
    const name = form.name.trim();
    if (!name) return;

    const nextMember: Member = {
      id: form.id ?? `member-${Date.now()}`,
      name,
      phone: form.phone.trim(),
      notes: form.notes.trim(),
      active: form.active
    };

    const exists = state.members.some((member) => member.id === nextMember.id);
    persist({
      ...state,
      members: exists
        ? state.members.map((member) => (member.id === nextMember.id ? nextMember : member))
        : [...state.members, nextMember]
    });
    setForm(emptyForm);
  }

  return (
    <AppShell title="회원관리" subtitle="회원 이름과 연락처만 간단히 관리합니다" active="members">
      <div className="page">
        <section className="section-card">
          <div className="search-box">
            <Search size={18} />
            <input onChange={(event) => setQuery(event.target.value)} placeholder="이름으로 검색" type="search" value={query} />
          </div>
        </section>

        <section className="section-card stack">
          <strong className="section-head">{form.id ? "회원 수정" : "회원 등록"}</strong>
          <label className="field">
            <span>이름</span>
            <input onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} value={form.name} />
          </label>
          <label className="field">
            <span>연락처</span>
            <input onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="010-0000-0000" value={form.phone} />
          </label>
          <label className="field">
            <span>메모</span>
            <textarea onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={3} value={form.notes} />
          </label>
          <button className="ghost-button" onClick={() => setForm((current) => ({ ...current, active: !current.active }))} type="button">
            {form.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            {form.active ? "활동 회원" : "비활동 회원"}
          </button>
          <div className="sticky-footer">
            <button className="ghost-button" onClick={() => setForm(emptyForm)} type="button">
              초기화
            </button>
            <button className="primary-button" onClick={saveMember} type="button">
              <Plus size={20} />
              저장
            </button>
          </div>
        </section>

        <section className="section-card">
          <strong className="section-head">회원 목록</strong>
          <div className="list-stack">
            {visibleMembers.map((member) => (
              <button className="member-card" key={member.id} onClick={() => editMember(member)} type="button">
                <div className="member-card-top">
                  <div className="member-name-block">
                    <span className="member-level-dot">{member.name.slice(0, 1)}</span>
                    <div>
                      <strong className="member-name">{member.name}</strong>
                      <span className="member-phone">{maskPhone(member.phone)}</span>
                    </div>
                  </div>
                  <span className="member-call-pill">
                    <PhoneCall size={14} />
                    수정
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
