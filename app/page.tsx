import Link from "next/link";
import { CalendarDays, Users } from "lucide-react";
import { PublicShell } from "@/components/AppShell";

export default function HomePage() {
  return (
    <PublicShell title="STC 월례대회" subtitle="테니스 클럽 대회 운영">
      <div className="page">
        <section className="section-card">
          <strong className="section-head">관리 메뉴</strong>
          <div className="quick-grid">
            <Link className="quick-card" href="/admin/members">
              <Users size={24} />
              <strong>회원관리</strong>
            </Link>
            <Link className="quick-card" href="/admin/tournaments">
              <CalendarDays size={24} />
              <strong>대회관리</strong>
            </Link>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
