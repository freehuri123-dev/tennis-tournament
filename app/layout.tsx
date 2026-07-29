import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-noto-sans-kr",
  display: "swap"
});

const notoSerifKr = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-noto-serif-kr",
  display: "swap"
});

export const metadata: Metadata = {
  title: "테니스매치업",
  description: "테니스 동호회를 위한 대진표 및 대회 관리 서비스"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={`${notoSansKr.variable} ${notoSerifKr.variable}`} lang="ko">
      <body>{children}</body>
    </html>
  );
}
