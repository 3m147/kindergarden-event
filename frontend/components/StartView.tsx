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
import { Bell, BookOpen, CalendarDays, Camera, Check, ClipboardCheck, Copy, Eye, EyeOff, Home, LockKeyhole, LogIn, LogOut, Megaphone, Moon, MoreVertical, PlayCircle, RotateCcw, Save, Settings, ShieldCheck, Sun, User, X } from "lucide-react";
import { api, clearAuthToken, resolveMediaUrl, saveAuthToken, type StudentRecitationDto } from "@/lib/api";
import { readAdminNotices, type AdminNotice } from "@/lib/notices";
import { readWeeklyPhotos, type WeeklyPhoto } from "@/lib/weeklyPhotos";
import { getActiveScheduleImage, readScheduleImages, type ScheduleImage } from "@/lib/scheduleImages";
import { getActiveLessonVideo, readLessonVideos, type LessonVideo } from "@/lib/lessonVideos";
import FoundationView from "@/components/FoundationView";

const ASSISTANT_TEACHER_VIDEO_ID = "";
const TEACHER_NOTICE_HIDE_DATE_KEY = "teacher_notice_hide_date";
const TEACHER_NOTICE_READ_IDS_KEY = "teacher_notice_read_ids";
const TEACHER_NOTICE_MUTED_KEY = "teacher_notice_muted";
const TEACHER_DARK_MODE_KEY = "teacher_dark_mode";

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

function readStoredStringArray(key: string) {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    localStorage.removeItem(key);
    return [];
  }
}

function writeStoredStringArray(key: string, values: string[]) {
  localStorage.setItem(key, JSON.stringify(Array.from(new Set(values))));
}

function useViewportExpanded<T extends HTMLElement>({
  rootMargin,
  minRatio = 0.4,
  defaultExpanded = false,
}: {
  rootMargin: string;
  minRatio?: number;
  defaultExpanded?: boolean;
}) {
  const elementRef = React.useRef<T | null>(null);
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setExpanded(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setExpanded(entry.isIntersecting && entry.intersectionRatio >= minRatio);
      },
      {
        threshold: [0, 0.25, minRatio, 0.65, 0.9],
        rootMargin,
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [defaultExpanded, minRatio, rootMargin]);

  return [elementRef, expanded] as const;
}

function useViewportCenterBand<T extends HTMLElement>({
  enterTop = 0.26,
  enterBottom = 0.72,
  exitTop = 0.16,
  exitBottom = 0.84,
}: {
  enterTop?: number;
  enterBottom?: number;
  exitTop?: number;
  exitBottom?: number;
} = {}) {
  const elementRef = React.useRef<T | null>(null);
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setExpanded(true);
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const center = rect.top + rect.height / 2;

      setExpanded((current) => {
        const top = viewportHeight * (current ? exitTop : enterTop);
        const bottom = viewportHeight * (current ? exitBottom : enterBottom);
        return center >= top && center <= bottom;
      });
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [enterBottom, enterTop, exitBottom, exitTop]);

  return [elementRef, expanded] as const;
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
  const [newStudentName, setNewStudentName] = React.useState("");
  const [newStudentBirthDate, setNewStudentBirthDate] = React.useState("");
  const [newStudentParentName, setNewStudentParentName] = React.useState("");
  const [addingStudent, setAddingStudent] = React.useState(false);
  const [studentAddMessage, setStudentAddMessage] = React.useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [teacherNameDraft, setTeacherNameDraft] = React.useState("");
  const [savingTeacher, setSavingTeacher] = React.useState(false);
  const [infoStudents, setInfoStudents] = React.useState<StudentRecitationDto[]>([]);
  const [infoStudentsLoading, setInfoStudentsLoading] = React.useState(false);
  const [editingInfo, setEditingInfo] = React.useState(false);
  const [teacherDarkMode, setTeacherDarkMode] = React.useState(false);
  // 로그인 성공 시 잠시 환영 메시지를 보여주기 위한 상태
  const [loggedIn, setLoggedIn] = React.useState<TeacherAccount | null>(null);
  const [teacherNotices, setTeacherNotices] = React.useState<AdminNotice[]>([]);
  const [weeklyPhotos, setWeeklyPhotos] = React.useState<WeeklyPhoto[]>([]);
  const [activeScheduleImage, setActiveScheduleImage] = React.useState<ScheduleImage | null>(null);
  const [lessonVideos, setLessonVideos] = React.useState<LessonVideo[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = React.useState(0);
  const [noticePopupOpen, setNoticePopupOpen] = React.useState(false);
  const [noticeInboxOpen, setNoticeInboxOpen] = React.useState(false);
  const [noticeSettingsOpen, setNoticeSettingsOpen] = React.useState(false);
  const [selectedNotice, setSelectedNotice] = React.useState<AdminNotice | null>(null);
  const [noticeMenuId, setNoticeMenuId] = React.useState<string | null>(null);
  const [readNoticeIds, setReadNoticeIds] = React.useState<string[]>([]);
  const [noticeMuted, setNoticeMuted] = React.useState(false);
  const [noticeFeedback, setNoticeFeedback] = React.useState<string | null>(null);
  const [activeBottomTab, setActiveBottomTab] = React.useState<"home" | "schedule" | "foundation" | "lessons" | "info">("home");
  const isHomeTab = activeBottomTab === "home";
  const unreadNoticeCount = teacherNotices.filter((notice) => !readNoticeIds.includes(notice.id)).length;
  const activeLessonVideo = getActiveLessonVideo(lessonVideos);

  React.useEffect(() => {
    const savedTeacher = localStorage.getItem("teacher_info");
    setTeacherDarkMode(localStorage.getItem(TEACHER_DARK_MODE_KEY) === "true");
    if (!savedTeacher) return;

    try {
      const teacher = JSON.parse(savedTeacher) as TeacherAccount;
      setLoggedIn(teacher);
      setTeacherNameDraft(teacher.name);
    } catch {
      localStorage.removeItem("teacher_info");
    }
  }, []);

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", teacherDarkMode);
    document.documentElement.style.colorScheme = teacherDarkMode ? "dark" : "light";
  }, [teacherDarkMode]);

  const loadTeacherNotices = React.useCallback(() => {
    try {
      const parsed = readAdminNotices();
      const popupNotices = parsed.filter((notice) => notice.showToTeachers);
      const hiddenToday = localStorage.getItem(TEACHER_NOTICE_HIDE_DATE_KEY) === todayStorageKey();
      const muted = localStorage.getItem(TEACHER_NOTICE_MUTED_KEY) === "true";
      setTeacherNotices(popupNotices);
      setReadNoticeIds(readStoredStringArray(TEACHER_NOTICE_READ_IDS_KEY));
      setNoticeMuted(muted);
      setNoticePopupOpen(popupNotices.length > 0 && !hiddenToday && !muted);
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

  const loadLessonVideos = React.useCallback(() => {
    try {
      setLessonVideos(readLessonVideos());
    } catch {
      setLessonVideos([]);
    }
  }, []);

  React.useEffect(() => {
    if (loggedIn) {
      const requestedTab = localStorage.getItem("teacher_start_tab");
      if (requestedTab === "home" || requestedTab === "schedule" || requestedTab === "foundation" || requestedTab === "lessons" || requestedTab === "info") {
        setActiveBottomTab(requestedTab);
        localStorage.removeItem("teacher_start_tab");
      }
      loadTeacherNotices();
      loadWeeklyPhotos();
      loadScheduleImage();
      loadLessonVideos();
    }
  }, [loadLessonVideos, loadScheduleImage, loadTeacherNotices, loadWeeklyPhotos, loggedIn]);

  const loadInfoStudents = React.useCallback(async () => {
    if (!loggedIn) return;
    setInfoStudentsLoading(true);
    try {
      setInfoStudents(await api.getClassRecitations(loggedIn.classId));
    } catch {
      setInfoStudents([]);
    } finally {
      setInfoStudentsLoading(false);
    }
  }, [loggedIn]);

  React.useEffect(() => {
    if (activeBottomTab === "info" && loggedIn) {
      loadInfoStudents();
    }
  }, [activeBottomTab, loadInfoStudents, loggedIn]);

  React.useEffect(() => {
    if (activeBottomTab !== "info") {
      setEditingInfo(false);
    }
  }, [activeBottomTab]);

  React.useEffect(() => {
    if (isHomeTab) return;
    setNoticePopupOpen(false);
    setNoticeInboxOpen(false);
    setNoticeSettingsOpen(false);
    setNoticeMenuId(null);
  }, [isHomeTab]);

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
      saveAuthToken(response.token);

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
      setTeacherNameDraft(account.name);

      // 교사 정보 저장 (TeacherCheckView 등에서 사용)
      localStorage.setItem("teacher_info", JSON.stringify(account));
      loadTeacherNotices();
      loadWeeklyPhotos();
      loadScheduleImage();
      loadLessonVideos();
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
    clearAuthToken();
    setLoggedIn(null);
    setUserId("");
    setPassword("");
    setLoading(false);
    setError(null);
    setNoticeInboxOpen(false);
    setActiveBottomTab("home");
    router.replace("/");
  };

  const handleToggleTeacherDarkMode = () => {
    setTeacherDarkMode((current) => {
      const next = !current;
      localStorage.setItem(TEACHER_DARK_MODE_KEY, String(next));
      return next;
    });
  };

  const handleAddStudent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!loggedIn || addingStudent) return;

    const name = newStudentName.trim();
    if (!name) {
      setStudentAddMessage({ kind: "error", text: "아이 이름을 입력해 주세요." });
      return;
    }

    setAddingStudent(true);
    setStudentAddMessage(null);
    try {
      await api.createStudent(loggedIn.classId, {
        name,
        birthDate: newStudentBirthDate || undefined,
        parentName: newStudentParentName.trim() || undefined,
      });
      setNewStudentName("");
      setNewStudentBirthDate("");
      setNewStudentParentName("");
      setStudentAddMessage({ kind: "success", text: `${name} 아이를 ${loggedIn.className}에 추가했습니다.` });
      await loadInfoStudents();
    } catch (err: any) {
      setStudentAddMessage({ kind: "error", text: err.message || "아이 추가 중 오류가 발생했습니다." });
    } finally {
      setAddingStudent(false);
    }
  };

  const handleUpdateTeacherName = async () => {
    if (!loggedIn || savingTeacher) return;
    const name = teacherNameDraft.trim();
    if (!name) return;
    setSavingTeacher(true);
    try {
      await api.updateTeacher(Number(loggedIn.id), name);
      const next = { ...loggedIn, name };
      setLoggedIn(next);
      localStorage.setItem("teacher_info", JSON.stringify(next));
    } finally {
      setSavingTeacher(false);
    }
  };

  const handleTeacherPhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!loggedIn) return;
    const file = event.target.files?.[0];
    if (!file) return;
    const result = await api.uploadProfile(file, "teacher", Number(loggedIn.id));
    const next = { ...loggedIn, photoUrl: resolveMediaUrl(result.url) };
    setLoggedIn(next);
    localStorage.setItem("teacher_info", JSON.stringify(next));
    event.target.value = "";
  };

  const handleHideNoticeToday = () => {
    localStorage.setItem(TEACHER_NOTICE_HIDE_DATE_KEY, todayStorageKey());
    setNoticePopupOpen(false);
    setNoticeInboxOpen(false);
    setNoticeSettingsOpen(false);
    setNoticeMenuId(null);
    setNoticeFeedback("오늘 하루 공지 팝업을 숨겼습니다.");
  };

  const markNoticeRead = React.useCallback((noticeId: string) => {
    setReadNoticeIds((current) => {
      const next = Array.from(new Set([...current, noticeId]));
      writeStoredStringArray(TEACHER_NOTICE_READ_IDS_KEY, next);
      return next;
    });
  }, []);

  const markNoticeUnread = (noticeId: string) => {
    setReadNoticeIds((current) => {
      const next = current.filter((id) => id !== noticeId);
      writeStoredStringArray(TEACHER_NOTICE_READ_IDS_KEY, next);
      return next;
    });
    setNoticeFeedback("읽지 않음으로 표시했습니다.");
  };

  const handleOpenNotice = (notice: AdminNotice) => {
    markNoticeRead(notice.id);
    setSelectedNotice(notice);
    setNoticePopupOpen(false);
    setNoticeMenuId(null);
  };

  const handleMarkAllNoticesRead = () => {
    const next = teacherNotices.map((notice) => notice.id);
    writeStoredStringArray(TEACHER_NOTICE_READ_IDS_KEY, next);
    setReadNoticeIds(next);
    setNoticeFeedback("모든 공지를 읽음 처리했습니다.");
  };

  const handleResetNoticeReads = () => {
    localStorage.removeItem(TEACHER_NOTICE_READ_IDS_KEY);
    setReadNoticeIds([]);
    setNoticeFeedback("읽음 기록을 초기화했습니다.");
  };

  const handleToggleNoticeMuted = () => {
    const nextMuted = !noticeMuted;
    localStorage.setItem(TEACHER_NOTICE_MUTED_KEY, String(nextMuted));
    setNoticeMuted(nextMuted);
    if (nextMuted) {
      setNoticePopupOpen(false);
      setNoticeFeedback("홈 공지 팝업을 껐습니다.");
    } else {
      localStorage.removeItem(TEACHER_NOTICE_HIDE_DATE_KEY);
      setNoticeFeedback("홈 공지 팝업을 켰습니다.");
    }
  };

  const handleCopyNotice = async (notice: AdminNotice) => {
    const text = `${notice.title}\n\n${notice.content}`;
    try {
      await navigator.clipboard.writeText(text);
      setNoticeFeedback("공지 내용을 복사했습니다.");
    } catch {
      setNoticeFeedback("복사를 지원하지 않는 환경입니다.");
    } finally {
      setNoticeMenuId(null);
    }
  };

  // 로그인 성공 후 선생님이 사용할 화면 선택
  if (loggedIn) {
    const showAssistantVideo = loggedIn.role === "부교사" && ASSISTANT_TEACHER_VIDEO_ID.length > 0;

    return (
      <main className={cn("mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center bg-slate-100 px-4 pb-[calc(max(env(safe-area-inset-bottom),1.5rem)+5.75rem)] text-slate-900 transition-colors sm:px-5 dark:bg-[#0b1120] dark:text-slate-100", teacherDarkMode && "dark")}>
        {isHomeTab && noticePopupOpen && teacherNotices.length > 0 && (
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
                    <button
                      key={notice.id}
                      type="button"
                      onClick={() => handleOpenNotice(notice)}
                      className="rounded-2xl bg-slate-50 p-4 text-left ring-1 ring-slate-200 transition active:scale-[0.99]"
                    >
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
                    </button>
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
          <header className="sticky top-0 z-30 -mx-4 border-b border-slate-200/80 bg-white/90 px-4 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur-xl sm:-mx-5 sm:px-5 dark:border-slate-800 dark:bg-[#0b1120]/90" aria-label="선생님 홈 헤더">
            <div className="relative flex min-h-16 items-center justify-between gap-3 rounded-2xl bg-white/80 px-2.5 py-2 ring-1 ring-slate-200/70 dark:bg-slate-900/70 dark:ring-slate-800">
              <div className="flex min-w-0 items-center gap-3">
                <TeacherProfileSummary loggedIn={loggedIn} compact />
              </div>
              <NoticeInboxButton
                notices={isHomeTab ? teacherNotices : []}
                badgeCount={isHomeTab ? unreadNoticeCount : 0}
                open={isHomeTab && noticeInboxOpen}
                darkMode={teacherDarkMode}
                onToggle={() => {
                  if (!isHomeTab) return;
                  setNoticeInboxOpen((open) => !open);
                }}
                onToggleDarkMode={handleToggleTeacherDarkMode}
                onLogout={handleTeacherLogout}
              />
            </div>
          </header>
          {isHomeTab && noticeInboxOpen && (
            <NoticeInboxPanel
              notices={teacherNotices}
              readNoticeIds={readNoticeIds}
              menuNoticeId={noticeMenuId}
              feedback={noticeFeedback}
              onClose={() => setNoticeInboxOpen(false)}
              onOpenNotice={handleOpenNotice}
              onToggleMenu={(noticeId) => setNoticeMenuId((current) => (current === noticeId ? null : noticeId))}
              onMarkRead={(noticeId) => {
                markNoticeRead(noticeId);
                setNoticeMenuId(null);
                setNoticeFeedback("읽음으로 표시했습니다.");
              }}
              onMarkUnread={markNoticeUnread}
              onCopyNotice={handleCopyNotice}
              onHideToday={handleHideNoticeToday}
              onOpenSettings={() => {
                setNoticeSettingsOpen(true);
                setNoticeMenuId(null);
              }}
              offset="underCompactHeader"
            />
          )}
          {isHomeTab && noticeSettingsOpen && (
            <NoticeSettingsModal
              noticeCount={teacherNotices.length}
              unreadCount={unreadNoticeCount}
              muted={noticeMuted}
              onClose={() => setNoticeSettingsOpen(false)}
              onToggleMuted={handleToggleNoticeMuted}
              onHideToday={handleHideNoticeToday}
              onMarkAllRead={handleMarkAllNoticesRead}
              onResetReads={handleResetNoticeReads}
            />
          )}
          {selectedNotice && (
            <NoticeDetailModal
              notice={selectedNotice}
              onClose={() => setSelectedNotice(null)}
            />
          )}
          <div className="mt-3 grid w-full gap-3">
            {activeBottomTab === "home" && (
              <>
                <TeacherHomeOverview
                  noticeCount={teacherNotices.length}
                  lessonCount={lessonVideos.length}
                  activeLessonTitle={activeLessonVideo?.title}
                  onKindergarten={() => openTeacherMode("kindergarten")}
                  onSchedule={() => setActiveBottomTab("schedule")}
                  onFoundation={() => setActiveBottomTab("foundation")}
                  onLessons={() => setActiveBottomTab("lessons")}
                />
                {weeklyPhotos.length > 0 && (
                  <WeeklyPhotoSlider
                    photos={weeklyPhotos}
                    activeIndex={activePhotoIndex}
                    onActiveIndexChange={setActivePhotoIndex}
                  />
                )}
                {activeLessonVideo && (
                  <WeeklyLessonVideoCard
                    video={activeLessonVideo}
                    onOpenLibrary={() => setActiveBottomTab("lessons")}
                  />
                )}
                {showAssistantVideo && (
                  <YoutubeCard videoId={ASSISTANT_TEACHER_VIDEO_ID} title="손유희 영상" />
                )}
              </>
            )}
            {activeBottomTab === "info" && (editingInfo ? (
              <div className="grid w-full gap-3">
                <section className="flex items-center justify-between gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">회원정보 수정</h2>
                    <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">내 정보와 담당 아이 정보를 수정합니다.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTeacherNameDraft(loggedIn.name);
                      setEditingInfo(false);
                    }}
                    className="flex h-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 px-3 text-sm font-extrabold text-slate-600 ring-1 ring-slate-200 active:scale-95 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700"
                  >
                    수정 취소
                  </button>
                </section>
                <section className="w-full rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <TeacherProfileSummary loggedIn={loggedIn} />
                    <label className="flex h-11 cursor-pointer items-center gap-1.5 rounded-xl bg-slate-100 px-3 text-xs font-extrabold text-slate-600 ring-1 ring-slate-200 active:scale-95 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                      <Camera className="h-4 w-4" />
                      사진 변경
                      <input type="file" accept="image/*" className="hidden" onChange={handleTeacherPhotoChange} />
                    </label>
                  </div>
                  <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                    <input
                      value={teacherNameDraft}
                      onChange={(event) => setTeacherNameDraft(event.target.value)}
                      placeholder="내 이름"
                      aria-label="내 이름"
                      className="h-12 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-800 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={handleUpdateTeacherName}
                      disabled={savingTeacher || teacherNameDraft.trim() === loggedIn.name}
                      className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 text-sm font-extrabold text-white disabled:opacity-40 dark:bg-white dark:text-slate-950"
                    >
                      <Save className="h-4 w-4" />
                      저장
                    </button>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 dark:bg-slate-800/70 dark:ring-slate-700">
                      <span>담당 반</span>
                      <span className="text-pastel-greenDeep">{loggedIn.className}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 dark:bg-slate-800/70 dark:ring-slate-700">
                      <span>역할</span>
                      <span className="text-slate-900 dark:text-white">{loggedIn.role}</span>
                    </div>
                  </div>
                </section>

                <section className="w-full rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                      <User className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">아이 정보 추가</h2>
                      <p className="mt-1 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
                        추가한 아이는 유치부 체크 화면의 {loggedIn.className} 목록에 바로 연결됩니다.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleAddStudent} className="mt-4 grid gap-2">
                    <input
                      value={newStudentName}
                      onChange={(event) => setNewStudentName(event.target.value)}
                      placeholder="아이 이름"
                      aria-label="추가할 아이 이름"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
                    />
                    <input
                      type="date"
                      value={newStudentBirthDate}
                      onChange={(event) => setNewStudentBirthDate(event.target.value)}
                      aria-label="아이 생년월일"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-800 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <input
                      value={newStudentParentName}
                      onChange={(event) => setNewStudentParentName(event.target.value)}
                      placeholder="부모님 성함"
                      aria-label="부모님 성함"
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <button
                      type="submit"
                      disabled={addingStudent}
                      className="flex h-12 items-center justify-center rounded-xl bg-slate-900 text-base font-extrabold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-slate-950"
                    >
                      {addingStudent ? "추가 중..." : "아이 추가"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openTeacherMode("kindergarten")}
                      className="flex h-12 items-center justify-center rounded-xl bg-blue-50 text-sm font-extrabold text-blue-700 ring-1 ring-blue-100 transition active:scale-[0.98]"
                    >
                      유치부 체크에서 확인
                    </button>
                  </form>

                  {studentAddMessage && (
                    <p
                      className={cn(
                        "mt-3 rounded-xl px-4 py-3 text-sm font-extrabold",
                        studentAddMessage.kind === "success"
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                          : "bg-red-50 text-red-700 ring-1 ring-red-100"
                      )}
                    >
                      {studentAddMessage.text}
                    </p>
                  )}
                </section>

                <section className="w-full rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">아이 정보 관리</h2>
                      <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">{loggedIn.className} 아이들의 정보를 수정합니다.</p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/15 dark:text-blue-200 dark:ring-blue-500/25">
                      {infoStudents.length}명
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {infoStudentsLoading && <p className="py-6 text-center text-sm font-bold text-slate-400">불러오는 중...</p>}
                    {!infoStudentsLoading && infoStudents.length === 0 && <p className="py-6 text-center text-sm font-bold text-slate-400">등록된 아이가 없습니다.</p>}
                    {infoStudents.map((student) => (
                      <StudentInfoEditor
                        key={student.studentId}
                        student={student}
                        onSaved={loadInfoStudents}
                      />
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <InfoOverview
                loggedIn={loggedIn}
                students={infoStudents}
                loading={infoStudentsLoading}
                onEdit={() => setEditingInfo(true)}
              />
            ))}
            {activeBottomTab === "schedule" && (
              <ScheduleView image={activeScheduleImage} />
            )}
            {activeBottomTab === "foundation" && (
              <FoundationView />
            )}
            {activeBottomTab === "lessons" && (
              <LessonVideoLibrary videos={lessonVideos} activeVideo={activeLessonVideo} />
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
  noticeCount,
  lessonCount,
  activeLessonTitle,
  onKindergarten,
  onSchedule,
  onFoundation,
  onLessons,
}: {
  noticeCount: number;
  lessonCount: number;
  activeLessonTitle?: string;
  onKindergarten: () => void;
  onSchedule: () => void;
  onFoundation: () => void;
  onLessons: () => void;
}) {
  const [overviewTriggerRef, overviewExpanded] = useViewportExpanded<HTMLDivElement>({
    rootMargin: "0px 0px -58% 0px",
    minRatio: 0.01,
    defaultExpanded: true,
  });
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
    {
      label: "공과 자료실",
      caption: activeLessonTitle ?? `${lessonCount}개 영상`,
      icon: PlayCircle,
      onClick: onLessons,
      tone: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
    },
  ];

  return (
    <section
      className={cn(
        "relative rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80 transition-[padding,box-shadow,transform] duration-700 ease-out motion-reduce:transition-none dark:bg-slate-900 dark:ring-slate-800",
        overviewExpanded ? "p-5 shadow-[0_18px_40px_rgba(15,23,42,0.14)]" : "p-4"
      )}
    >
      <div ref={overviewTriggerRef} className="pointer-events-none absolute left-0 top-0 h-[24dvh] w-full" aria-hidden="true" />
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-extrabold text-slate-400 dark:text-slate-500">{todayLabel()}</p>
          <h2 className={cn("mt-1 font-extrabold text-slate-900 transition-[font-size,line-height] duration-700 motion-reduce:transition-none dark:text-white", overviewExpanded ? "text-2xl leading-8" : "text-lg leading-7")}>오늘의 업무</h2>
        </div>
        <span className="flex h-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 px-3 text-xs font-extrabold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
          공지 {noticeCount}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className={cn(
                "flex flex-col justify-between rounded-xl p-3 text-left transition-[min-height,transform] duration-700 active:scale-[0.98] motion-reduce:transition-none",
                overviewExpanded ? "min-h-[7.25rem]" : "min-h-[5.5rem]",
                action.tone
              )}
            >
              <Icon className={cn("transition-[width,height] duration-700 motion-reduce:transition-none", overviewExpanded ? "h-6 w-6" : "h-5 w-5")} />
              <span>
                <span className={cn("block break-keep font-extrabold transition-[font-size,line-height] duration-700 motion-reduce:transition-none", overviewExpanded ? "text-[15px] leading-5" : "text-[13px] leading-4")}>{action.label}</span>
                <span className={cn("mt-0.5 block break-keep font-bold opacity-70 transition-[font-size,line-height] duration-700 motion-reduce:transition-none", overviewExpanded ? "text-[11px] leading-4" : "text-[10px] leading-3")}>{action.caption}</span>
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
        "flex shrink-0 items-center justify-center overflow-hidden border-2 border-white/90 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800",
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
        <p className={cn(compact ? "text-[13px]" : "text-base", "truncate font-extrabold", contrast ? "text-white drop-shadow" : "text-slate-800 dark:text-slate-100")}>
          {loggedIn.name} {loggedIn.role}
        </p>
        <p className={cn("mt-0.5 truncate font-bold", compact ? "text-[11px]" : "text-sm", contrast ? "text-white/85 drop-shadow" : "text-slate-500 dark:text-slate-400")}>
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
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [photoTriggerRef, photoCardExpanded] = useViewportCenterBand<HTMLDivElement>({
    enterTop: 0.24,
    enterBottom: 0.74,
    exitTop: 0.12,
    exitBottom: 0.9,
  });

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
    <>
      <section className="relative w-full" aria-label="이번 주 유치부 사진">
        <div ref={photoTriggerRef} className="pointer-events-none absolute left-0 top-1/2 h-px w-full" aria-hidden="true" />
        <div className="mb-2 flex items-center justify-between px-1">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.12em] text-slate-500 dark:text-slate-400">THIS WEEK</p>
            <h2 className="mt-0.5 text-lg font-extrabold text-slate-900 dark:text-slate-100">이번 주 유치부 사진</h2>
          </div>
          {photos.length > 1 && (
            <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-slate-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800">
              {activeIndex + 1}/{photos.length}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setViewerOpen(true)}
          className={cn(
            "group relative block w-full overflow-hidden rounded-[1.75rem] bg-slate-900 text-left ring-1 ring-slate-200 transition-[height,box-shadow,transform] duration-700 ease-out active:scale-[0.99] motion-reduce:transition-none dark:ring-slate-800",
            photoCardExpanded
              ? "shadow-[0_22px_50px_rgba(15,23,42,0.20)]"
              : "shadow-[0_12px_28px_rgba(15,23,42,0.12)]"
          )}
          style={{ height: photoCardExpanded ? "clamp(20rem, 62dvh, 26.875rem)" : "12rem" }}
          aria-label={`${activePhoto.title} 사진 크게 보기`}
        >
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
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/10 via-slate-950/10 to-slate-950/82" />
          <div className="absolute right-4 top-4 rounded-full bg-white/92 px-3 py-1.5 text-xs font-extrabold text-slate-900 shadow-sm backdrop-blur transition group-active:scale-95 dark:bg-slate-950/80 dark:text-white">
            크게 보기
          </div>
          <div className="relative flex h-full flex-col justify-end px-5 pb-5 pt-5">
            <p className="text-xs font-extrabold text-white/75">이번 주 기록</p>
            <p className="mt-1 line-clamp-2 text-2xl font-extrabold leading-tight text-white drop-shadow">
              {activePhoto.title}
            </p>
            {showControls && (
              <div className="mt-4 flex items-center gap-2" aria-hidden="true">
                {photos.map((photo, index) => (
                  <span
                    key={photo.id}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      index === activeIndex ? "w-8 bg-white" : "w-2.5 bg-white/45"
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </button>

        {showControls && (
          <div className="mt-3 grid grid-cols-3 gap-2" aria-label="사진 슬라이드 선택">
            {photos.slice(0, 3).map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => onActiveIndexChange(index)}
                className={cn(
                  "relative h-16 overflow-hidden rounded-2xl bg-slate-200 ring-2 transition active:scale-95 dark:bg-slate-800",
                  index === activeIndex ? "ring-slate-900 dark:ring-white" : "ring-transparent"
                )}
                aria-pressed={index === activeIndex}
                aria-label={`${index + 1}번째 사진 보기`}
              >
                <img src={photo.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                {index === 2 && photos.length > 3 && (
                  <span className="absolute inset-0 flex items-center justify-center bg-slate-950/55 text-sm font-extrabold text-white">
                    +{photos.length - 3}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <p className="sr-only" aria-live="polite">
          {photos.length}장 중 {activeIndex + 1}번째 사진, {activePhoto.title}
        </p>
      </section>

      {viewerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="이번 주 유치부 사진 크게 보기"
          className="fixed inset-0 z-[80] flex h-[100dvh] w-full flex-col bg-slate-950 text-white"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-3 pt-[max(env(safe-area-inset-top),0.85rem)]">
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-white/55">이번 주 유치부 사진</p>
              <h2 className="mt-0.5 truncate text-base font-extrabold">{activePhoto.title}</h2>
            </div>
            <button
              type="button"
              onClick={() => setViewerOpen(false)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition active:scale-95"
              aria-label="사진 크게 보기 닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
            <div
              className="flex h-full w-full transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            >
              {photos.map((photo) => (
                <div key={photo.id} className="flex h-full w-full shrink-0 items-center justify-center">
                  <img
                    src={photo.imageUrl}
                    alt={photo.title}
                    className="max-h-full max-w-full object-contain"
                    draggable={false}
                  />
                </div>
              ))}
            </div>
          </div>
          {showControls && (
            <div className="shrink-0 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3">
              <div className="flex gap-2 overflow-x-auto">
                {photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => onActiveIndexChange(index)}
                    className={cn(
                      "h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/10 ring-2 transition active:scale-95",
                      index === activeIndex ? "ring-white" : "ring-transparent"
                    )}
                    aria-pressed={index === activeIndex}
                    aria-label={`${index + 1}번째 사진 보기`}
                  >
                    <img src={photo.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function NoticeInboxButton({
  notices,
  badgeCount,
  open,
  darkMode,
  onToggle,
  onToggleDarkMode,
  onLogout,
  contrast = false,
}: {
  notices: AdminNotice[];
  badgeCount?: number;
  open: boolean;
  darkMode: boolean;
  onToggle: () => void;
  onToggleDarkMode: () => void;
  onLogout: () => void;
  contrast?: boolean;
}) {
  const hasNotices = notices.length > 0;
  const visibleBadgeCount = badgeCount ?? notices.length;

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
          aria-label={hasNotices ? `공지 알림 ${visibleBadgeCount}개 보기` : "공지 알림 보기"}
          aria-expanded={open}
        >
          <Bell className="h-5 w-5" />
          {visibleBadgeCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold leading-none text-white ring-2 ring-white">
              {visibleBadgeCount > 9 ? "9+" : visibleBadgeCount}
            </span>
          )}
        </button>
      </div>
      <button
        type="button"
        onClick={onToggleDarkMode}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl shadow-sm transition active:scale-95",
          contrast
            ? "bg-white/25 text-white ring-1 ring-white/25 hover:bg-white/35"
            : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"
        )}
        aria-label={darkMode ? "라이트 모드로 전환" : "다크 모드로 전환"}
      >
        {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>
      <button
        type="button"
        onClick={onLogout}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl shadow-sm transition active:scale-95",
          contrast
            ? "bg-white/25 text-white ring-1 ring-white/25 hover:bg-white/35"
            : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"
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
  readNoticeIds,
  menuNoticeId,
  feedback,
  onClose,
  onOpenNotice,
  onToggleMenu,
  onMarkRead,
  onMarkUnread,
  onCopyNotice,
  onHideToday,
  onOpenSettings,
  offset,
}: {
  notices: AdminNotice[];
  readNoticeIds: string[];
  menuNoticeId: string | null;
  feedback: string | null;
  onClose: () => void;
  onOpenNotice: (notice: AdminNotice) => void;
  onToggleMenu: (noticeId: string) => void;
  onMarkRead: (noticeId: string) => void;
  onMarkUnread: (noticeId: string) => void;
  onCopyNotice: (notice: AdminNotice) => void;
  onHideToday: () => void;
  onOpenSettings: () => void;
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
            onClick={onOpenSettings}
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
      {feedback && (
        <div className="border-b border-white/10 bg-white/5 px-5 py-2 text-xs font-extrabold text-blue-100">
          {feedback}
        </div>
      )}
      <div className="min-h-[58dvh] max-h-[72dvh] space-y-1 overflow-y-auto px-2 py-4">
        {!hasNotices && (
          <div className="mx-3 rounded-2xl bg-white/5 px-4 py-12 text-center">
            <Bell className="mx-auto h-8 w-8 text-white/35" />
            <p className="mt-3 text-sm font-extrabold text-white/60">등록된 공지가 없습니다.</p>
          </div>
        )}
        {notices.map((notice) => {
          const isRead = readNoticeIds.includes(notice.id);

          return (
            <article key={notice.id} className="relative grid grid-cols-[3.25rem_1fr_auto] gap-3 rounded-2xl px-3 py-4 transition hover:bg-white/5">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white shadow-sm ring-1 ring-white/10">
                <Megaphone className="h-6 w-6" />
              </span>
              <button
                type="button"
                onClick={() => onOpenNotice(notice)}
                className="min-w-0 text-left"
                aria-label={`${notice.title} 전체 보기`}
              >
                <div className="flex min-w-0 items-start gap-2">
                  {!isRead && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-400" aria-label="읽지 않은 공지" />}
                  <h3 className={cn("line-clamp-2 break-words text-base font-extrabold leading-7", isRead ? "text-white/75" : "text-white")}>{notice.title}</h3>
                </div>
                <p className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-sm font-bold leading-6 text-white/75">
                  {notice.content}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-extrabold text-white/45">
                  <span>
                    {new Intl.DateTimeFormat("ko-KR", {
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(notice.createdAt))}
                  </span>
                  {isRead && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/55">
                      <Check className="h-3 w-3" />
                      읽음
                    </span>
                  )}
                </div>
              </button>
              <button
                type="button"
                onClick={() => onToggleMenu(notice.id)}
                className="flex h-11 w-8 items-center justify-center rounded-xl text-white/70 transition hover:bg-white/10 active:scale-95"
                aria-label="공지 더보기"
                aria-expanded={menuNoticeId === notice.id}
              >
                <MoreVertical className="h-6 w-6" />
              </button>
              {menuNoticeId === notice.id && (
                <div className="absolute right-3 top-14 z-10 w-48 overflow-hidden rounded-2xl bg-white py-2 text-sm font-extrabold text-slate-700 shadow-2xl ring-1 ring-slate-200">
                  <button type="button" onClick={() => onOpenNotice(notice)} className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-slate-50">
                    <Megaphone className="h-4 w-4 text-blue-600" />
                    전체 보기
                  </button>
                  {isRead ? (
                    <button type="button" onClick={() => onMarkUnread(notice.id)} className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-slate-50">
                      <RotateCcw className="h-4 w-4 text-slate-500" />
                      읽지 않음 처리
                    </button>
                  ) : (
                    <button type="button" onClick={() => onMarkRead(notice.id)} className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-slate-50">
                      <Check className="h-4 w-4 text-emerald-600" />
                      읽음 처리
                    </button>
                  )}
                  <button type="button" onClick={() => onCopyNotice(notice)} className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-slate-50">
                    <Copy className="h-4 w-4 text-slate-500" />
                    내용 복사
                  </button>
                  <button type="button" onClick={onHideToday} className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-slate-50">
                    <EyeOff className="h-4 w-4 text-amber-600" />
                    오늘 숨기기
                  </button>
                  <button type="button" onClick={onOpenSettings} className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3 text-left hover:bg-slate-50">
                    <Settings className="h-4 w-4 text-slate-500" />
                    알림 설정
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function NoticeSettingsModal({
  noticeCount,
  unreadCount,
  muted,
  onClose,
  onToggleMuted,
  onHideToday,
  onMarkAllRead,
  onResetReads,
}: {
  noticeCount: number;
  unreadCount: number;
  muted: boolean;
  onClose: () => void;
  onToggleMuted: () => void;
  onHideToday: () => void;
  onMarkAllRead: () => void;
  onResetReads: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/55 px-4 pb-4 backdrop-blur-sm sm:items-center sm:pb-0" role="dialog" aria-modal="true" aria-labelledby="notice-settings-title">
      <section className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="notice-settings-title" className="text-lg font-extrabold text-slate-900">알림 설정</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">공지 {noticeCount}개 · 읽지 않음 {unreadCount}개</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-500 ring-1 ring-slate-200 active:scale-95" aria-label="알림 설정 닫기">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-3 px-5 py-4">
          <button type="button" onClick={onToggleMuted} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4 text-left ring-1 ring-slate-200 active:scale-[0.99]">
            <span>
              <span className="block text-sm font-extrabold text-slate-800">홈 공지 팝업</span>
              <span className="mt-1 block text-xs font-bold text-slate-500">{muted ? "꺼져 있어도 알림창에서는 공지를 볼 수 있습니다." : "홈에 들어오면 새 공지 팝업을 보여줍니다."}</span>
            </span>
            <span className={cn("rounded-full px-3 py-1 text-xs font-extrabold", muted ? "bg-slate-200 text-slate-600" : "bg-blue-600 text-white")}>
              {muted ? "꺼짐" : "켜짐"}
            </span>
          </button>
          <button type="button" onClick={onHideToday} className="rounded-2xl bg-amber-50 px-4 py-4 text-left text-sm font-extrabold text-amber-800 ring-1 ring-amber-100 active:scale-[0.99]">
            오늘 하루 팝업 숨기기
          </button>
          <button type="button" onClick={onMarkAllRead} className="rounded-2xl bg-emerald-50 px-4 py-4 text-left text-sm font-extrabold text-emerald-800 ring-1 ring-emerald-100 active:scale-[0.99]">
            모든 공지 읽음 처리
          </button>
          <button type="button" onClick={onResetReads} className="rounded-2xl bg-slate-50 px-4 py-4 text-left text-sm font-extrabold text-slate-700 ring-1 ring-slate-200 active:scale-[0.99]">
            읽음 기록 초기화
          </button>
        </div>
      </section>
    </div>
  );
}

function NoticeDetailModal({ notice, onClose }: { notice: AdminNotice; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-slate-950/60 px-4 pb-4 backdrop-blur-sm sm:items-center sm:pb-0" role="dialog" aria-modal="true" aria-labelledby="notice-detail-title">
      <section className="flex max-h-[82dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-blue-600">공지사항</p>
            <h2 id="notice-detail-title" className="mt-1 break-words text-xl font-extrabold leading-8 text-slate-900">{notice.title}</h2>
            <p className="mt-2 text-xs font-bold text-slate-400">
              {new Intl.DateTimeFormat("ko-KR", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(notice.createdAt))}
            </p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 active:scale-95" aria-label="공지 상세 닫기">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">
          <p className="whitespace-pre-wrap break-words text-base font-bold leading-8 text-slate-700">{notice.content}</p>
        </div>
        <div className="border-t border-slate-100 px-5 py-4">
          <button type="button" onClick={onClose} className="h-12 w-full rounded-xl bg-slate-900 text-base font-extrabold text-white shadow-soft active:scale-[0.99]">
            확인
          </button>
        </div>
      </section>
    </div>
  );
}

function InfoOverview({
  loggedIn,
  students,
  loading,
  onEdit,
}: {
  loggedIn: TeacherAccount;
  students: StudentRecitationDto[];
  loading: boolean;
  onEdit: () => void;
}) {
  const formatBirthDate = (birthDate?: string) => {
    if (!birthDate) return "미등록";
    const [year, month, day] = birthDate.split("-");
    return `${year}.${month}.${day}`;
  };

  return (
    <div className="grid w-full gap-3">
      <section className="w-full rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800">
        <div className="flex items-start justify-between gap-3">
          <TeacherProfileSummary loggedIn={loggedIn} />
          <button
            type="button"
            onClick={onEdit}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-3 text-xs font-extrabold text-white shadow-sm active:scale-95 dark:bg-white dark:text-slate-950"
          >
            <Settings className="h-4 w-4" />
            회원정보 수정
          </button>
        </div>
        <dl className="mt-5 grid gap-2 text-sm font-bold">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 dark:bg-slate-800/70 dark:ring-slate-700">
            <dt className="text-slate-500 dark:text-slate-400">이름</dt>
            <dd className="text-slate-900 dark:text-white">{loggedIn.name}</dd>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 dark:bg-slate-800/70 dark:ring-slate-700">
            <dt className="text-slate-500 dark:text-slate-400">담당 반</dt>
            <dd className="text-slate-900 dark:text-white">{loggedIn.className}</dd>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 dark:bg-slate-800/70 dark:ring-slate-700">
            <dt className="text-slate-500 dark:text-slate-400">역할</dt>
            <dd className="text-slate-900 dark:text-white">{loggedIn.role}</dd>
          </div>
        </dl>
      </section>

      <section className="w-full rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">담당 아이 정보</h2>
            <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">{loggedIn.className}에 등록된 아이들입니다.</p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/15 dark:text-blue-200 dark:ring-blue-500/25">
            {students.length}명
          </span>
        </div>

        <div className="mt-4 grid gap-3">
          {loading && <p className="py-6 text-center text-sm font-bold text-slate-400">불러오는 중...</p>}
          {!loading && students.length === 0 && <p className="py-6 text-center text-sm font-bold text-slate-400">등록된 아이가 없습니다.</p>}
          {students.map((student) => (
            <article key={student.studentId} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 dark:bg-slate-800/70 dark:ring-slate-700">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                  <img
                    src={resolveMediaUrl(student.photoUrl) || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(student.name)}`}
                    alt={`${student.name} 프로필`}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-extrabold text-slate-800 dark:text-slate-100">{student.name}</h3>
                  <p className="mt-1 text-xs font-bold text-slate-400 dark:text-slate-500">{student.className}</p>
                </div>
              </div>
              <dl className="mt-4 grid gap-2 text-sm font-bold">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">생년월일</dt>
                  <dd className="text-right text-slate-800 dark:text-slate-100">{formatBirthDate(student.birthDate)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">부모님 성함</dt>
                  <dd className="text-right text-slate-800 dark:text-slate-100">{student.parentName || "미등록"}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function StudentInfoEditor({
  student,
  onSaved,
}: {
  student: StudentRecitationDto;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = React.useState(student.name);
  const [birthDate, setBirthDate] = React.useState(student.birthDate ?? "");
  const [parentName, setParentName] = React.useState(student.parentName ?? "");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setName(student.name);
    setBirthDate(student.birthDate ?? "");
    setParentName(student.parentName ?? "");
  }, [student]);

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await api.updateStudent(student.studentId, {
        name: name.trim(),
        birthDate: birthDate || undefined,
        parentName: parentName.trim() || undefined,
      });
      await onSaved();
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await api.uploadProfile(file, "student", student.studentId);
    await onSaved();
    event.target.value = "";
  };

  return (
    <article className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 dark:bg-slate-800/70 dark:ring-slate-700">
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
          <img
            src={resolveMediaUrl(student.photoUrl) || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(student.name)}`}
            alt={`${student.name} 프로필`}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-slate-800 dark:text-slate-100">{student.name}</p>
          <p className="mt-0.5 text-xs font-bold text-slate-400 dark:text-slate-500">{student.className}</p>
        </div>
        <label className="flex h-10 cursor-pointer items-center gap-1 rounded-xl bg-white px-3 text-xs font-extrabold text-slate-600 ring-1 ring-slate-200 active:scale-95 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
          <Camera className="h-4 w-4" />
          사진
          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </label>
      </div>
      <div className="mt-3 grid gap-2">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="아이 이름" aria-label={`${student.name} 이름`} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
        <input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} aria-label={`${student.name} 생년월일`} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
        <input value={parentName} onChange={(event) => setParentName(event.target.value)} placeholder="부모님 성함" aria-label={`${student.name} 부모님 성함`} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
        <button type="button" onClick={handleSave} disabled={saving || !name.trim()} className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-blue-600 text-sm font-extrabold text-white transition active:scale-[0.98] disabled:opacity-50">
          <Save className="h-4 w-4" />
          {saving ? "저장 중..." : "아이 정보 저장"}
        </button>
      </div>
    </article>
  );
}

function ScheduleView({ image }: { image: ScheduleImage | null }) {
  return (
    <section className="w-full rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          <CalendarDays className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">계획표</h2>
          <p className="mt-1 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
            손가락으로 확대하거나 좌우로 움직여 자세히 볼 수 있습니다.
          </p>
        </div>
      </div>

      {!image && (
        <div className="mt-4 rounded-2xl bg-slate-50 px-5 py-12 text-center ring-1 ring-slate-200 dark:bg-slate-800/70 dark:ring-slate-700">
          <CalendarDays className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-3 text-sm font-extrabold text-slate-500 dark:text-slate-400">등록된 계획표가 없습니다.</p>
        </div>
      )}

      {image && (
        <div className="mt-4">
          <div className="mb-3">
            <h3 className="break-words text-sm font-extrabold text-slate-700 dark:text-slate-200">{image.title}</h3>
            <p className="mt-1 text-xs font-bold text-slate-400 dark:text-slate-500">
              {new Intl.DateTimeFormat("ko-KR", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }).format(new Date(image.createdAt))}
            </p>
          </div>
          <div className="max-h-[68dvh] overflow-auto rounded-2xl bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-700">
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

function WeeklyLessonVideoCard({ video, onOpenLibrary }: { video: LessonVideo; onOpenLibrary: () => void }) {
  const [lessonTriggerRef, lessonExpanded] = useViewportExpanded<HTMLDivElement>({
    rootMargin: "-44% 0px 0px 0px",
    minRatio: 0.01,
  });

  return (
    <section
      className={cn(
        "relative w-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80 transition-[box-shadow,transform] duration-700 motion-reduce:transition-none dark:bg-slate-900 dark:ring-slate-800",
        lessonExpanded && "shadow-[0_22px_50px_rgba(244,63,94,0.18)]"
      )}
    >
      <div ref={lessonTriggerRef} className="pointer-events-none absolute bottom-0 left-0 h-[28dvh] w-full" aria-hidden="true" />
      <div className={cn("flex items-start justify-between gap-3 border-b border-slate-100 px-4 dark:border-slate-800 transition-[padding] duration-700 motion-reduce:transition-none", lessonExpanded ? "py-4" : "py-3")}>
        <div className="min-w-0">
          <p className="text-xs font-extrabold text-rose-600">이번 주 공과</p>
          <h2 className={cn("mt-1 line-clamp-2 break-words font-extrabold text-slate-800 transition-[font-size,line-height] duration-700 motion-reduce:transition-none dark:text-slate-100", lessonExpanded ? "text-xl leading-7" : "text-base leading-6")}>{video.title}</h2>
          {video.pastor && <p className="mt-1 text-xs font-bold text-slate-400 dark:text-slate-500">{video.pastor}</p>}
        </div>
        <button
          type="button"
          onClick={onOpenLibrary}
          className="flex h-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 px-3 text-xs font-extrabold text-rose-700 ring-1 ring-rose-100 active:scale-95 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-rose-500/25"
        >
          전체
        </button>
      </div>
      <div
        className="w-full bg-slate-100 transition-[height] duration-700 motion-reduce:transition-none dark:bg-slate-950"
        style={{ height: lessonExpanded ? "clamp(15.5rem, 46dvh, 22rem)" : "12rem" }}
      >
        <iframe
          className="h-full w-full"
          src={`https://www.youtube.com/embed/${video.videoId}`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </section>
  );
}

function LessonVideoLibrary({ videos, activeVideo }: { videos: LessonVideo[]; activeVideo: LessonVideo | null }) {
  const [selectedVideoId, setSelectedVideoId] = React.useState<string | null>(null);
  const selectedVideo = videos.find((video) => video.id === selectedVideoId) ?? activeVideo ?? videos[0] ?? null;

  React.useEffect(() => {
    if (!selectedVideoId && activeVideo) {
      setSelectedVideoId(activeVideo.id);
      return;
    }

    if (!selectedVideoId && videos.length > 0) {
      setSelectedVideoId(videos[0].id);
      return;
    }

    if (selectedVideoId && !videos.some((video) => video.id === selectedVideoId)) {
      setSelectedVideoId(videos[0]?.id ?? null);
    }
  }, [activeVideo, selectedVideoId, videos]);

  return (
    <section className="flex h-[calc(100dvh-9.75rem-max(env(safe-area-inset-bottom),0.75rem))] min-h-[34rem] w-full flex-col gap-3 overflow-hidden">
      {!selectedVideo && (
        <div className="rounded-2xl bg-white px-5 py-12 text-center shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800">
          <PlayCircle className="mx-auto h-10 w-10 text-slate-400 dark:text-slate-600" />
          <p className="mt-3 text-sm font-extrabold text-slate-500 dark:text-slate-400">등록된 공과 영상이 없습니다.</p>
        </div>
      )}

      {selectedVideo && (
        <>
          <section className="shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800">
            <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <p className="text-xs font-extrabold text-rose-600">선택한 공과</p>
              <h3 className="mt-1 line-clamp-2 break-words text-base font-extrabold text-slate-800 dark:text-slate-100">{selectedVideo.title}</h3>
              {selectedVideo.pastor && (
                <p className="mt-1 text-xs font-bold text-slate-400 dark:text-slate-500">{selectedVideo.pastor}</p>
              )}
              {selectedVideo.description && (
                <p className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
                  {selectedVideo.description}
                </p>
              )}
            </div>
            <div className="aspect-video w-full bg-slate-100 dark:bg-slate-950">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube.com/embed/${selectedVideo.videoId}`}
                title={selectedVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </section>

          <section className="flex min-h-0 flex-1 flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800">
            <div className="mb-3 flex shrink-0 items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-200">전체 공과</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                {videos.length}개
              </span>
            </div>
            <div className="grid min-h-0 flex-1 gap-2 overflow-y-auto pr-1">
              {videos.map((video) => {
                const active = video.id === selectedVideo.id;
                return (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => setSelectedVideoId(video.id)}
                    aria-pressed={active}
                    className={cn(
                      "grid grid-cols-[5.75rem_1fr] gap-3 rounded-2xl p-2 text-left ring-1 transition active:scale-[0.99]",
                      active ? "bg-rose-50 ring-rose-200 dark:bg-rose-500/15 dark:ring-rose-500/25" : "bg-slate-50 ring-slate-200 dark:bg-slate-800/70 dark:ring-slate-700"
                    )}
                  >
                    <div className="aspect-video overflow-hidden rounded-xl bg-slate-200">
                      <img
                        src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                        alt={`${video.title} 썸네일`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 py-1">
                      <p className={cn("line-clamp-2 break-words text-sm font-extrabold leading-5", active ? "text-rose-800 dark:text-rose-100" : "text-slate-800 dark:text-slate-100")}>
                        {video.title}
                      </p>
                      {video.pastor && <p className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">{video.pastor}</p>}
                      <p className="mt-1 text-[11px] font-bold text-slate-400 dark:text-slate-500">
                        {new Intl.DateTimeFormat("ko-KR", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        }).format(new Date(video.createdAt))}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </>
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
  activeTab: "home" | "schedule" | "foundation" | "lessons" | "info";
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
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md border-t border-slate-200 bg-white/90 px-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-800 dark:bg-[#0b1120]/92"
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
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                  : "text-slate-400 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-slate-200"
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
    <section className="w-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-800">
      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <h2 className="text-sm font-extrabold text-slate-700 dark:text-slate-200">{title}</h2>
      </div>
      <div className="aspect-video w-full bg-slate-100 dark:bg-slate-950">
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
