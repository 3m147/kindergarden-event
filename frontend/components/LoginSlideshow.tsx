"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * 로그인 배경 사진 슬라이드쇼.
 * 사진을 2초마다 크로스페이드(밝기 전환)로 순환한다. 로드에 실패한 경로(없는 파일)는
 * 자동으로 순환에서 제외되므로, 준비된 사진 수가 목록보다 적어도 문제없다.
 */
export default function LoginSlideshow({
  slides,
  intervalMs = 2000,
}: {
  slides: string[];
  intervalMs?: number;
}) {
  const [failed, setFailed] = React.useState<Record<string, boolean>>({});
  const usable = React.useMemo(() => slides.filter((src) => !failed[src]), [slides, failed]);
  const [index, setIndex] = React.useState(0);

  // 사용 가능한 사진 수가 바뀌면 인덱스 범위를 보정한다.
  React.useEffect(() => {
    setIndex((current) => (current >= usable.length ? 0 : current));
  }, [usable.length]);

  React.useEffect(() => {
    if (usable.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % usable.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [usable.length, intervalMs]);

  const currentSrc = usable[index];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {slides.map((src) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          draggable={false}
          onError={() => setFailed((prev) => (prev[src] ? prev : { ...prev, [src]: true }))}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out",
            src === currentSrc ? "opacity-100" : "opacity-0",
          )}
        />
      ))}
      {/* 사진 위 가독성 스크림 (사진이 하나라도 있을 때만) */}
      {usable.length > 0 && (
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/55 via-slate-950/35 to-slate-950/70" />
      )}
    </div>
  );
}
