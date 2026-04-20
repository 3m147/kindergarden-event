import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "유치부 암송 체크",
  description: "유치부 교사용 실시간 성경 암송 체크",
  // iOS 홈 화면 추가 시 주소창 UI 감춤 — PWA 준비
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "암송 체크",
  },
};

// 모바일 가독성 + safe-area + 상단 브라우저 크롬 색을 배경과 동일하게 맞춰 이음매 없는 느낌
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // 접근성을 위해 확대 자체는 허용 (userScalable 기본값 true 유지).
  viewportFit: "cover",
  themeColor: "#FFFBEF", // pastel.cream
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard Variable — 한글 가독성이 좋고 가벼워 모바일에 적합 */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="font-sans text-slate-800 antialiased">{children}</body>
    </html>
  );
}
