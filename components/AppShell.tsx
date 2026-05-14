import Link from "next/link";
import { CalendarDays, Home, Shield, Users } from "lucide-react";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  active?: "home" | "members" | "tournaments";
};

const navItems = [
  { key: "home", href: "/admin", label: "홈", icon: Home },
  { key: "members", href: "/admin/members", label: "회원", icon: Users },
  { key: "tournaments", href: "/admin/tournaments", label: "대회", icon: CalendarDays }
] as const;

export function AppShell({ title, subtitle = "월례대회 운영 관리", children, active = "home" }: AppShellProps) {
  return (
    <div className="app-shell">
      <div className="mobile-frame">
        <header className="app-header">
          <span className="header-brand">STC 테니스 클럽</span>
          <strong className="header-title">{title}</strong>
          <p className="header-subtitle">{subtitle}</p>
        </header>
        <main className="app-main">{children}</main>
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

export function PublicShell({ title, subtitle, children }: Omit<AppShellProps, "active">) {
  return (
    <div className="app-shell">
      <div className="mobile-frame">
        <header className="app-header">
          <span className="header-brand">STC 테니스 클럽</span>
          <strong className="header-title">{title}</strong>
          {subtitle && <p className="header-subtitle">{subtitle}</p>}
        </header>
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
