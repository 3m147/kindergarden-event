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
import { Bell, BookOpen, CalendarDays, ClipboardCheck, Eye, EyeOff, Home, LockKeyhole, LogIn, LogOut, Megaphone, MoreVertical, Settings, ShieldCheck, User, X } from "lucide-react";
import { api, resolveMediaUrl } from "@/lib/api";
import { readAdminNotices, type AdminNotice } from "@/lib/notices";
import { readWeeklyPhotos, type WeeklyPhoto } from "@/lib/weeklyPhotos";
import { getActiveScheduleImage, readScheduleImages, type ScheduleImage } from "@/lib/scheduleImages";
import FoundationView from "@/components/FoundationView";

const MAIN_TEACHER_VIDEO_ID = "DNobgocypGg";
const ASSISTANT_TEACHER_VIDEO_ID = "";
const TEACHER_NOTICE_HIDE_DATE_KEY = "teacher_notice_hide_date";

function todayLabel() {
  const d = new Date();
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

function todayStorageKey() {
  const d = new Date();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
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
  const [teacherNotices, setTeacherNotices] = React.useState<AdminNotice[]>([]);
  const [weeklyPhotos, setWeeklyPhotos] = React.useState<WeeklyPhoto[]>([]);
  const [activeScheduleImage, setActiveScheduleImage] = React.useState<ScheduleImage | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = React.useState(0);
  const [noticePopupOpen, setNoticePopupOpen] = React.useState(false);
  const [noticeInboxOpen, setNoticeInboxOpen] = React.useState(false);
  const [activeBottomTab, setActiveBottomTab] = React.useState<"home" | "schedule" | "foundation" | "info">("home");

  React.useEffect(() => {
    const savedTeacher = localStorage.getItem("teacher_info");
    if (!savedTeacher) return;

    try {
      setLoggedIn(JSON.parse(savedTeacher));
    } catch {
      localStorage.removeItem("teacher_info");
    }
  }, []);

  const loadTeacherNotices = React.useCallback(() => {
    try {
      const parsed = readAdminNotices();
      const popupNotices = parsed.filter((notice) => notice.showToTeachers);
      const hiddenToday = localStorage.getItem(TEACHER_NOTICE_HIDE_DATE_KEY) === todayStorageKey();
      setTeacherNotices(popupNotices);
      setNoticePopupOpen(popupNotices.length > 0 && !hiddenToday);
    } catch {
      setTeacherNotices([]);
      setNoticePopupOpen(false);
    }
  }, []);

  const loadWeeklyPhotos = React.useCallback(() => {
    try {
      const photos = readWeeklyPhotos();
      setWeeklyPhotos(photos);
      setActivePhotoIndex(0);
    } catch {
      setWeeklyPhotos([]);
      setActivePhotoIndex(0);
    }
  }, []);

  const loadScheduleImage = React.useCallback(() => {
    try {
      setActiveScheduleImage(getActiveScheduleImage(readScheduleImages()));
    } catch {
      setActiveScheduleImage(null);
    }
  }, []);

  React.useEffect(() => {
    if (loggedIn) {
      const requestedTab = localStorage.getItem("teacher_start_tab");
      if (requestedTab === "home" || requestedTab === "schedule" || requestedTab === "foundation" || requestedTab === "info") {
        setActiveBottomTab(requestedTab);
        localStorage.removeItem("teacher_start_tab");
      }
      loadTeacherNotices();
      loadWeeklyPhotos();
      loadScheduleImage();
    }
  }, [loadScheduleImage, loadTeacherNotices, loadWeeklyPhotos, loggedIn]);

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
        photoUrl: resolveMediaUrl(response.photoUrl)
      };

      // 상태 저장
      setLoggedIn(account);

      // 교사 정보 저장 (TeacherCheckView 등에서 사용)
      localStorage.setItem("teacher_info", JSON.stringify(account));
      loadTeacherNotices();
      loadWeeklyPhotos();
      loadScheduleImage();
    } catch (err: any) {
      setError(err.message || "아이디 또는 비밀번호가 올바르지 않습니다.");
      setLoading(false);
    }
  };

  const openTeacherMode = (mode: "festival" | "kindergarten") => {
    if (!loggedIn) return;
    router.push(`/check/${loggedIn.classId}?mode=${mode}`);
  };

  const handleTeacherLogout = () => {
    localStorage.removeItem("teacher_info");
    setLoggedIn(null);
    setUserId("");
    setPassword("");
    setLoading(false);
    setError(null);
    setNoticeInboxOpen(false);
    setActiveBottomTab("home");
    router.replace("/");
  };

  const handleHideNoticeToday = () => {
    localStorage.setItem(TEACHER_NOTICE_HIDE_DATE_KEY, todayStorageKey());
    setNoticePopupOpen(false);
  };

  // 로그인 성공 후 선생님이 사용할 화면 선택
  if (loggedIn) {
    const showAssistantVideo = loggedIn.role === "부교사" && ASSISTANT_TEACHER_VIDEO_ID.length > 0;

    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center bg-pastel-cream px-4 pb-[calc(max(env(safe-area-inset-bottom),1.5rem)+5.75rem)] sm:px-5">
        {noticePopupOpen && teacherNotices.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-5 backdrop-blur-sm">
            <section
              className="max-h-[80dvh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-slate-200"
              role="dialog"
              aria-modal="true"
              aria-labelledby="teacher-notice-title"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                    <Megaphone className="h-6 w-6" />
                  </span>
                  <div>
                    <h2 id="teacher-notice-title" className="text-lg font-extrabold text-slate-800">공지사항</h2>
                    <p className="mt-0.5 text-xs font-bold text-slate-500">관리자가 전달한 공지입니다.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNoticePopupOpen(false)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:text-slate-700 active:scale-95"
                  aria-label="공지 팝업 닫기"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="max-h-[56dvh] overflow-y-auto px-5 py-4">
                <div className="flex flex-col gap-3">
                  {teacherNotices.map((notice) => (
                    <article key={notice.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                      <h3 className="break-words text-base font-extrabold text-slate-800">{notice.title}</h3>
                      <p className="mt-1 text-xs font-bold text-slate-400">
                        {new Intl.DateTimeFormat("ko-KR", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(notice.createdAt))}
                      </p>
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm font-bold leading-6 text-slate-600">
                        {notice.content}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 px-5 py-4">
                <button
                  type="button"
                  onClick={handleHideNoticeToday}
                  className="h-12 rounded-xl bg-slate-100 px-2 text-sm font-extrabold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-200 active:scale-[0.98]"
                >
                  오늘 하루 보지 않기
                </button>
                <button
                  type="button"
                  onClick={() => setNoticePopupOpen(false)}
                  className="h-12 rounded-xl bg-slate-900 px-2 text-base font-extrabold text-white shadow-soft transition active:scale-[0.98]"
                >
                  확인
                </button>
              </div>
            </section>
          </div>
        )}
        <div className="flex w-full animate-fade-in flex-col">
          <header className="sticky top-0 z-30 -mx-4 border-b border-slate-200 bg-white/95 px-4 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur sm:-mx-5 sm:px-5" aria-label="선생님 홈 헤더">
            <div className="relative flex min-h-16 items-center justify-between gap-3 rounded-2xl bg-white px-2.5 py-2">
              <div className="flex min-w-0 items-center gap-3">
                <TeacherProfileSummary loggedIn={loggedIn} compact />
              </div>
              <NoticeInboxButton
                notices={teacherNotices}
                open={noticeInboxOpen}
                onToggle={() => setNoticeInboxOpen((open) => !open)}
                onLogout={handleTeacherLogout}
              />
            </div>
          </header>
          {noticeInboxOpen && (
            <NoticeInboxPanel
              notices={teacherNotices}
              onClose={() => setNoticeInboxOpen(false)}
              offset="underCompactHeader"
            />
          )}
          <div className="mt-3 grid w-full gap-3">
            {activeBottomTab === "home" && (
              <>
                <TeacherHomeOverview
                  loggedIn={loggedIn}
                  noticeCount={teacherNotices.length}
                  onKindergarten={() => openTeacherMode("kindergarten")}
                  onSchedule={() => setActiveBottomTab("schedule")}
                  onFoundation={() => setActiveBottomTab("foundation")}
                />
                {weeklyPhotos.length > 0 && (
                  <WeeklyPhotoSlider
                    photos={weeklyPhotos}
                    activeIndex={activePhotoIndex}
                    onActiveIndexChange={setActivePhotoIndex}
                  />
                )}
                <YoutubeCard videoId={MAIN_TEACHER_VIDEO_ID} title="이번 주 공과" />
                {showAssistantVideo && (
                  <YoutubeCard videoId={ASSISTANT_TEACHER_VIDEO_ID} title="손유희 영상" />
                )}
              </>
            )}
            {activeBottomTab === "info" && (
              <section className="w-full rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-200">
                <div className="flex items-center gap-3">
                  <TeacherProfileSummary loggedIn={loggedIn} />
                </div>
                <div className="mt-4 grid gap-2 text-sm font-bold text-slate-600">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                    <span>담당 반</span>
                    <span className="text-pastel-greenDeep">{loggedIn.className}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                    <span>역할</span>
                    <span className="text-slate-900">{loggedIn.role}</span>
                  </div>
                </div>
              </section>
            )}
            {activeBottomTab === "schedule" && (
              <ScheduleView image={activeScheduleImage} />
            )}
            {activeBottomTab === "foundation" && (
              <FoundationView />
            )}
          </div>
        </div>
        <BottomNavigation
          activeTab={activeBottomTab}
          onHome={() => setActiveBottomTab("home")}
          onKindergarten={() => openTeacherMode("kindergarten")}
          onSchedule={() => setActiveBottomTab("schedule")}
          onFoundation={() => setActiveBottomTab("foundation")}
          onInfo={() => setActiveBottomTab("info")}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-pastel-cream">
      <header className="px-5 pb-4 pt-[max(env(safe-area-inset-top),2.5rem)] text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 shadow-soft">
          <ShieldCheck className="h-7 w-7 text-white" />
        </div>
        <p className="mt-3 text-xs font-bold tracking-[0.14em] text-slate-500 sm:text-sm">
          {todayLabel()}
        </p>
        <h1 className="mt-2 text-[1.75rem] font-extrabold leading-tight text-slate-900 sm:text-[2rem]">
          교사 운영 도구
        </h1>
        <p className="mt-2 text-sm font-bold text-slate-500">동탄교회 유치부</p>
      </header>

      {/* 로그인 폼 */}
      <section className="flex flex-1 flex-col px-4 pt-4">
        <form
          onSubmit={handleLogin}
          className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-slate-200"
          aria-describedby={error ? "login-error" : undefined}
        >
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
              aria-invalid={!!error}
              aria-describedby={error ? "login-error" : undefined}
              className={cn(
                "h-14 rounded-xl border bg-white px-4 text-base font-semibold text-slate-800 shadow-sm outline-none transition",
                "placeholder:text-slate-400",
                "focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10",
                error ? "border-red-400" : "border-slate-300"
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
                aria-invalid={!!error}
                aria-describedby={error ? "login-error" : undefined}
                className={cn(
                  "h-14 w-full rounded-xl border bg-white px-4 pr-14 text-base font-semibold text-slate-800 shadow-sm outline-none transition",
                  "placeholder:text-slate-400",
                  "focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10",
                  error ? "border-red-400" : "border-slate-300"
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
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
            <p id="login-error" className="animate-fade-in rounded-2xl bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-600 ring-1 ring-red-100" role="alert">
              {error}
            </p>
          )}

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className={cn(
              "mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-lg font-extrabold text-white shadow-soft transition active:scale-[0.98]",
              "disabled:bg-slate-300 disabled:text-slate-500"
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
      <div className="mt-5 px-4 text-center">
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="mx-auto flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-bold text-slate-500 transition hover:bg-white hover:text-slate-700 active:scale-[0.98]"
        >
          <LockKeyhole className="h-4 w-4" />
          관리자 로그인
        </button>
      </div>

      {/* 하단 여백 */}
      <div className="pb-[max(env(safe-area-inset-bottom),1rem)]" />
    </main>
  );
}

function TeacherHomeOverview({
  loggedIn,
  noticeCount,
  onKindergarten,
  onSchedule,
  onFoundation,
}: {
  loggedIn: TeacherAccount;
  noticeCount: number;
  onKindergarten: () => void;
  onSchedule: () => void;
  onFoundation: () => void;
}) {
  const actions = [
    {
      label: "유치부 체크",
      caption: "출석 · 머릿돌 · 암송",
      icon: ClipboardCheck,
      onClick: onKindergarten,
      tone: "bg-slate-900 text-white",
    },
    {
      label: "계획표",
      caption: "이번 주 일정",
      icon: CalendarDays,
      onClick: onSchedule,
      tone: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
    },
    {
      label: "머릿돌",
      caption: "PDF 자료",
      icon: BookOpen,
      onClick: onFoundation,
      tone: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
    },
  ];

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="bg-slate-900 px-4 py-3.5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-white/60">{todayLabel()}</p>
            <h2 className="mt-1 truncate text-xl font-extrabold">
              {loggedIn.name} 선생님
            </h2>
            <p className="mt-1 text-sm font-bold text-white/70">
              {loggedIn.className} · {loggedIn.role}
            </p>
          </div>
          <span className="flex h-10 min-w-10 items-center justify-center rounded-xl bg-white/10 px-2.5 text-xs font-extrabold ring-1 ring-white/10">
            공지 {noticeCount}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 p-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className={cn(
                "flex min-h-20 flex-col justify-between rounded-xl p-2.5 text-left shadow-sm transition active:scale-[0.98]",
                action.tone
              )}
            >
              <Icon className="h-5 w-5" />
              <span>
                <span className="block break-keep text-[13px] font-extrabold leading-4">{action.label}</span>
                <span className="mt-0.5 block break-keep text-[10px] font-bold leading-3 opacity-70">{action.caption}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TeacherProfileSummary({
  loggedIn,
  contrast = false,
  compact = false,
}: {
  loggedIn: TeacherAccount;
  contrast?: boolean;
  compact?: boolean;
}) {
  return (
    <>
      <div className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden border-2 border-white/90 bg-white shadow-sm",
        compact ? "h-10 w-10 rounded-xl" : "h-14 w-14 rounded-2xl"
      )}>
        <img
          src={resolveMediaUrl(loggedIn.photoUrl) || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(loggedIn.name)}&backgroundColor=ffecb3,cdefc4,cde7fb`}
          alt={`${loggedIn.name} 프로필 사진`}
          className="h-full w-full object-cover"
          draggable={false}
        />
      </div>
      <div className="min-w-0 text-left">
        <p className={cn(compact ? "text-[13px]" : "text-base", "truncate font-extrabold", contrast ? "text-white drop-shadow" : "text-slate-800")}>
          {loggedIn.name} {loggedIn.role}
        </p>
        <p className={cn("mt-0.5 truncate font-bold", compact ? "text-[11px]" : "text-sm", contrast ? "text-white/85 drop-shadow" : "text-slate-500")}>
          {loggedIn.className}
        </p>
      </div>
    </>
  );
}

function WeeklyPhotoSlider({
  photos,
  activeIndex,
  onActiveIndexChange,
}: {
  photos: WeeklyPhoto[];
  activeIndex: number;
  onActiveIndexChange: React.Dispatch<React.SetStateAction<number>>;
}) {
  const activePhoto = photos[activeIndex] ?? photos[0];
  const showControls = photos.length > 1;

  React.useEffect(() => {
    if (photos.length === 0) return;
    if (activeIndex < photos.length) return;
    onActiveIndexChange(0);
  }, [activeIndex, onActiveIndexChange, photos.length]);

  React.useEffect(() => {
    if (photos.length <= 1) return;

    const timer = window.setInterval(() => {
      onActiveIndexChange((currentIndex) => (currentIndex + 1) % photos.length);
    }, 3000);

    return () => window.clearInterval(timer);
  }, [onActiveIndexChange, photos.length]);

  if (!activePhoto) return null;

  return (
    <section className="relative min-h-48 w-full overflow-hidden rounded-2xl bg-slate-900 shadow-soft ring-1 ring-slate-200" aria-label="이번 주 유치부 사진">
      <div className="absolute inset-0">
        <div
          className="flex h-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {photos.map((photo) => (
            <div key={photo.id} className="h-full w-full shrink-0">
              <img
                src={photo.imageUrl}
                alt={photo.title}
                className="h-full w-full object-cover"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/55 via-slate-900/10 to-slate-950/45" />
      <div className="relative flex min-h-48 flex-col justify-end px-4 pb-3 pt-4">
        <div>
          <p className="text-xs font-extrabold text-white/75">이번 주 유치부 사진</p>
          <p className="mt-1 line-clamp-2 text-lg font-extrabold leading-tight text-white drop-shadow">
            {activePhoto.title}
          </p>
        </div>
        {showControls && (
          <div className="mt-3 flex items-center justify-center gap-1 rounded-full bg-slate-950/20 py-1 backdrop-blur-sm" aria-label="사진 슬라이드 선택">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => onActiveIndexChange(index)}
                className="flex h-9 w-9 items-center justify-center rounded-xl transition active:scale-95"
                aria-pressed={index === activeIndex}
                aria-label={`${index + 1}번째 사진 보기`}
              >
                <span
                  className={cn(
                    "h-2.5 rounded-full transition",
                    index === activeIndex ? "w-6 bg-white" : "w-2.5 bg-white/45"
                  )}
                />
              </button>
            ))}
          </div>
        )}
        <p className="sr-only" aria-live="polite">
          {photos.length}장 중 {activeIndex + 1}번째 사진, {activePhoto.title}
        </p>
      </div>
    </section>
  );
}

function NoticeInboxButton({
  notices,
  open,
  onToggle,
  onLogout,
  contrast = false,
}: {
  notices: AdminNotice[];
  open: boolean;
  onToggle: () => void;
  onLogout: () => void;
  contrast?: boolean;
}) {
  const hasNotices = notices.length > 0;

  return (
    <div className="relative flex shrink-0 items-center gap-1.5">
      <div className="relative">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "relative flex h-10 w-10 items-center justify-center rounded-xl shadow-sm transition active:scale-95",
            contrast
              ? "bg-white/25 text-white ring-1 ring-white/25 hover:bg-white/35"
              : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-800"
          )}
          aria-label={hasNotices ? `공지 알림 ${notices.length}개 보기` : "공지 알림 보기"}
          aria-expanded={open}
        >
          <Bell className="h-5 w-5" />
          {hasNotices && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold leading-none text-white ring-2 ring-white">
              {notices.length > 9 ? "9+" : notices.length}
            </span>
          )}
        </button>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl shadow-sm transition active:scale-95",
          contrast
            ? "bg-white/25 text-white ring-1 ring-white/25 hover:bg-white/35"
            : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-800"
        )}
        aria-label="로그아웃"
      >
        <LogOut className="h-5 w-5" />
      </button>
    </div>
  );
}

function NoticeInboxPanel({
  notices,
  onClose,
  offset,
}: {
  notices: AdminNotice[];
  onClose: () => void;
  offset: "underHero" | "underCompactHeader";
}) {
  const hasNotices = notices.length > 0;

  return (
    <section
      className={cn(
        "fixed left-1/2 z-[80] w-[min(24rem,calc(100vw-1rem))] -translate-x-1/2 overflow-hidden rounded-2xl bg-slate-900 text-white shadow-2xl ring-1 ring-white/10",
        offset === "underHero"
          ? "top-[calc(max(env(safe-area-inset-top),1rem)+7rem)]"
          : "top-[calc(max(env(safe-area-inset-top),1rem)+4.5rem)]"
      )}
      role="dialog"
      aria-label="공지 알림창"
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <h2 className="text-xl font-extrabold text-white">알림</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-white/85 transition hover:bg-white/10 active:scale-95"
            aria-label="공지 설정"
          >
            <Settings className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-white/85 transition hover:bg-white/10 active:scale-95"
            aria-label="공지 알림창 닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="min-h-[58dvh] max-h-[72dvh] space-y-1 overflow-y-auto px-2 py-4">
        {!hasNotices && (
          <div className="mx-3 rounded-2xl bg-white/5 px-4 py-12 text-center">
            <Bell className="mx-auto h-8 w-8 text-white/35" />
            <p className="mt-3 text-sm font-extrabold text-white/60">등록된 공지가 없습니다.</p>
          </div>
        )}
        {notices.map((notice) => (
          <article key={notice.id} className="grid grid-cols-[3.25rem_1fr_auto] gap-3 rounded-2xl px-3 py-4 transition hover:bg-white/5">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white shadow-sm ring-1 ring-white/10">
              <Megaphone className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <h3 className="line-clamp-2 break-words text-base font-extrabold leading-7 text-white">{notice.title}</h3>
              <p className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-sm font-bold leading-6 text-white/75">
                {notice.content}
              </p>
              <p className="mt-3 text-sm font-extrabold text-white/45">
                {new Intl.DateTimeFormat("ko-KR", {
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(notice.createdAt))}
              </p>
            </div>
            <button
              type="button"
              className="flex h-11 w-8 items-center justify-center rounded-xl text-white/70 transition hover:bg-white/10 active:scale-95"
              aria-label="공지 더보기"
            >
              <MoreVertical className="h-6 w-6" />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function ScheduleView({ image }: { image: ScheduleImage | null }) {
  return (
    <section className="w-full rounded-2xl bg-white p-4 shadow-soft ring-1 ring-slate-200">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          <CalendarDays className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-slate-800">계획표</h2>
          <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
            손가락으로 확대하거나 좌우로 움직여 자세히 볼 수 있습니다.
          </p>
        </div>
      </div>

      {!image && (
        <div className="mt-4 rounded-2xl bg-slate-50 px-5 py-12 text-center ring-1 ring-slate-200">
          <CalendarDays className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-3 text-sm font-extrabold text-slate-500">등록된 계획표가 없습니다.</p>
        </div>
      )}

      {image && (
        <div className="mt-4">
          <div className="mb-3">
            <h3 className="break-words text-sm font-extrabold text-slate-700">{image.title}</h3>
            <p className="mt-1 text-xs font-bold text-slate-400">
              {new Intl.DateTimeFormat("ko-KR", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }).format(new Date(image.createdAt))}
            </p>
          </div>
          <div className="max-h-[68dvh] overflow-auto rounded-2xl bg-slate-100 ring-1 ring-slate-200">
            <img
              src={image.imageUrl}
              alt={image.title}
              className="min-h-[55dvh] w-full min-w-[22rem] object-contain"
              draggable={false}
            />
          </div>
        </div>
      )}
    </section>
  );
}

function BottomNavigation({
  activeTab,
  onHome,
  onKindergarten,
  onSchedule,
  onFoundation,
  onInfo,
}: {
  activeTab: "home" | "schedule" | "foundation" | "info";
  onHome: () => void;
  onKindergarten: () => void;
  onSchedule: () => void;
  onFoundation: () => void;
  onInfo: () => void;
}) {
  const items = [
    { key: "home", label: "홈", icon: Home, onClick: onHome, active: activeTab === "home" },
    { key: "kindergarten", label: "유치부체크", icon: ClipboardCheck, onClick: onKindergarten, active: false },
    { key: "schedule", label: "계획표", icon: CalendarDays, onClick: onSchedule, active: activeTab === "schedule" },
    { key: "foundation", label: "머릿돌", icon: BookOpen, onClick: onFoundation, active: activeTab === "foundation" },
    { key: "info", label: "내 정보", icon: User, onClick: onInfo, active: activeTab === "info" },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md border-t border-slate-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur"
      aria-label="하단 메뉴"
    >
      <div className="grid grid-cols-5 gap-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-0.5 text-[10px] font-extrabold leading-none transition active:scale-95",
                item.active
                  ? "bg-slate-900 text-white"
                  : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="max-w-full truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function YoutubeCard({ videoId, title }: { videoId: string; title: string }) {
  return (
    <section className="w-full overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-slate-200">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-extrabold text-slate-700">{title}</h2>
      </div>
      <div className="aspect-video w-full bg-slate-100">
        <iframe
          className="h-full w-full"
          src={`https://www.youtube.com/embed/${videoId}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </section>
  );
}
