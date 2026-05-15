import { PublicShell } from "./AppShell";

export function InvalidClubPage() {
  return (
    <PublicShell title="잘못된 접근입니다" subtitle="클럽 주소를 다시 확인해주세요">
      <div className="page">
        <section className="status-message-card">
          <strong>잘못된 접근입니다</strong>
          <p>STC 클럽은 /stc, OTC 클럽은 /otc 주소로 접속해주세요.</p>
        </section>
      </div>
    </PublicShell>
  );
}
