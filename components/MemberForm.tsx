import Link from "next/link";
import { Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { buildClubPath, type ClubSlug } from "@/lib/domain/club";
import type { Member } from "@/lib/domain/types";
import { deleteMemberAction, saveMemberAction } from "@/lib/server/actions/member-actions";

type MemberFormProps = {
  member?: Member;
  clubSlug?: ClubSlug;
};

export function MemberForm({ member, clubSlug = "stc" }: MemberFormProps) {
  const isEditing = Boolean(member);

  return (
    <AppShell title={isEditing ? "회원수정" : "회원등록"} subtitle="회원 정보 입력" active="members" clubSlug={clubSlug}>
      <div className="page">
        <form action={saveMemberAction}>
          <input name="clubSlug" type="hidden" value={clubSlug} />
          {member ? <input name="id" type="hidden" value={member.id} /> : null}
          <input name="active" type="hidden" value={String(member?.active ?? true)} />

          <section className="section-card form-card">
            <label className="field boxed-field">
              <span>이름</span>
              <input defaultValue={member?.name ?? ""} name="name" required />
            </label>
            <label className="field boxed-field">
              <span>성별</span>
              <select defaultValue={member?.gender ?? "male"} name="gender">
                <option value="male">남성</option>
                <option value="female">여성</option>
              </select>
            </label>
            <label className="field boxed-field">
              <span>연락처</span>
              <input defaultValue={member?.phone ?? ""} name="phone" placeholder="010-0000-0000" />
            </label>
            <label className="field boxed-field">
              <span>메모</span>
              <textarea defaultValue={member?.notes ?? ""} name="notes" rows={4} />
            </label>
          </section>

          <div className="sticky-footer">
            <Link className="ghost-button" href={buildClubPath(clubSlug, "members")}>
              취소
            </Link>
            <button className="primary-button" type="submit">
              저장
            </button>
          </div>
        </form>

        {member ? (
          <section className="danger-zone">
            <div>
              <strong>회원 삭제</strong>
              <p>회원 목록과 참가자 선택에서 보이지 않게 합니다.</p>
            </div>
            <form action={deleteMemberAction}>
              <input name="clubSlug" type="hidden" value={clubSlug} />
              <input name="id" type="hidden" value={member.id} />
              <button className="danger-button compact-danger" type="submit">
                <Trash2 size={18} />
                삭제
              </button>
            </form>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
