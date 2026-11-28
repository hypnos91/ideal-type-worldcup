import type { Metadata, Viewport } from "next";
// 기본 글꼴: Pretendard Variable (2026-11-28 사용자 지시). dynamic subset 이라 화면에 쓰인 글자 범위의 조각만 받는다.
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "이상형 월드컵",
  description: "둘 중 하나만 고르세요. 마지막까지 남는 하나가 당신의 이상형입니다.",
};

export const viewport: Viewport = {
  themeColor: "#0f0c14",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="dark h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
