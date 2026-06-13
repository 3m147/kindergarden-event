"use client";

import * as React from "react";
import { Download, FileText, Maximize2, Minimize2, Smartphone } from "lucide-react";
import { api } from "@/lib/api";
import { getActiveFoundationMaterial, type FoundationMaterial } from "@/lib/foundationMaterials";

type FoundationViewProps = {
  pdfUrl?: string;
};

export default function FoundationView({ pdfUrl = "/foundation.pdf" }: FoundationViewProps) {
  const [activeMaterial, setActiveMaterial] = React.useState<FoundationMaterial | null>(null);
  const [fullscreenOpen, setFullscreenOpen] = React.useState(false);
  const fullscreenRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    api.listFoundationMaterials()
      .then((materials) => setActiveMaterial(getActiveFoundationMaterial(materials)))
      .catch(() => setActiveMaterial(null));
  }, []);

  React.useEffect(() => {
    if (!fullscreenOpen) return;

    const enterFullscreen = async () => {
      try {
        await fullscreenRef.current?.requestFullscreen?.();
      } catch {
        // 일부 모바일 브라우저는 사용자 제스처 안에서만 전체화면을 허용한다.
      }

      try {
        const orientation = screen.orientation as ScreenOrientation & {
          lock?: (orientation: "landscape") => Promise<void>;
        };
        await orientation.lock?.("landscape");
      } catch {
        // iOS Safari 등에서는 화면 방향 잠금이 지원되지 않을 수 있다.
      }
    };

    enterFullscreen();

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setFullscreenOpen(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [fullscreenOpen]);

  const closeFullscreen = async () => {
    setFullscreenOpen(false);

    try {
      const orientation = screen.orientation as ScreenOrientation & {
        unlock?: () => void;
      };
      orientation.unlock?.();
    } catch {
      // Orientation unlock is not available in every browser.
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      // Closing the overlay still works even if the browser rejects exitFullscreen.
    }
  };

  const currentPdfUrl = activeMaterial?.pdfUrl ?? pdfUrl;
  const currentTitle = activeMaterial?.title ?? "머릿돌";
  const fullscreenPdfUrl = `${currentPdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=Fit`;

  return (
    <section className="w-full rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
          <FileText className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="break-words text-base font-extrabold text-slate-800 dark:text-slate-100">{currentTitle}</h2>
          <p className="mt-1 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
            모바일에서 PDF가 작게 보이면 전체화면으로 돌려 한 페이지씩 확인할 수 있습니다.
          </p>
          {activeMaterial && (
            <p className="mt-1 truncate text-xs font-extrabold text-pastel-greenDeep dark:text-emerald-300">
              {activeMaterial.fileName}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setFullscreenOpen(true)}
              className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-slate-900 text-sm font-extrabold text-white shadow-sm transition active:scale-95 dark:bg-white dark:text-slate-950"
        >
          <Maximize2 className="h-4 w-4" />
          전체화면
        </button>
        <a
          href={currentPdfUrl}
          download
          className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-sm font-extrabold text-slate-600 ring-1 ring-slate-200 transition active:scale-95 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700"
        >
          <Download className="h-4 w-4" />
          다운로드
        </a>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-700">
        <object
          data={`${currentPdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
          type="application/pdf"
          className="h-[62dvh] w-full"
          aria-label="머릿돌 PDF 미리보기"
        >
          <div className="flex min-h-80 flex-col items-center justify-center px-5 py-10 text-center">
            <Smartphone className="h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="mt-3 text-sm font-extrabold text-slate-500 dark:text-slate-400">
              이 브라우저에서는 PDF 미리보기를 지원하지 않습니다.
            </p>
            <a
              href={currentPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-extrabold text-white dark:bg-white dark:text-slate-950"
            >
          PDF 열기
            </a>
          </div>
        </object>
      </div>

      {fullscreenOpen && (
        <div
          ref={fullscreenRef}
          className="fixed inset-0 z-[100] flex h-[100dvh] w-[100dvw] flex-col bg-slate-950 text-white"
          role="dialog"
          aria-modal="true"
          aria-label="머릿돌 전체화면 보기"
        >
          <div className="absolute inset-x-0 top-0 z-10 flex min-h-14 items-center justify-between gap-2 bg-slate-950/85 px-3 py-2 pt-[max(env(safe-area-inset-top),0.5rem)] backdrop-blur">
            <button
              type="button"
              onClick={closeFullscreen}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white transition active:scale-95"
              aria-label="전체화면 닫기"
            >
              <Minimize2 className="h-5 w-5" />
            </button>
            <div className="min-w-0 text-center">
              <p className="truncate text-sm font-extrabold">{currentTitle}</p>
              <p className="text-xs font-bold text-white/55">화면을 가로로 돌려 크게 확인하세요</p>
            </div>
            <a
              href={currentPdfUrl}
              download
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white transition active:scale-95"
              aria-label="PDF 다운로드"
            >
              <Download className="h-5 w-5" />
            </a>
          </div>

          <div className="relative h-full w-full overflow-hidden bg-slate-900 pt-[calc(max(env(safe-area-inset-top),0.5rem)+3.5rem)]">
            <object
              data={fullscreenPdfUrl}
              type="application/pdf"
              className="h-full w-full"
              aria-label={`${currentTitle} 전체화면`}
            >
              <iframe
                src={fullscreenPdfUrl}
                className="h-full w-full"
                title={`${currentTitle} 전체화면`}
              />
            </object>
          </div>
        </div>
      )}
    </section>
  );
}
