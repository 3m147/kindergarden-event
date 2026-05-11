"use client";

/**
 * AdminLoginView
 * --------------
 * 관리자 전용 로그인 화면.
 * 관리자만 접근 가능한 대시보드로 이동하기 위한 인증 화면.
 *
 * 관리자 계정: admin / admin1234
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Eye, EyeOff, Shield, ArrowLeft, LogOut } from "lucide-react";
import { api } from "@/lib/api";

export default function AdminLoginView() {
  const router = useRouter();
  const [userId, setUserId] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [loggedIn, setLoggedIn] = React.useState(false);
  const [alreadyAuthenticated, setAlreadyAuthenticated] = React.useState(false);

  React.useEffect(() => {
    setAlreadyAuthenticated(localStorage.getItem("admin_authenticated") === "true");
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("admin_authenticated");
    setAlreadyAuthenticated(false);
    setLoggedIn(false);
    setUserId("");
    setPassword("");
    setError(null);
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!userId.trim() || !password.trim()) {
      setError("아이디와 비밀번호를 모두 입력해 주세요.");
      return;
    }

    setLoading(true);

    try {
      await api.adminLogin(userId.trim(), password);
      
      setLoggedIn(true);
      // localStorage에 관리자 인증 상태 저장
      localStorage.setItem("admin_authenticated", "true");
      setTimeout(() => {
        router.push("/admin/dashboard");
      }, 1200);
    } catch (err: any) {
      setError(err.message || "관리자 아이디 또는 비밀번호가 올바르지 않습니다.");
      setLoading(false);
    }
  };

  // 로그인 성공 화면
  if (loggedIn) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center justify-center bg-slate-900 px-6">
        <div className="flex animate-fade-in flex-col items-center gap-4">
          <div className="flex h-28 w-28 items-center justify-center rounded-full border-[5px] border-amber-400 bg-slate-800 shadow-soft">
            <Shield className="h-14 w-14 text-amber-400" />
          </div>
          <div className="text-center">
            <p className="text-2xl font-extrabold text-white">
              관리자 인증 완료
            </p>
            <p className="mt-2 text-sm text-slate-400">
              대시보드로 이동 중...
            </p>
          </div>
          <div className="mt-4 flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2.5 w-2.5 animate-bounce rounded-full bg-amber-400"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (alreadyAuthenticated) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center justify-center bg-slate-900 px-6">
        <div className="flex w-full animate-fade-in flex-col items-center gap-5">
          <div className="flex h-28 w-28 items-center justify-center rounded-full border-[5px] border-amber-400 bg-slate-800 shadow-soft">
            <Shield className="h-14 w-14 text-amber-400" />
          </div>
          <div className="text-center">
            <p className="text-2xl font-extrabold text-white">관리자 로그인됨</p>
            <p className="mt-2 text-sm text-slate-400">
              대시보드로 이동하거나 로그아웃할 수 있습니다.
            </p>
          </div>
          <div className="grid w-full gap-3">
            <button
              type="button"
              onClick={() => router.push("/admin/dashboard")}
              className="h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-base font-extrabold text-slate-900 shadow-soft transition active:scale-[0.98]"
            >
              대시보드로 이동
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-800 text-sm font-extrabold text-slate-400 shadow-sm ring-1 ring-slate-700 transition hover:text-white active:scale-[0.98]"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-slate-900">
      {/* 상단 타이틀 */}
      <header className="px-6 pb-4 pt-[max(env(safe-area-inset-top),3rem)] text-center">
        {/* 뒤로 가기 */}
        <button
          type="button"
          onClick={() => router.push("/")}
          className="absolute left-5 top-[max(env(safe-area-inset-top),2rem)] flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-400 shadow ring-1 ring-slate-700 transition active:scale-95 hover:text-white"
          aria-label="교사 로그인으로 이동"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-soft">
          <Shield className="h-10 w-10 text-white" />
        </div>
        <p className="mt-4 text-xs font-bold tracking-[0.2em] text-amber-400 sm:text-sm">
          ADMIN
        </p>
        <h1 className="mt-2 text-[1.75rem] font-extrabold leading-tight text-white sm:text-[2rem]">
          관리자 로그인
        </h1>
        <p className="mt-2 text-sm text-slate-400 sm:text-base">
          모든 반의 점수 현황을 확인합니다
        </p>
      </header>

      {/* 로그인 폼 */}
      <section className="flex flex-1 flex-col px-5 pt-6">
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {/* 아이디 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="admin-id" className="text-sm font-bold text-slate-400">
              관리자 아이디
            </label>
            <input
              id="admin-id"
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
                "h-14 rounded-2xl border-2 bg-slate-800 px-4 text-base font-semibold text-white shadow-soft outline-none transition",
                "placeholder:text-slate-500",
                "focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20",
                error ? "border-red-400" : "border-slate-700"
              )}
            />
          </div>

          {/* 비밀번호 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="admin-pw" className="text-sm font-bold text-slate-400">
              비밀번호
            </label>
            <div className="relative">
              <input
                id="admin-pw"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="비밀번호를 입력하세요"
                className={cn(
                  "h-14 w-full rounded-2xl border-2 bg-slate-800 px-4 pr-14 text-base font-semibold text-white shadow-soft outline-none transition",
                  "placeholder:text-slate-500",
                  "focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20",
                  error ? "border-red-400" : "border-slate-700"
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
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
            <p className="animate-fade-in text-center text-sm font-bold text-red-400" role="alert">
              {error}
            </p>
          )}

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className={cn(
              "mt-2 flex h-16 w-full items-center justify-center gap-2 rounded-2xl text-xl font-extrabold text-slate-900 shadow-soft transition active:scale-[0.98]",
              "bg-gradient-to-br from-amber-400 to-orange-500",
              "disabled:from-slate-600 disabled:to-slate-600 disabled:text-slate-400"
            )}
          >
            {loading ? (
              "인증 중..."
            ) : (
              <>
                <Shield className="h-6 w-6" />
                관리자 로그인
              </>
            )}
          </button>
        </form>
      </section>

      {/* 하단 여백 */}
      <div className="pb-[max(env(safe-area-inset-bottom),1rem)]" />
    </main>
  );
}
