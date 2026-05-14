import Link from "next/link";
import { CalendarDays, Shield, Trophy, Users } from "lucide-react";
import { PublicShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { sampleTournament, sampleMembers, sampleGroups } from "@/lib/domain/sample-data";

export default function HomePage() {
  return (
    <PublicShell title="테니스 월례대회" subtitle="대진표와 순위표를 휴대폰에서 바로 확인합니다">
      <div className="page">
        <section className="hero-card">
          <span className="badge">모바일 대회 운영</span>
          <h1>STC 월례대회</h1>
          <p className="lead">관리자는 대회를 만들고, 회원은 공유 링크로 대진표와 순위표만 간단히 확인합니다.</p>

          <Link className="today-card" href="/public/monthly-demo">
            <div className="today-card-top">
              <span>현재 대회</span>
              <StatusBadge status={sampleTournament.status} />
            </div>
            <strong>{sampleTournament.name}</strong>
            <div className="today-meta">
              <span>{sampleTournament.date}</span>
              <span>{sampleMembers.length}명</span>
              <span>{sampleGroups.length}개 그룹</span>
            </div>
          </Link>
        </section>

        <section className="section-card">
          <strong className="section-head">빠른 메뉴</strong>
          <div className="quick-grid">
            <Link className="quick-card" href="/admin">
              <Shield size={22} />
              <strong>관리자 입장</strong>
            </Link>
            <Link className="quick-card" href="/admin/members">
              <Users size={22} />
              <strong>회원 관리</strong>
            </Link>
            <Link className="quick-card" href="/admin/tournaments">
              <CalendarDays size={22} />
              <strong>대회 관리</strong>
            </Link>
            <Link className="quick-card" href="/public/monthly-demo">
              <Trophy size={22} />
              <strong>회원 화면</strong>
            </Link>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}
