"use client";

/**
 * StartView
 * ---------
 * 앱의 첫 진입 화면. 교사가 자기 반을 선택한 뒤 암송 체크 화면으로 진입한다.
 *
 * 레이아웃
 *  - 상단: 2026년 상반기 암송잔치 타이틀
 *  - 중앙: 반 선택 카드 (만 3-1 / 4-1 / 4-2 / 5-1 / 5-2)
 *  - 하단 고정: "시작하기" CTA. 반 미선택 상태에서는 비활성.
 *
 * 반 ID는 임시로 프론트에서 고정한다 — 추후 `GET /api/classes` 응답에 맞춰
 * className → classId 매핑을 바꿔 끼우면 된다.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

type ClassOption = {
  classId: number;
  className: string;
  // 선택 시 강조용 그라디언트. 연령대별로 톤을 다르게 주어 교사가 직관적으로 찾게 한다.
  accent: string;
};

const CLASS_OPTIONS: ClassOption[] = [
  { classId: 1, className: "만 3-1반", accent: "from-pastel-yellowDeep to-pastel-yellow" },
  { classId: 2, className: "만 4-1반", accent: "from-pastel-greenDeep to-pastel-green" },
  { classId: 3, className: "만 4-2반", accent: "from-pastel-greenDeep to-pastel-blue" },
  { classId: 4, className: "만 5-1반", accent: "from-pastel-blueDeep to-pastel-blue" },
  { classId: 5, className: "만 5-2반", accent: "from-pastel-blueDeep to-pastel-pink" },
];

export default function StartView() {
  const router = useRouter();
  const [selectedId, setSelectedId] = React.useState<number | null>(null);

  const handleStart = () => {
    if (selectedId === null) return;
    // 선택한 반 정보는 URL 로 넘긴다 — 새로고침 대응 + 공유 가능한 딥링크.
    router.push(`/check/${selectedId}`);
  };

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-pastel-cream">
      {/* 상단 타이틀 — 노치/상태바 높이만큼 pt 확보 */}
      <header className="px-6 pb-6 pt-[max(env(safe-area-inset-top),2.5rem)] text-center">
        <p className="text-xs font-bold tracking-[0.2em] text-pastel-yellowDeep sm:text-sm">
          2026 · 상반기
        </p>
        <h1 className="mt-2 text-[1.75rem] font-extrabold leading-tight text-slate-800 sm:text-[2rem]">
          암송잔치
        </h1>
        <p className="mt-3 text-sm text-slate-500 sm:text-base">
          우리 반을 선택해 주세요
        </p>
      </header>

      {/* 반 선택 */}
      <section
        role="radiogroup"
        aria-label="반 선택"
        className="grid grid-cols-2 gap-3 px-5"
      >
        {CLASS_OPTIONS.map((c, idx) => {
          const active = selectedId === c.classId;
          // 만 3-1반은 단독이라 시각적으로도 한 줄 전체를 차지해 그룹핑을 드러낸다.
          const fullWidth = idx === 0;
          return (
            <button
              key={c.classId}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSelectedId(c.classId)}
              className={cn(
                // 작은 폰에서 h-28(112px)은 세로로 빡빡하므로 24(96px)로 낮추고 sm 이상에서 회복
                "flex h-24 items-center justify-center rounded-3xl text-xl font-extrabold shadow-soft transition active:scale-[0.97] sm:h-28 sm:text-2xl",
                "focus:outline-none focus-visible:ring-4 focus-visible:ring-pastel-yellowDeep/40",
                fullWidth && "col-span-2",
                active
                  ? cn(
                      "bg-gradient-to-br text-white ring-4 ring-pastel-greenDeep/30",
                      c.accent
                    )
                  : "bg-white text-slate-700"
              )}
            >
              {c.className}
            </button>
          );
        })}
      </section>

      {/* 하단 CTA — 홈 인디케이터(safe-area-bottom) 피하고 엄지 닿는 범위에 배치 */}
      <nav
        className="mt-auto px-5 pb-[max(env(safe-area-inset-bottom),1rem)] pt-8"
        aria-label="시작 영역"
      >
        <button
          type="button"
          onClick={handleStart}
          disabled={selectedId === null}
          className={cn(
            "flex h-16 w-full items-center justify-center rounded-2xl text-xl font-extrabold text-white shadow-soft transition active:scale-[0.98]",
            "bg-gradient-to-br from-pastel-greenDeep to-pastel-blueDeep",
            "disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500"
          )}
        >
          시작하기
        </button>
      </nav>
    </main>
  );
}
