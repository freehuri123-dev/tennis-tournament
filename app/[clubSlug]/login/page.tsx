import { AppShell } from "@/components/AppShell";
import { InvalidClubPage } from "@/components/InvalidClubPage";
import { getClubBySlug, isKnownClubSlug } from "@/lib/domain/club";
import { loginAdminAction } from "@/lib/server/auth/admin-session";

type ClubLoginPageProps = {
  params: Promise<{ clubSlug: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function ClubLoginPage({ params, searchParams }: ClubLoginPageProps) {
  const [{ clubSlug }, query] = await Promise.all([params, searchParams]);
  if (!isKnownClubSlug(clubSlug)) return <InvalidClubPage />;

  const club = getClubBySlug(clubSlug);
  const hasError = query?.error === "1";

  return (
    <AppShell title="클럽 로그인" subtitle={`${club?.shortName ?? "Club"} 클럽 관리 페이지입니다`} clubSlug={clubSlug}>
      <div className="page">
        <form action={loginAdminAction} className="section-card stack">
          <input name="clubSlug" type="hidden" value={clubSlug} />
          <label className="field">
            <span>비밀번호</span>
            <div className="boxed-field">
              <input autoComplete="current-password" name="password" required type="password" />
            </div>
          </label>
          {hasError && <p className="notice-text">비밀번호를 확인해주세요.</p>}
          <button className="primary-button" type="submit">
            로그인
          </button>
        </form>
      </div>
    </AppShell>
  );
}
