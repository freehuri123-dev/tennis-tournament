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
  title: "Tennis Tournament Management System",
  description: "Tennis tournament draw and ranking management system"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={`${notoSansKr.variable} ${notoSerifKr.variable}`} lang="ko">
      <body>{children}</body>
    </html>
  );
}
