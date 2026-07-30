import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import Script from "next/script";
import { RouteSplashScreen } from "@/components/RouteSplashScreen";
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
      <body>
        <RouteSplashScreen />
        {children}
        <Script
          crossOrigin="anonymous"
          integrity="sha384-OL+ylM/iuPLtW5U3XcvLSGhE8JzReKDank5InqlHGWPhb4140/yrBw0bg0y7+C9J"
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
