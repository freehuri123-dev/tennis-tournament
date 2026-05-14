"use client";

import { Eye, EyeOff, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import type { Member } from "@/lib/domain/types";
import { loadTournamentState, saveTournamentState, type TournamentState } from "@/lib/store/tournament-store";

type MemberFormProps = {
  memberId?: string;
};

export function MemberForm({ memberId }: MemberFormProps) {
  const [state, setState] = useState<TournamentState>(() => loadTournamentState());
  const editingMember = useMemo(() => state.members.find((member) => member.id === memberId), [memberId, state.members]);
  const [form, setForm] = useState(() => ({
    name: editingMember?.name ?? "",
    phone: editingMember?.phone ?? "",
    notes: editingMember?.notes ?? "",
    active: editingMember?.active ?? true
  }));

  function persistMembers(members: Member[]) {
    const next = { ...state, members };
    saveTournamentState(next);
    setState(next);
    window.location.assign("/admin/members");
  }

  function saveMember() {
    const name = form.name.trim();
    if (!name) return;

    const nextMember: Member = {
      id: editingMember?.id ?? `member-${Date.now()}`,
      name,
      phone: form.phone.trim(),
      notes: form.notes.trim(),
      active: form.active
    };

    const exists = state.members.some((member) => member.id === nextMember.id);
    persistMembers(exists
      ? state.members.map((member) => (member.id === nextMember.id ? nextMember : member))
      : [...state.members, nextMember]
    );
  }

  function hideMember() {
    if (!editingMember) return;
    persistMembers(state.members.map((member) => (member.id === editingMember.id ? { ...member, active: false } : member)));
  }

  return (
    <AppShell title={editingMember ? "회원수정" : "회원등록"} subtitle="회원 정보 입력" active="members">
      <div className="page">
        <section className="section-card form-card">
          <label className="field boxed-field">
            <span>이름</span>
            <input onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} value={form.name} />
          </label>
          <label className="field boxed-field">
            <span>연락처</span>
            <input onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="010-0000-0000" value={form.phone} />
          </label>
          <label className="field boxed-field">
            <span>메모</span>
            <textarea onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={4} value={form.notes} />
          </label>
          <button className={`visibility-button ${form.active ? "active" : ""}`} onClick={() => setForm((current) => ({ ...current, active: !current.active }))} type="button">
            {form.active ? <Eye size={20} /> : <EyeOff size={20} />}
            {form.active ? "대회 선택 명단에 표시" : "대회 선택 명단에서 숨김"}
          </button>
          {editingMember && (
            <button className="danger-button" onClick={hideMember} type="button">
              <Trash2 size={18} />
              회원 삭제
            </button>
          )}
        </section>

        <div className="sticky-footer">
          <button className="ghost-button" onClick={() => window.location.assign("/admin/members")} type="button">
            취소
          </button>
          <button className="primary-button" onClick={saveMember} type="button">
            저장
          </button>
        </div>
      </div>
    </AppShell>
  );
}
