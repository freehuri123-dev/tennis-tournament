import type { Tournament } from "@/lib/domain/types";

const labels: Record<Tournament["status"], string> = {
  draft: "준비",
  active: "진행",
  completed: "완료"
};

export function StatusBadge({ status }: { status: Tournament["status"] }) {
  return <span className={`status-pill ${status}`}>{labels[status]}</span>;
}
