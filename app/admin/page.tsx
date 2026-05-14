"use client";

import Link from "next/link";
import { CalendarDays, ClipboardList, Lock, Share2, Trophy, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { checkAdminPassword, loadTournamentState } from "@/lib/store/tournament-store";

export default function AdminHomePage() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [state] = useState(() => loadTournamentState());

  const completedMatches = useMemo(
    () => state.matches.filter((match) => match.status === "completed").length,
    [state.matches]
  );

  function unlock() {
    if (!checkAdminPassword(password)) {
      setError("비밀번호가 맞지 않습니다.");
      return;
    }
    setUnlocked(true);
    setError("");
  }

  if (!unlocked) {
    return (
      <AppShell title="관리자 입장" subtitle="운영자 비밀번호를 입력하세요" active="home">
        <div className="page">
          <section className="hero-card">
            <span className="badge">관리자 전용</span>
            <h1>대회 운영 화면</h1>
            <p className="lead">회원관리, 대회 생성, 대진표 수정과 결과 입력은 관리자만 사용할 수 있습니다.</p>
          </section>
          <section className="section-card stack">
            <label className="field">
              <span>비밀번호</span>
              <input
                inputMode="numeric"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="관리자 비밀번호"
                type="password"
                value={password}
              />
            </label>
            {error && <p className="lead" style={{ color: "var(--danger)", fontWeight: 900 }}>{error}</p>}
            <button className="primary-button" onClick={unlock} type="button">
              <Lock size={20} />
              입장하기
            </button>
          </section>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="관리자 홈" subtitle="오늘 필요한 작업을 빠르게 시작하세요" active="home">
      <div className="page">
        <section className="hero-card">
          <span className="badge">현재 대회</span>
          <h1>{state.tournament.name}</h1>
          <p className="lead">{state.tournament.date} · {state.groups.length}개 그룹 · {state.members.length}명 등록</p>
          <Link className="today-card" href="/admin/tournaments">
            <div className="today-card-top">
              <span>진행 상태</span>
              <StatusBadge status={state.tournament.status} />
            </div>
            <strong>대회 관리로 이동</strong>
            <div className="today-meta">
              <span>전체 경기 {state.matches.length}</span>
              <span>완료 {completedMatches}</span>
              <span>대기 {state.matches.length - completedMatches}</span>
            </div>
          </Link>
        </section>

        <section className="section-card">
          <strong className="section-head">빠른 메뉴</strong>
          <div className="quick-grid">
            <Link className="quick-card" href="/admin/members">
              <Users size={22} />
              <strong>회원 관리</strong>
            </Link>
            <Link className="quick-card" href="/admin/tournaments">
              <CalendarDays size={22} />
              <strong>대회 관리</strong>
            </Link>
            <Link className="quick-card" href="/admin/tournaments#draw">
              <ClipboardList size={22} />
              <strong>대진표 관리</strong>
            </Link>
            <Link className="quick-card" href="/public/monthly-demo">
              <Share2 size={22} />
              <strong>공유 화면</strong>
            </Link>
          </div>
        </section>

        <section className="section-card">
          <strong className="section-head">운영 요약</strong>
          <div className="summary-grid">
            <div className="summary-card">
              <span className="lead">등록 회원</span>
              <strong>{state.members.length}명</strong>
            </div>
            <div className="summary-card">
              <span className="lead">그룹</span>
              <strong>{state.groups.length}개</strong>
            </div>
            <div className="summary-card">
              <span className="lead">경기</span>
              <strong>{state.matches.length}경기</strong>
            </div>
            <div className="summary-card">
              <span className="lead">완료</span>
              <strong>{completedMatches}경기</strong>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
