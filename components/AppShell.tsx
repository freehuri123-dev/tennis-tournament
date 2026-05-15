import Link from "next/link";
import { CalendarDays, Home, Users } from "lucide-react";
import { buildClubPath, getClubBySlug, type ClubSlug } from "../lib/domain/club";
import { SplashScreen } from "./SplashScreen";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  active?: "home" | "members" | "tournaments";
  clubSlug?: ClubSlug;
};

export function AppShell({ title, subtitle = "월례대회 운영 관리", children, active = "home", clubSlug = "stc" }: AppShellProps) {
  const club = getClubBySlug(clubSlug);
  const navItems = [
    { key: "home", href: buildClubPath(clubSlug), label: "홈", icon: Home },
    { key: "members", href: buildClubPath(clubSlug, "members"), label: "회원", icon: Users },
    { key: "tournaments", href: buildClubPath(clubSlug, "tournaments"), label: "대회", icon: CalendarDays }
  ] as const;

  return (
    <div className="app-shell">
      <SplashScreen clubSlug={clubSlug} />
      <div className="mobile-frame">
        <header className="app-header">
          <span className="header-brand">{club?.name ?? "테니스 클럽"}</span>
          <strong className="header-title">{title}</strong>
          <p className="header-subtitle">{subtitle}</p>
        </header>
        <main className="app-main">{children}</main>
        <footer className="app-footer">Copyright &copy; JunHeePark. All Rights Reserved.</footer>
        <nav className="bottom-nav" aria-label="하단 메뉴">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link className={`nav-item ${active === item.key ? "active" : ""}`} href={item.href} key={item.key}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function PublicShell({ title, subtitle, children, clubSlug = "stc" }: Omit<AppShellProps, "active">) {
  const club = getClubBySlug(clubSlug);

  return (
    <div className="app-shell">
      <SplashScreen clubSlug={clubSlug} />
      <div className="mobile-frame">
        <header className="app-header">
          <span className="header-brand">{club?.name ?? "테니스 클럽"}</span>
          <strong className="header-title">{title}</strong>
          {subtitle && <p className="header-subtitle">{subtitle}</p>}
        </header>
        <main className="app-main">{children}</main>
        <footer className="app-footer">Copyright &copy; JunHeePark. All Rights Reserved.</footer>
      </div>
    </div>
  );
}
