import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "테니스 월례대회",
  description: "테니스 클럽 월례대회 대진표와 순위표"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
