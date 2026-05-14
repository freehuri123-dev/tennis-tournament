import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-5">
      <h1 className="text-3xl font-bold text-ink">테니스 월례대회</h1>
      <p className="text-lg text-slate-700">대진표와 순위표를 휴대폰에서 바로 확인합니다.</p>
      <Link className="rounded-lg bg-court px-5 py-4 text-center text-xl font-bold text-white" href="/admin">
        관리자 입장
      </Link>
      <Link className="rounded-lg border border-line px-5 py-4 text-center text-xl font-bold text-ink" href="/public/monthly-demo">
        회원 화면 보기
      </Link>
    </main>
  );
}
