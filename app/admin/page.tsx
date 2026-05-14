import { AppShell } from "@/components/AppShell";
import { HomeDashboard } from "@/components/HomeDashboard";

export default function AdminHomePage() {
  return (
    <AppShell title="메인페이지" subtitle="회원관리와 대회관리를 선택하세요" active="home">
      <HomeDashboard />
    </AppShell>
  );
}
