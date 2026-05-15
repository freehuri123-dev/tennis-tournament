import { PublicShell } from "./AppShell";

export function InvalidClubPage() {
  return (
    <PublicShell title="잘못된 접근입니다" subtitle="클럽 주소를 다시 확인해주세요">
      <div className="page">
        <section className="status-message-card">
          <strong>잘못된 접근입니다</strong>
          <p>등록된 클럽 주소로만 접속할 수 있습니다.</p>
        </section>
      </div>
    </PublicShell>
  );
}
