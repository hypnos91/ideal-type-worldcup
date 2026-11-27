import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "이상형 월드컵",
  description: "둘 중 하나만 고르세요. 마지막까지 남는 하나가 당신의 이상형입니다.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff7f3" },
    { media: "(prefers-color-scheme: dark)", color: "#14101a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
