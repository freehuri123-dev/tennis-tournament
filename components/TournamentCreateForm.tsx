"use client";

import { CalendarPlus } from "lucide-react";
import { FormPendingOverlay, PendingButton } from "@/components/ActionFormControls";
import type { ClubSlug } from "@/lib/domain/club";

type TournamentCreateFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  clubSlug: ClubSlug;
};

const tournamentTypeOptions = [
  {
    value: "general",
    title: "\uC77C\uBC18\uB300\uD68C",
    subtitle: "\uC790\uB3D9 \uB79C\uB364 \uBCF5\uC2DD",
    detail: "\uCC38\uAC00\uC790\uC640 \uCD5C\uC18C \uACBD\uAE30 \uC218\uB85C \uB300\uC9C4\uD45C\uB97C \uB9CC\uB4ED\uB2C8\uB2E4."
  },
  {
    value: "fixed-pair-league",
    title: "\uACE0\uC815\uD398\uC5B4\uB9AC\uADF8",
    subtitle: "8\uBA85, 10\uBA85, 12\uBA85 \uD480\uB9AC\uADF8",
    detail: "\uD398\uC5B4\uB97C \uC815\uD574 \uD480\uB9AC\uADF8\uB85C \uC9C4\uD589\uD569\uB2C8\uB2E4."
  },
  {
    value: "monthly",
    title: "\uC6D4\uB840\uB300\uD68C",
    subtitle: "KDK \uBC29\uC2DD",
    detail: "KDK \uBC29\uC2DD\uC73C\uB85C \uAC1C\uC778\uB2F9 4\uACBD\uAE30 \uAE30\uC900\uC73C\uB85C \uC9C4\uD589\uD569\uB2C8\uB2E4."
  },
  {
    value: "team-battle",
    title: "\uCCAD\uBC31\uC804",
    subtitle: "\uB2E8\uCCB4\uC804",
    detail: "\uD68C\uC6D0 \uB4F1\uAE09\uC744 \uAE30\uC900\uC73C\uB85C \uCCAD\uD300/\uBC31\uD300 \uB300\uC9C4\uC744 \uAD6C\uC131\uD569\uB2C8\uB2E4."
  },
  {
    value: "tournament",
    title: "\uD1A0\uB108\uBA3C\uD2B8",
    subtitle: "\uB2E8\uC2DD \uB610\uB294 \uBCF5\uC2DD",
    detail: "\uC2B9\uC790\uAC00 \uB2E4\uC74C \uB77C\uC6B4\uB4DC\uB85C \uC9C4\uCD9C\uD558\uB294 \uBC29\uC2DD\uC785\uB2C8\uB2E4."
  }
] as const;

export function TournamentCreateForm({ action, clubSlug }: TournamentCreateFormProps) {
  return (
    <form action={action} className="sticky-footer tournament-create-footer action-form">
      <FormPendingOverlay label="\uB300\uD68C \uB9CC\uB4DC\uB294 \uC911..." />
      <input name="clubSlug" type="hidden" value={clubSlug} />
      <div className="tournament-type-create-field">
        <span>{"\uB300\uD68C \uC720\uD615 \uC120\uD0DD"}</span>
        <div className="tournament-type-card-grid" role="radiogroup" aria-label="\uB300\uD68C \uC720\uD615 \uC120\uD0DD">
          {tournamentTypeOptions.map((option) => (
            <label className="tournament-type-card" key={option.value}>
              <input name="type" required type="radio" value={option.value} />
              <span className="tournament-type-card-main">
                <strong>{option.title}</strong>
                <small>{option.subtitle}</small>
              </span>
              <em>{option.detail}</em>
            </label>
          ))}
        </div>
      </div>
      <PendingButton className="primary-button" pendingLabel="\uB300\uD68C \uB9CC\uB4DC\uB294 \uC911...">
        <CalendarPlus size={20} />{"\uC0C8 \uB300\uD68C \uB9CC\uB4E4\uAE30"}
      </PendingButton>
    </form>
  );
}