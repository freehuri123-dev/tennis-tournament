import { loginAdminAction } from "@/lib/server/auth/admin-session";

type LoginPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const hasError = params?.error === "1";

  return (
    <div className="app-shell">
      <div className="mobile-frame">
        <header className="app-header">
          <span className="header-brand">STC Tennis</span>
          <strong className="header-title">관리자 로그인</strong>
        </header>
        <main className="app-main">
          <form action={loginAdminAction} className="section-card stack">
            <label className="field">
              <span>비밀번호</span>
              <div className="boxed-field">
                <input autoComplete="current-password" name="password" required type="password" />
              </div>
            </label>
            {hasError && <p className="notice-text">비밀번호를 확인해 주세요.</p>}
            <button className="primary-button" type="submit">
              로그인
            </button>
          </form>
        </main>
        <footer className="app-footer">Copyright &copy; JunHeePark. All Rights Reserved.</footer>
      </div>
    </div>
  );
}
