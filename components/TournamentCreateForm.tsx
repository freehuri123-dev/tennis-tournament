"use client";

import { CalendarPlus } from "lucide-react";
import { FormPendingOverlay, PendingButton } from "@/components/ActionFormControls";
import type { ClubSlug } from "@/lib/domain/club";

type TournamentCreateFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  clubSlug: ClubSlug;
};

export function TournamentCreateForm({ action, clubSlug }: TournamentCreateFormProps) {
  return (
    <form
      action={action}
      className="sticky-footer tournament-create-footer action-form"
      onSubmit={(event) => {
        const typeSelect = event.currentTarget.elements.namedItem("type") as HTMLSelectElement | null;
        if (typeSelect?.value) return;
        event.preventDefault();
        window.alert("대회 유형을 선택해주세요.");
      }}
    >
      <FormPendingOverlay label="대회 만드는 중..." />
      <input name="clubSlug" type="hidden" value={clubSlug} />
      <label className="tournament-type-create-field">
        <span>대회 유형</span>
        <select className="select-input" defaultValue="" name="type">
          <option disabled value="">대회유형선택</option>
          <option value="general">일반대회(KDK/고정페어)</option>
          <option value="team-battle">청백전(단체전)</option>
          <option value="tournament">토너먼트(단식/복식)</option>
        </select>
      </label>
      <PendingButton className="primary-button" pendingLabel="대회 만드는 중...">
        <CalendarPlus size={20} />새 대회 만들기
      </PendingButton>
    </form>
  );
}