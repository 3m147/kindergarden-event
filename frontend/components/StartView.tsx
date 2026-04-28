"use client";

/**
 * StartView
 * ---------
 * 앱의 첫 진입 화면. 교사가 아이디/비밀번호를 입력하면
 * 자신의 담당 반으로 자동 이동한다.
 *
 * 현재는 더미 계정 데이터를 사용한다.
 * 추후 `POST /api/auth/login` 으로 교체.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Eye, EyeOff, LogIn, Sparkles } from "lucide-react";
import { api } from "@/lib/api";

function todayLabel() {
  const d = new Date();
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

// 로그인 성공 후 환영 화면에서 보여줄 교사 정보
type TeacherAccount = {
  id: string;
  name: string;
  role: "정교사" | "부교사";
  classId: number;
  className: string;
  photoUrl?: string;
};

export default function StartView() {
  const router = useRouter();
  const [userId, setUserId] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  // 로그인 성공 시 잠시 환영 메시지를 보여주기 위한 상태
  const [loggedIn, setLoggedIn] = React.useState<TeacherAccount | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!userId.trim() || !password.trim()) {
      setError("아이디와 비밀번호를 모두 입력해 주세요.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.login(userId.trim(), password);
      
      const account: TeacherAccount = {
        id: response.id!.toString(),
        name: response.name!,
        role: response.role as "정교사" | "부교사",
        classId: response.classId!,
        className: response.className!,
        photoUrl: response.photoUrl
      };
      
      // 상태 저장
      setLoggedIn(account);
      
      // 교사 정보 저장 (TeacherCheckView 등에서 사용)
      localStorage.setItem("teacher_info", JSON.stringify(account));
      
      setTimeout(() => {
        router.push(`/check/${account.classId}`);
      }, 1200);
    } catch (err: any) {
      setError(err.message || "아이디 또는 비밀번호가 올바르지 않습니다.");
      setLoading(false);
    }
  };

  // 로그인 성공 환영 화면
  if (loggedIn) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center justify-center bg-pastel-cream px-6">
        <div className="flex animate-fade-in flex-col items-center gap-4">
          {/* 환영 아바타 */}
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-[5px] border-pastel-greenDeep bg-white shadow-soft">
            <img
              src={loggedIn.photoUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(loggedIn.name)}&backgroundColor=ffecb3,cdefc4,cde7fb`}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />
          </div>
          <div className="text-center">
            <p className="text-2xl font-extrabold text-slate-800">
              환영합니다!
            </p>
            <p className="mt-1 text-base font-bold text-pastel-greenDeep">
              {loggedIn.name} {loggedIn.role}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              <span className="font-bold text-pastel-yellowDeep">{loggedIn.className}</span>
              으로 이동 중...
            </p>
          </div>
          {/* 로딩 인디케이터 */}
          <div className="mt-4 flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2.5 w-2.5 animate-bounce rounded-full bg-pastel-greenDeep"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-pastel-cream">
      {/* 상단 타이틀 — 친근한 환영 톤 + 오늘 날짜 */}
      <header className="px-6 pb-4 pt-[max(env(safe-area-inset-top),3rem)] text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pastel-yellow to-pastel-pink shadow-soft">
          <Sparkles className="h-8 w-8 text-pastel-yellowDeep" />
        </div>
        <p className="mt-3 text-xs font-bold tracking-[0.2em] text-pastel-yellowDeep sm:text-sm">
          {todayLabel()} · 2026 상반기
        </p>
        <h1 className="mt-2 text-[1.75rem] font-extrabold leading-tight text-slate-800 sm:text-[2rem]">
          암송잔치
        </h1>
        <p className="mt-2 text-sm text-slate-500 sm:text-base">
          선생님, 오늘도 환영해요 👋
        </p>
      </header>

      {/* 로그인 폼 */}
      <section className="flex flex-1 flex-col px-5 pt-4">
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {/* 아이디 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-id" className="text-sm font-bold text-slate-600">
              아이디
            </label>
            <input
              id="login-id"
              type="text"
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setError(null);
              }}
              placeholder="아이디를 입력하세요"
              className={cn(
                "h-14 rounded-2xl border-2 bg-white px-4 text-base font-semibold text-slate-800 shadow-soft outline-none transition",
                "placeholder:text-slate-400",
                "focus:border-pastel-blueDeep focus:ring-4 focus:ring-pastel-blueDeep/20",
                error ? "border-red-400" : "border-slate-200"
              )}
            />
          </div>

          {/* 비밀번호 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-pw" className="text-sm font-bold text-slate-600">
              비밀번호
            </label>
            <div className="relative">
              <input
                id="login-pw"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="비밀번호를 입력하세요"
                className={cn(
                  "h-14 w-full rounded-2xl border-2 bg-white px-4 pr-14 text-base font-semibold text-slate-800 shadow-soft outline-none transition",
                  "placeholder:text-slate-400",
                  "focus:border-pastel-blueDeep focus:ring-4 focus:ring-pastel-blueDeep/20",
                  error ? "border-red-400" : "border-slate-200"
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <p className="animate-fade-in text-center text-sm font-bold text-red-500" role="alert">
              {error}
            </p>
          )}

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className={cn(
              "mt-2 flex h-16 w-full items-center justify-center gap-2 rounded-2xl text-xl font-extrabold text-white shadow-soft transition active:scale-[0.98]",
              "bg-gradient-to-br from-pastel-greenDeep to-pastel-blueDeep",
              "disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500"
            )}
          >
            {loading ? (
              "로그인 중..."
            ) : (
              <>
                <LogIn className="h-6 w-6" />
                로그인
              </>
            )}
          </button>
        </form>

      </section>

      {/* 관리자 로그인 링크 */}
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="text-xs font-semibold text-slate-400 underline-offset-2 transition hover:text-slate-600 hover:underline"
        >
          🔐 관리자 로그인
        </button>
      </div>

      {/* 하단 여백 */}
      <div className="pb-[max(env(safe-area-inset-bottom),1rem)]" />
    </main>
  );
}
