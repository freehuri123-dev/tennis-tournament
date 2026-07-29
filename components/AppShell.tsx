import { CalendarDays, Home, Trophy, Users } from "lucide-react";
import { buildClubPath, getClubBySlug, type ClubSlug } from "../lib/domain/club";
import { PendingLink } from "./PendingLink";
import { SplashScreen } from "./SplashScreen";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  active?: "home" | "members" | "tournaments" | "records";
  clubSlug?: ClubSlug;
  brandTitle?: boolean;
};

function HeaderTitle({ title, brandTitle = false }: Pick<AppShellProps, "title" | "brandTitle">) {
  return (
    <strong className={`header-title ${brandTitle ? "tennis-matchup-wordmark" : ""}`}>
      {brandTitle ? <span>{title}</span> : title}
    </strong>
  );
}

function PublicBrand({ clubName }: { clubName: string }) {
  return (
    <div className="public-brand-lockup">
      <span className="tennis-matchup-mini-brand">테니스매치업</span>
      <span aria-hidden="true">·</span>
      <span className="header-brand">{clubName}</span>
    </div>
  );
}

export function AppShell({ title, subtitle = "월례대회 운영 관리", children, active = "home", clubSlug = "stc", brandTitle = false }: AppShellProps) {
  const club = getClubBySlug(clubSlug);
  const navItems = [
    { key: "home", href: buildClubPath(clubSlug), label: "홈", icon: Home },
    { key: "members", href: buildClubPath(clubSlug, "members"), label: "회원", icon: Users },
    { key: "tournaments", href: buildClubPath(clubSlug, "tournaments"), label: "대회", icon: CalendarDays },
    { key: "records", href: buildClubPath(clubSlug, "records"), label: "기록", icon: Trophy }
  ] as const;

  return (
    <div className="app-shell">
      <SplashScreen clubSlug={clubSlug} />
      <div className="mobile-frame">
        <header className="app-header">
          <span className="header-brand">{club?.name ?? "테니스 클럽"}</span>
          <HeaderTitle brandTitle={brandTitle} title={title} />
          <p className="header-subtitle">{subtitle}</p>
        </header>
        <main className="app-main">{children}</main>
        <footer className="app-footer">Copyright &copy; JunHeePark. All Rights Reserved.</footer>
        <nav className="bottom-nav" aria-label="하단 메뉴">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <PendingLink className={`nav-item ${active === item.key ? "active" : ""}`} href={item.href} key={item.key} showPending={false}>
                <Icon size={18} />
                <span>{item.label}</span>
              </PendingLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function PublicShell({ title, subtitle, children, clubSlug = "stc", brandTitle = false }: Omit<AppShellProps, "active">) {
  const club = getClubBySlug(clubSlug);

  return (
    <div className="app-shell public-app-shell">
      <SplashScreen clubSlug={clubSlug} startLabel="대진표 확인하기" />
      <div className="mobile-frame public-mobile-frame">
        <header className="app-header">
          <PublicBrand clubName={club?.name ?? "테니스 클럽"} />
          <HeaderTitle brandTitle={brandTitle} title={title} />
          {subtitle && <p className="header-subtitle">{subtitle}</p>}
        </header>
        <main className="app-main">{children}</main>
        <footer className="app-footer">Copyright &copy; JunHeePark. All Rights Reserved.</footer>
      </div>
    </div>
  );
}
