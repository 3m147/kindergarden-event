"use client";

/**
 * AdminDashboardView
 * ------------------
 * 관리자 대시보드. 모든 반의 선생님들이 제출한 학생 암송/퀴즈 점수를 한눈에 확인.
 * localStorage 의 admin_authenticated 로 간단한 인증 체크.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Shield, LogOut, ChevronDown, ChevronUp, Users, BookOpen, HelpCircle, CheckCircle2, Camera, RefreshCw, Megaphone, Plus, Trash2, Image as ImageIcon, Upload, FileText, ExternalLink, CalendarDays, PlayCircle } from "lucide-react";
import { api, clearAuthToken, hasAuthToken, resolveMediaUrl, type StudentRecitationDto } from "@/lib/api";
import { type AdminNotice } from "@/lib/notices";
import { type WeeklyPhoto } from "@/lib/weeklyPhotos";
import { type FoundationMaterial } from "@/lib/foundationMaterials";
import { type ScheduleImage } from "@/lib/scheduleImages";
import { extractYoutubeVideoId, type LessonVideo } from "@/lib/lessonVideos";

const TOTAL_RECITATIONS = 16;
const TOTAL_QUIZZES = 18;
const TOTAL_KINDERGARTEN_LESSONS = 52;
const KINDERGARTEN_ACTIVITY_TYPES = [
  { key: "KINDERGARTEN_ATTENDANCE", label: "출석", color: "amber" },
  { key: "KINDERGARTEN_FOUNDATION", label: "머릿돌", color: "emerald" },
  { key: "KINDERGARTEN_RECITATION", label: "암송", color: "sky" },
] as const;

const KINDERGARTEN_BOOKS = [
  { id: 1, title: "1~3월", start: 1, end: 13 },
  { id: 2, title: "4~6월", start: 14, end: 26 },
  { id: 3, title: "7~9월", start: 27, end: 39 },
  { id: 4, title: "10~12월", start: 40, end: 52 },
];

const LESSON_TITLES: Record<number, string> = {
  1: "친구야 안녕",
  2: "나는 교회학교가 좋아요",
  3: "보이지 않는 하나님",
  4: "나를 사랑하시는 하나님",
  5: "성경은 하나님이 보내신 편지",
  6: "빛을 만드신 하나님",
  7: "하늘을 만드신 하나님",
  8: "땅에는 나무와 꽃들이 있어요",
  9: "해와 달과 별을 만드신 하나님",
  10: "새를 만드신 하나님",
  11: "물고기를 만드신 하나님",
  12: "땅에는 동물들이 살아요",
  13: "하나님은 흙으로 사람을 만드셨어요",
  14: "에덴동산",
  15: "방주에 타세요",
  16: "바벨탑을 쌓았어요",
  17: "하나님의 말씀을 따른 아브람",
  18: "이삭을 바친 아브라함",
  19: "쌍둥이 형제 에서와 야곱",
  20: "총리가 된 요셉",
  21: "물에서 건진 모세",
  22: "열가지 재앙",
  23: "홍해를 건넜어요",
  24: "광야에서 지켜주신 하나님",
  25: "하나님을 의지한 여호수아와 갈렙",
  26: "무너진 여리고성",
  27: "믿음의 승리자 기드온",
  28: "힘을 잃은 삼손",
  29: "말씀을 따르지 않은 사울 왕",
  30: "용감한 다윗",
  31: "다윗과 요나단",
  32: "지혜의 왕 솔로몬",
  33: "선지자 엘리야",
  34: "기도하는 다니엘",
  35: "물고기 뱃속에 갇힌 요나",
  36: "말씀대로 예수님께서 태어나셨어요",
  37: "지혜로우신 예수님",
  38: "시험을 이기신 예수님",
  39: "예수님께서는 어린이를 사랑하세요",
  40: "물로 포도주를 만드셨어요",
  41: "예수님은 아픈 사람을 고쳐 주셨어요",
  42: "많은 사람을 먹이셨어요",
  43: "거친 바다를 잔잔하게 하셨어요",
  44: "죽은 나사로를 살리셨어요",
  45: "다시 찾은 아들",
  46: "삭개오는 예수님을 만났어요",
  47: "예수님께서 제자의 발을 씻기셨어요",
  48: "고난 받으신 예수님",
  49: "예수님은 다시 살아나셨어요",
  50: "다시 오실 예수님",
  51: "천국",
  52: "하나님 감사해요"
};

function countSuccess(states: Record<number, "success" | "fail"> | undefined): number {
  if (!states) return 0;
  return Object.values(states).filter((s) => s === "success").length;
}

function countKindergartenActivity(
  student: StudentRecitationDto,
  activityType: string
): number {
  const states = student.kindergartenActivityStates ?? {};
  return Array.from({ length: TOTAL_KINDERGARTEN_LESSONS }, (_, i) => i + 1)
    .filter((lesson) => states[`${lesson}:${activityType}`] === "success").length;
}

function toPercent(count: number, total = TOTAL_KINDERGARTEN_LESSONS) {
  if (total <= 0) return 0;
  return Math.round((count / total) * 100);
}

export default function AdminDashboardView({
  initialMode = "kindergarten",
}: {
  initialMode?: "festival" | "kindergarten";
} = {}) {
  const router = useRouter();
  const [authenticated, setAuthenticated] = React.useState(false);
  const [mode, setMode] = React.useState<"festival" | "kindergarten">(initialMode);
  const [activeTab, setActiveTab] = React.useState<"kindergarten" | "festival" | "notice" | "schedule" | "foundation" | "lesson">(initialMode);
  const [expandedClass, setExpandedClass] = React.useState<number | null>(null);
  const [expandedStudent, setExpandedStudent] = React.useState<number | null>(null);
  const [students, setStudents] = React.useState<StudentRecitationDto[]>([]);
  const [refreshing, setRefreshing] = React.useState(false);
  const [unlockingStudentId, setUnlockingStudentId] = React.useState<number | null>(null);
  const [toast, setToast] = React.useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [notices, setNotices] = React.useState<AdminNotice[]>([]);
  const [noticeTitle, setNoticeTitle] = React.useState("");
  const [noticeContent, setNoticeContent] = React.useState("");
  const [noticeShouldPopup, setNoticeShouldPopup] = React.useState(false);
  const [weeklyPhotos, setWeeklyPhotos] = React.useState<WeeklyPhoto[]>([]);
  const [weeklyPhotoTitle, setWeeklyPhotoTitle] = React.useState("");
  const [foundationMaterials, setFoundationMaterials] = React.useState<FoundationMaterial[]>([]);
  const [foundationTitle, setFoundationTitle] = React.useState("");
  const [scheduleImages, setScheduleImages] = React.useState<ScheduleImage[]>([]);
  const [scheduleTitle, setScheduleTitle] = React.useState("");
  const [lessonVideos, setLessonVideos] = React.useState<LessonVideo[]>([]);
  const [lessonVideoTitle, setLessonVideoTitle] = React.useState("");
  const [lessonVideoUrl, setLessonVideoUrl] = React.useState("");
  const [lessonVideoDescription, setLessonVideoDescription] = React.useState("");

  const [subTab, setSubTab] = React.useState<"check" | "chart">("check");
  const [selectedBookId, setSelectedBookId] = React.useState(1);

  React.useEffect(() => {
    setSubTab("check");
  }, [expandedStudent]);

  const handleToggleKindergartenActivity = async (studentId: number, lessonNum: number, activityType: string, currentSuccess: boolean) => {
    const nextSuccess = !currentSuccess;
    const activityKey = `${lessonNum}:${activityType}`;

    setStudents((prev) =>
      prev.map((s) => {
        if (s.studentId !== studentId) return s;
        const currentStates = s.kindergartenActivityStates || {};
        const newStates = { ...currentStates };
        if (nextSuccess) {
          newStates[activityKey] = "success";
        } else {
          delete newStates[activityKey];
        }
        return {
          ...s,
          kindergartenActivityStates: newStates
        };
      })
    );

    try {
      await api.toggleRecitation(
        studentId,
        lessonNum,
        activityType,
        nextSuccess ? true : null,
        0
      );
    } catch (e) {
      console.error("API 저장 실패", e);
      setToast({ kind: "error", text: "상태 저장 중 오류가 발생했습니다." });
      loadScores();
    }
  };

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadScores = React.useCallback(async (showToast = false) => {
    setRefreshing(true);
    try {
      const data = await api.getAdminScores();
      setStudents(data);
      if (showToast) {
        setToast({ kind: "success", text: "최신 현황으로 새로고침했습니다." });
      }
    } catch (e) {
      console.error("점수 로드 실패", e);
      if (showToast) {
        setToast({ kind: "error", text: "새로고침 중 오류가 발생했습니다." });
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    const auth = localStorage.getItem("admin_authenticated");
    if (auth !== "true" || !hasAuthToken()) {
      router.replace("/admin");
      return;
    }
    setAuthenticated(true);
    Promise.all([
      api.listAdminNotices(),
      api.listWeeklyPhotos(),
      api.listFoundationMaterials(),
      api.listScheduleImages(),
      api.listLessonVideos(),
    ]).then(([nextNotices, nextPhotos, nextMaterials, nextSchedules, nextVideos]) => {
      setNotices(nextNotices);
      setWeeklyPhotos(nextPhotos);
      setFoundationMaterials(nextMaterials);
      setScheduleImages(nextSchedules);
      setLessonVideos(nextVideos);
    }).catch((error) => {
      console.error("관리 콘텐츠 로드 실패", error);
      setToast({ kind: "error", text: "관리 콘텐츠를 불러오지 못했습니다." });
    });
    loadScores();
  }, [loadScores, router]);

  const handleLogout = () => {
    localStorage.removeItem("admin_authenticated");
    clearAuthToken();
    router.replace("/admin");
  };

  const handleUnlock = async (student: StudentRecitationDto) => {
    if (unlockingStudentId !== null) return;
    setUnlockingStudentId(student.studentId);
    try {
      const updated = await api.unlockStudentSubmission(student.studentId);
      setStudents((prev) => prev.map((s) => (s.studentId === student.studentId ? updated : s)));
      setExpandedStudent(null);
      setToast({ kind: "success", text: `${updated.name} 수정 잠금을 해제했습니다.` });
    } catch (e) {
      setToast({ kind: "error", text: "수정 잠금 해제 중 오류가 발생했습니다." });
    } finally {
      setUnlockingStudentId(null);
    }
  };

  const handleAddNotice = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = noticeTitle.trim();
    const content = noticeContent.trim();
    if (!title || !content) {
      setToast({ kind: "error", text: "공지 제목과 내용을 입력해 주세요." });
      return;
    }

    try {
      const nextNotice = await api.addNotice({ title, content, showToTeachers: noticeShouldPopup });
      setNotices((current) => [nextNotice, ...current]);
      setNoticeTitle("");
      setNoticeContent("");
      setNoticeShouldPopup(false);
      setToast({ kind: "success", text: noticeShouldPopup ? "선생님 팝업 공지를 등록했습니다." : "공지사항을 추가했습니다." });
    } catch (error) {
      console.error("공지 저장 실패", error);
      setToast({ kind: "error", text: "공지사항을 저장하지 못했습니다." });
    }
  };

  const handleDeleteNotice = async (noticeId: string) => {
    try {
      await api.deleteNotice(noticeId);
      setNotices((current) => current.filter((notice) => notice.id !== noticeId));
      setToast({ kind: "success", text: "공지사항을 삭제했습니다." });
    } catch (error) {
      console.error("공지 삭제 실패", error);
      setToast({ kind: "error", text: "공지사항을 삭제하지 못했습니다." });
    }
  };

  const handleAddWeeklyPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setToast({ kind: "error", text: "이미지 파일만 추가할 수 있습니다." });
      return;
    }

    try {
      const nextPhoto = await api.addWeeklyPhoto(
        weeklyPhotoTitle.trim() || file.name.replace(/\.[^/.]+$/, "") || "이번 주 유치부 사진",
        file
      );
      setWeeklyPhotos((current) => [nextPhoto, ...current]);
      setWeeklyPhotoTitle("");
      setToast({ kind: "success", text: "이번 주 유치부 사진을 추가했습니다." });
    } catch (error) {
      console.error("사진 저장 실패", error);
      setToast({ kind: "error", text: "사진을 저장하지 못했습니다. 파일 크기와 형식을 확인해 주세요." });
    }
  };

  const handleDeleteWeeklyPhoto = async (photoId: string) => {
    try {
      await api.deleteWeeklyPhoto(photoId);
      setWeeklyPhotos((current) => current.filter((photo) => photo.id !== photoId));
      setToast({ kind: "success", text: "이번 주 유치부 사진을 삭제했습니다." });
    } catch (error) {
      console.error("사진 삭제 실패", error);
      setToast({ kind: "error", text: "사진을 삭제하지 못했습니다." });
    }
  };

  const handleAddFoundationMaterial = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    if (file.type !== "application/pdf") {
      setToast({ kind: "error", text: "PDF 파일만 추가할 수 있습니다." });
      return;
    }

    try {
      const nextMaterial = await api.addFoundationMaterial(
        foundationTitle.trim() || file.name.replace(/\.[^/.]+$/, "") || "머릿돌",
        file
      );
      setFoundationMaterials((current) => [
        nextMaterial,
        ...current.map((material) => ({ ...material, isActive: false })),
      ]);
      setFoundationTitle("");
      setToast({ kind: "success", text: "머릿돌 PDF를 추가하고 현재 자료로 설정했습니다." });
    } catch (error) {
      console.error("머릿돌 PDF 저장 실패", error);
      setToast({ kind: "error", text: "PDF를 저장하지 못했습니다. 파일 크기와 형식을 확인해 주세요." });
    }
  };

  const handleActivateFoundationMaterial = async (materialId: string) => {
    try {
      await api.activateFoundationMaterial(materialId);
      setFoundationMaterials((current) => current.map((material) => ({ ...material, isActive: material.id === materialId })));
      setToast({ kind: "success", text: "선생님 화면에 표시할 머릿돌을 변경했습니다." });
    } catch (error) {
      console.error("머릿돌 활성화 실패", error);
      setToast({ kind: "error", text: "머릿돌을 변경하지 못했습니다." });
    }
  };

  const handleDeleteFoundationMaterial = async (materialId: string) => {
    try {
      await api.deleteFoundationMaterial(materialId);
      setFoundationMaterials(await api.listFoundationMaterials());
      setToast({ kind: "success", text: "머릿돌 PDF를 삭제했습니다." });
    } catch (error) {
      console.error("머릿돌 삭제 실패", error);
      setToast({ kind: "error", text: "머릿돌 PDF를 삭제하지 못했습니다." });
    }
  };

  const handleAddScheduleImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setToast({ kind: "error", text: "이미지 파일만 추가할 수 있습니다." });
      return;
    }

    try {
      const nextImage = await api.addScheduleImage(
        scheduleTitle.trim() || file.name.replace(/\.[^/.]+$/, "") || "계획표",
        file
      );
      setScheduleImages((current) => [
        nextImage,
        ...current.map((image) => ({ ...image, isActive: false })),
      ]);
      setScheduleTitle("");
      setToast({ kind: "success", text: "계획표 이미지를 추가하고 현재 계획표로 설정했습니다." });
    } catch (error) {
      console.error("계획표 이미지 저장 실패", error);
      setToast({ kind: "error", text: "계획표 이미지를 저장하지 못했습니다. 파일 크기와 형식을 확인해 주세요." });
    }
  };

  const handleActivateScheduleImage = async (imageId: string) => {
    try {
      await api.activateScheduleImage(imageId);
      setScheduleImages((current) => current.map((image) => ({ ...image, isActive: image.id === imageId })));
      setToast({ kind: "success", text: "선생님 화면에 표시할 계획표를 변경했습니다." });
    } catch (error) {
      console.error("계획표 활성화 실패", error);
      setToast({ kind: "error", text: "계획표를 변경하지 못했습니다." });
    }
  };

  const handleDeleteScheduleImage = async (imageId: string) => {
    try {
      await api.deleteScheduleImage(imageId);
      setScheduleImages(await api.listScheduleImages());
      setToast({ kind: "success", text: "계획표 이미지를 삭제했습니다." });
    } catch (error) {
      console.error("계획표 삭제 실패", error);
      setToast({ kind: "error", text: "계획표 이미지를 삭제하지 못했습니다." });
    }
  };

  const handleAddLessonVideo = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = lessonVideoTitle.trim();
    const url = lessonVideoUrl.trim();
    const videoId = extractYoutubeVideoId(url);

    if (!title || !url) {
      setToast({ kind: "error", text: "공과 제목과 유튜브 링크를 입력해 주세요." });
      return;
    }

    if (!videoId) {
      setToast({ kind: "error", text: "유효한 유튜브 링크 또는 영상 ID를 입력해 주세요." });
      return;
    }

    const nextVideo: LessonVideo = {
      id: `${Date.now()}`,
      title,
      url,
      videoId,
      description: lessonVideoDescription.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      setLessonVideos(await api.replaceLessonVideos([nextVideo, ...lessonVideos]));
      setLessonVideoTitle("");
      setLessonVideoUrl("");
      setLessonVideoDescription("");
      setToast({ kind: "success", text: "공과 영상을 추가했습니다." });
    } catch (error) {
      console.error("공과 영상 저장 실패", error);
      setToast({ kind: "error", text: "공과 영상을 저장하지 못했습니다." });
    }
  };

  const handleDeleteLessonVideo = async (videoId: string) => {
    try {
      setLessonVideos(await api.replaceLessonVideos(lessonVideos.filter((video) => video.id !== videoId)));
      setToast({ kind: "success", text: "공과 영상을 삭제했습니다." });
    } catch (error) {
      console.error("공과 영상 삭제 실패", error);
      setToast({ kind: "error", text: "공과 영상을 삭제하지 못했습니다." });
    }
  };

  if (!authenticated) return null;

  const submittedOnly = students.filter((s) => s.submitted);
  const visibleStudents = mode === "festival" ? submittedOnly : students;

  const classGroups = visibleStudents.reduce<Record<number, { className: string; teacherName: string; students: StudentRecitationDto[] }>>((acc, s) => {
    if (!acc[s.classId]) acc[s.classId] = { className: s.className, teacherName: s.teacherName, students: [] };
    acc[s.classId].students.push(s);
    return acc;
  }, {});

  const classIds = Object.keys(classGroups).map(Number).sort();
  const totalStudents = students.length;
  const submittedStudents = submittedOnly.length;
  const visibleClasses = classIds.length;
  const screenTitle = activeTab === "notice" ? "공지사항 관리" : activeTab === "schedule" ? "계획표 관리" : activeTab === "foundation" ? "머릿돌 관리" : activeTab === "lesson" ? "공과 영상 관리" : mode === "festival" ? "암송잔치 현황" : "유치부 체크 현황";
  const screenSubtitle = activeTab === "notice" ? "관리자 공지 글 추가 · 삭제" : activeTab === "schedule" ? "선생님 화면에 표시할 계획표 이미지 업로드 · 선택" : activeTab === "foundation" ? "선생님 화면에 표시할 PDF 업로드 · 선택" : activeTab === "lesson" ? "선생님이 다시 볼 수 있는 유튜브 공과 링크 관리" : mode === "festival" ? "최종 제출된 암송 · 퀴즈 결과" : "출석 · 머릿돌 · 암송 활동 결과";

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-2xl bg-slate-900 pb-[max(env(safe-area-inset-bottom),2rem)]">
      {/* 헤더 */}
      <header className="sticky top-0 z-20 bg-slate-900/95 px-5 pb-4 pt-[max(env(safe-area-inset-top),1.25rem)] backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-extrabold text-white sm:text-xl">{screenTitle}</h1>
              <p className="text-xs text-slate-400">{screenSubtitle}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <button
              type="button"
              onClick={() => loadScores(true)}
              disabled={refreshing}
              className={cn(
                "flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-800 px-3 text-sm font-bold text-slate-300 ring-1 ring-slate-700 transition hover:text-white active:scale-95 disabled:opacity-60",
                (activeTab === "notice" || activeTab === "schedule" || activeTab === "foundation" || activeTab === "lesson") && "hidden sm:flex"
              )}
              aria-label="현황 새로고침"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              새로고침
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/profiles")}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-800 px-3 text-sm font-bold text-slate-300 ring-1 ring-slate-700 transition hover:text-white active:scale-95"
            >
              <Camera className="h-4 w-4" />
              프로필
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-800 px-3 text-sm font-bold text-slate-300 ring-1 ring-slate-700 transition hover:text-white active:scale-95 sm:col-auto"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 화면 선택 */}
      <section className="px-5 pt-2">
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-800 p-1 ring-1 ring-slate-700 sm:grid-cols-6" aria-label="관리자 화면 선택">
          <button
            type="button"
            aria-pressed={activeTab === "kindergarten"}
            onClick={() => {
              setMode("kindergarten");
              setActiveTab("kindergarten");
              setExpandedClass(null);
              setExpandedStudent(null);
              router.push("/admin/dashboard/kindergarten");
            }}
            className={cn(
              "min-h-12 rounded-xl px-1 text-sm font-extrabold leading-tight transition active:scale-[0.98]",
              activeTab === "kindergarten"
                ? "bg-emerald-500 text-white shadow"
                : "text-slate-400 hover:text-white"
            )}
          >
            유치부 체크
          </button>
          <button
            type="button"
            aria-pressed={activeTab === "festival"}
            onClick={() => {
              setMode("festival");
              setActiveTab("festival");
              setExpandedClass(null);
              setExpandedStudent(null);
              router.push("/admin/dashboard/festival");
            }}
            className={cn(
              "min-h-12 rounded-xl px-1 text-sm font-extrabold leading-tight transition active:scale-[0.98]",
              activeTab === "festival"
                ? "bg-amber-400 text-slate-900 shadow"
                : "text-slate-400 hover:text-white"
            )}
          >
            암송잔치
          </button>
          <button
            type="button"
            aria-pressed={activeTab === "notice"}
            onClick={() => {
              setActiveTab("notice");
              setExpandedClass(null);
              setExpandedStudent(null);
            }}
            className={cn(
              "flex min-h-12 items-center justify-center gap-1 rounded-xl px-1 text-sm font-extrabold leading-tight transition active:scale-[0.98]",
              activeTab === "notice"
                ? "bg-sky-500 text-white shadow"
                : "text-slate-400 hover:text-white"
            )}
          >
            <Megaphone className="h-4 w-4" />
            공지사항
          </button>
          <button
            type="button"
            aria-pressed={activeTab === "foundation"}
            onClick={() => {
              setActiveTab("foundation");
              setExpandedClass(null);
              setExpandedStudent(null);
            }}
            className={cn(
              "flex min-h-12 items-center justify-center gap-1 rounded-xl px-1 text-sm font-extrabold leading-tight transition active:scale-[0.98]",
              activeTab === "foundation"
                ? "bg-emerald-500 text-white shadow"
                : "text-slate-400 hover:text-white"
            )}
          >
            <FileText className="h-4 w-4" />
            머릿돌
          </button>
          <button
            type="button"
            aria-pressed={activeTab === "schedule"}
            onClick={() => {
              setActiveTab("schedule");
              setExpandedClass(null);
              setExpandedStudent(null);
            }}
            className={cn(
              "flex min-h-12 items-center justify-center gap-1 rounded-xl px-1 text-sm font-extrabold leading-tight transition active:scale-[0.98]",
              activeTab === "schedule"
                ? "bg-violet-500 text-white shadow"
                : "text-slate-400 hover:text-white"
            )}
          >
            <CalendarDays className="h-4 w-4" />
            계획표
          </button>
          <button
            type="button"
            aria-pressed={activeTab === "lesson"}
            onClick={() => {
              setActiveTab("lesson");
              setExpandedClass(null);
              setExpandedStudent(null);
            }}
            className={cn(
              "flex min-h-12 items-center justify-center gap-1 rounded-xl px-1 text-sm font-extrabold leading-tight transition active:scale-[0.98]",
              activeTab === "lesson"
                ? "bg-rose-500 text-white shadow"
                : "text-slate-400 hover:text-white"
            )}
          >
            <PlayCircle className="h-4 w-4" />
            공과
          </button>
        </div>
      </section>

      {activeTab === "notice" ? (
        <NoticeManager
          notices={notices}
          title={noticeTitle}
          content={noticeContent}
          shouldPopup={noticeShouldPopup}
          weeklyPhotos={weeklyPhotos}
          weeklyPhotoTitle={weeklyPhotoTitle}
          onTitleChange={setNoticeTitle}
          onContentChange={setNoticeContent}
          onShouldPopupChange={setNoticeShouldPopup}
          onWeeklyPhotoTitleChange={setWeeklyPhotoTitle}
          onAddWeeklyPhoto={handleAddWeeklyPhoto}
          onDeleteWeeklyPhoto={handleDeleteWeeklyPhoto}
          onAdd={handleAddNotice}
          onDelete={handleDeleteNotice}
        />
      ) : activeTab === "foundation" ? (
        <FoundationManager
          materials={foundationMaterials}
          title={foundationTitle}
          onTitleChange={setFoundationTitle}
          onAdd={handleAddFoundationMaterial}
          onActivate={handleActivateFoundationMaterial}
          onDelete={handleDeleteFoundationMaterial}
        />
      ) : activeTab === "schedule" ? (
        <ScheduleManager
          images={scheduleImages}
          title={scheduleTitle}
          onTitleChange={setScheduleTitle}
          onAdd={handleAddScheduleImage}
          onActivate={handleActivateScheduleImage}
          onDelete={handleDeleteScheduleImage}
        />
      ) : activeTab === "lesson" ? (
        <LessonVideoManager
          videos={lessonVideos}
          title={lessonVideoTitle}
          url={lessonVideoUrl}
          description={lessonVideoDescription}
          onTitleChange={setLessonVideoTitle}
          onUrlChange={setLessonVideoUrl}
          onDescriptionChange={setLessonVideoDescription}
          onAdd={handleAddLessonVideo}
          onDelete={handleDeleteLessonVideo}
        />
      ) : (
        <>
          {/* 통계 카드 */}
          <section className="grid grid-cols-3 gap-3 px-5 pt-2">
            <StatCard icon={<Users className="h-5 w-5" />} label="전체 학생" value={`${totalStudents}명`} color="blue" />
            <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="제출 완료" value={`${submittedStudents}명`} color="green" />
            <StatCard icon={<BookOpen className="h-5 w-5" />} label="표시 반" value={`${visibleClasses}반`} color="amber" />
          </section>

          {/* 반별 아코디언 */}
          <section className="mt-6 px-5">
        <h2 className="mb-3 text-base font-extrabold text-slate-300">
          {mode === "festival" ? "📋 암송잔치 반별 현황" : "🌱 유치부 반별 현황"}
        </h2>
        <div className="flex flex-col gap-3">
          {classIds.length === 0 && (
            <div className="rounded-2xl bg-slate-800 px-4 py-8 text-center text-sm font-bold text-slate-500 ring-1 ring-slate-700">
              {mode === "festival" ? "아직 최종 제출된 학생이 없습니다." : "아직 표시할 학생 정보가 없습니다."}
            </div>
          )}
          {classIds.map((classId) => {
            const group = classGroups[classId];
            const isExpanded = expandedClass === classId;
            const avgRecitation = Math.round(group.students.reduce((sum, s) => sum + countSuccess(s.lessonStates), 0) / group.students.length * 10) / 10;
            const avgQuiz = Math.round(group.students.reduce((sum, s) => sum + countSuccess(s.quizStates), 0) / group.students.length * 10) / 10;

            return (
              <div key={classId} className="overflow-hidden rounded-2xl bg-slate-800 ring-1 ring-slate-700">
                {/* 반 헤더 */}
                <button
                  type="button"
                  onClick={() => setExpandedClass(isExpanded ? null : classId)}
                  className="flex w-full items-center justify-between px-4 py-3.5 text-left transition hover:bg-slate-700/50 active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg text-sm font-extrabold",
                      "bg-emerald-500/20 text-emerald-400"
                    )}>
                      ✓
                    </span>
                    <div>
                      <p className="text-sm font-extrabold text-white">{group.className}</p>
                      <p className="text-xs text-slate-400">
                        {group.teacherName || "담당"} 선생님 · {mode === "festival" ? "제출" : "학생"} {group.students.length}명
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden text-right sm:block">
                      <p className="text-xs text-slate-400">평균 암송 <span className="font-bold text-emerald-400">{avgRecitation}</span>/{TOTAL_RECITATIONS}</p>
                      <p className="text-xs text-slate-400">평균 퀴즈 <span className="font-bold text-sky-400">{avgQuiz}</span>/{TOTAL_QUIZZES}</p>
                    </div>
                    {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                  </div>
                </button>

                {/* 학생 목록 */}
                {isExpanded && (
                  <div className="border-t border-slate-700 px-4 pb-4 pt-3">
                    <div className="flex flex-col gap-2">
                      {group.students.map((student) => {
                          const recitationScore = countSuccess(student.lessonStates);
                          const quizScore = countSuccess(student.quizStates);
                          const attendanceCount = countKindergartenActivity(student, "KINDERGARTEN_ATTENDANCE");
                          const foundationCount = countKindergartenActivity(student, "KINDERGARTEN_FOUNDATION");
                          const kindergartenRecitationCount = countKindergartenActivity(student, "KINDERGARTEN_RECITATION");
                          const isStudentExpanded = expandedStudent === student.studentId;

                          return (
                            <div key={student.studentId} className="overflow-hidden rounded-xl bg-slate-900/60 ring-1 ring-slate-700/50">
                              <button
                                type="button"
                                onClick={() => setExpandedStudent(isStudentExpanded ? null : student.studentId)}
                                className="flex w-full items-center justify-between px-3 py-2.5 text-left transition hover:bg-slate-700/30"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="h-9 w-9 overflow-hidden rounded-full border-2 border-slate-600 bg-white">
                                    <img
                                      src={resolveMediaUrl(student.photoUrl) || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(student.name)}&backgroundColor=ffecb3,cdefc4,cde7fb`}
                                      alt={student.name} className="h-full w-full object-cover" draggable={false}
                                    />
                                  </div>
                                  <div>
                                    <span className="text-sm font-bold text-white">{student.name}</span>
                                    {mode === "kindergarten" ? (
                                      <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                                        출석 {toPercent(attendanceCount)}% · 머릿돌 {toPercent(foundationCount)}% · 암송 {toPercent(kindergartenRecitationCount)}%
                                      </p>
                                    ) : (
                                      <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                                        암송 {recitationScore}/{TOTAL_RECITATIONS} · 퀴즈 {quizScore}/{TOTAL_QUIZZES}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  {mode === "festival" && (
                                    <>
                                      <span className="flex items-center gap-1 text-xs font-bold">
                                        <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
                                        <span className="text-emerald-400">{recitationScore}</span>
                                        <span className="text-slate-500">/{TOTAL_RECITATIONS}</span>
                                      </span>
                                      <span className="flex items-center gap-1 text-xs font-bold">
                                        <HelpCircle className="h-3.5 w-3.5 text-sky-400" />
                                        <span className="text-sky-400">{quizScore}</span>
                                        <span className="text-slate-500">/{TOTAL_QUIZZES}</span>
                                      </span>
                                    </>
                                  )}
                                  {mode === "kindergarten" && (
                                    <span className="flex items-center gap-1 text-xs font-bold">
                                      <span className="text-emerald-400">총 {attendanceCount + foundationCount + kindergartenRecitationCount}</span>
                                      <span className="text-slate-500">/156</span>
                                    </span>
                                  )}
                                  {isStudentExpanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                                </div>
                              </button>

                              {/* 상세 과별 현황 */}
                              {isStudentExpanded && (
                                <div className="border-t border-slate-700/50 px-3 pb-3 pt-2">
                                  {mode === "kindergarten" && (
                                    <>
                                      <div className="flex gap-2 mb-4 bg-slate-800 p-1 rounded-xl ring-1 ring-slate-700/50">
                                        <button
                                          type="button"
                                          onClick={() => setSubTab("check")}
                                          className={cn(
                                            "flex-1 h-9 rounded-lg text-xs font-bold transition",
                                            subTab === "check"
                                              ? "bg-slate-700 text-white shadow-sm ring-1 ring-slate-600"
                                              : "text-slate-400 hover:text-white"
                                          )}
                                        >
                                          활동 체크
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setSubTab("chart")}
                                          className={cn(
                                            "flex-1 h-9 rounded-lg text-xs font-bold transition",
                                            subTab === "chart"
                                              ? "bg-slate-700 text-white shadow-sm ring-1 ring-slate-600"
                                              : "text-slate-400 hover:text-white"
                                          )}
                                        >
                                          진행 현황 (원그래프)
                                        </button>
                                      </div>

                                      {subTab === "check" ? (
                                        <div className="space-y-4">
                                          <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-900/60 p-1 ring-1 ring-slate-800">
                                            {KINDERGARTEN_BOOKS.map((book) => {
                                              const active = selectedBookId === book.id;
                                              return (
                                                <button
                                                  key={book.id}
                                                  type="button"
                                                  onClick={() => setSelectedBookId(book.id)}
                                                  className={cn(
                                                    "h-8 rounded-lg px-1 text-center text-[11px] font-bold transition",
                                                    active
                                                      ? "bg-slate-800 text-emerald-400 shadow-sm ring-1 ring-slate-700"
                                                      : "text-slate-400 hover:text-slate-200"
                                                  )}
                                                >
                                                  {book.title}
                                                </button>
                                              );
                                            })}
                                          </div>

                                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                            {(() => {
                                              const book = KINDERGARTEN_BOOKS.find(b => b.id === selectedBookId) ?? KINDERGARTEN_BOOKS[0];
                                              const lessons = Array.from({ length: book.end - book.start + 1 }, (_, i) => book.start + i);
                                              return lessons.map((lesson) => {
                                                const states = student.kindergartenActivityStates ?? {};
                                                return (
                                                  <div key={lesson} className="flex flex-col gap-2 rounded-xl bg-slate-900/40 p-3 ring-1 ring-slate-800/80">
                                                    <div className="flex justify-between items-center">
                                                      <span className="text-xs font-extrabold text-slate-300">
                                                        {lesson}과: {LESSON_TITLES[lesson]}
                                                      </span>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2">
                                                      {KINDERGARTEN_ACTIVITY_TYPES.map((activity) => {
                                                        const activeKey = `${lesson}:${activity.key}`;
                                                        const isChecked = states[activeKey] === "success";
                                                        return (
                                                          <button
                                                            key={activity.key}
                                                            type="button"
                                                            onClick={() => handleToggleKindergartenActivity(student.studentId, lesson, activity.key, isChecked)}
                                                            className={cn(
                                                              "flex h-9 items-center justify-center rounded-xl text-xs font-bold transition active:scale-95",
                                                              isChecked && activity.color === "amber" && "bg-amber-500 text-white shadow-sm",
                                                              isChecked && activity.color === "emerald" && "bg-emerald-500 text-white shadow-sm",
                                                              isChecked && activity.color === "sky" && "bg-sky-500 text-white shadow-sm",
                                                              !isChecked && "bg-slate-800 text-slate-400 hover:text-slate-200 ring-1 ring-slate-700/60"
                                                            )}
                                                          >
                                                            {activity.label}
                                                          </button>
                                                        );
                                                      })}
                                                    </div>
                                                  </div>
                                                );
                                              });
                                            })()}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="grid grid-cols-3 gap-2">
                                          {KINDERGARTEN_ACTIVITY_TYPES.map((activity) => {
                                            const count = countKindergartenActivity(student, activity.key);
                                            return (
                                              <ActivityDonut
                                                key={activity.key}
                                                label={activity.label}
                                                count={count}
                                                total={TOTAL_KINDERGARTEN_LESSONS}
                                                color={activity.color}
                                              />
                                            );
                                          })}
                                        </div>
                                      )}
                                    </>
                                  )}

                                  {mode === "festival" && (
                                    <>
                                      <p className="mb-2 text-xs font-bold text-emerald-400">📖 암송 (성공 {recitationScore}/{TOTAL_RECITATIONS})</p>
                                      <div className="mb-3 grid grid-cols-8 gap-1">
                                        {Array.from({ length: TOTAL_RECITATIONS }, (_, i) => i + 1).map((n) => {
                                          const st = student.lessonStates[n];
                                          return (
                                            <div key={n} className={cn(
                                              "flex h-8 items-center justify-center rounded-lg text-[11px] font-extrabold",
                                              st === "success" ? "bg-emerald-500/30 text-emerald-300" : st === "fail" ? "bg-red-500/30 text-red-300" : "bg-slate-700 text-slate-500"
                                            )}>
                                              {n}
                                            </div>
                                          );
                                        })}
                                      </div>
                                      <p className="mb-2 text-xs font-bold text-sky-400">❓ 퀴즈 (정답 {quizScore}/{TOTAL_QUIZZES})</p>
                                      <div className="grid grid-cols-8 gap-1">
                                        {Array.from({ length: TOTAL_QUIZZES }, (_, i) => i + 1).map((n) => {
                                          const st = student.quizStates[n];
                                          return (
                                            <div key={n} className={cn(
                                              "flex h-8 items-center justify-center rounded-lg text-[11px] font-extrabold",
                                              st === "success" ? "bg-sky-500/30 text-sky-300" : st === "fail" ? "bg-red-500/30 text-red-300" : "bg-slate-700 text-slate-500"
                                            )}>
                                              {n}
                                            </div>
                                          );
                                        })}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleUnlock(student)}
                                        disabled={unlockingStudentId === student.studentId}
                                        className="mt-3 h-10 w-full rounded-xl bg-amber-500/15 text-sm font-extrabold text-amber-300 ring-1 ring-amber-500/30 transition hover:bg-amber-500/25 active:scale-[0.99] disabled:opacity-60"
                                      >
                                        {unlockingStudentId === student.studentId ? "해제 중..." : "수정 허용"}
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
          </section>
        </>
      )}
      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-5">
          <div
            className={cn(
              "rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-lg",
              toast.kind === "success" ? "bg-emerald-600" : "bg-red-500"
            )}
            role="status"
          >
            {toast.text}
          </div>
        </div>
      )}
    </main>
  );
}

function NoticeManager({
  notices,
  title,
  content,
  shouldPopup,
  weeklyPhotos,
  weeklyPhotoTitle,
  onTitleChange,
  onContentChange,
  onShouldPopupChange,
  onWeeklyPhotoTitleChange,
  onAddWeeklyPhoto,
  onDeleteWeeklyPhoto,
  onAdd,
  onDelete,
}: {
  notices: AdminNotice[];
  title: string;
  content: string;
  shouldPopup: boolean;
  weeklyPhotos: WeeklyPhoto[];
  weeklyPhotoTitle: string;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onShouldPopupChange: (value: boolean) => void;
  onWeeklyPhotoTitleChange: (value: string) => void;
  onAddWeeklyPhoto: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteWeeklyPhoto: (photoId: string) => void;
  onAdd: (event: React.FormEvent<HTMLFormElement>) => void;
  onDelete: (noticeId: string) => void;
}) {
  return (
    <section className="px-5 pt-4">
      <form onSubmit={onAdd} className="rounded-2xl bg-slate-800 p-4 ring-1 ring-slate-700">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-extrabold text-white">새 공지 작성</h2>
            <p className="mt-0.5 text-xs font-bold text-slate-500">공지 글을 추가하면 아래 목록에 최신순으로 표시됩니다.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-center">
            <button
              type="button"
              onClick={() => onShouldPopupChange(!shouldPopup)}
              aria-pressed={shouldPopup}
              className={cn(
                "flex h-12 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-extrabold shadow transition active:scale-95",
                shouldPopup
                  ? "bg-amber-400 text-slate-900 hover:bg-amber-300"
                  : "bg-slate-700 text-slate-400 shadow-none ring-1 ring-slate-600 hover:text-slate-200"
              )}
            >
              <Megaphone className="h-4 w-4" />
              공지
            </button>
            <button
              type="submit"
              className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-sky-500 px-3 text-sm font-extrabold text-white shadow transition hover:bg-sky-400 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              추가
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="공지 제목"
            aria-label="공지 제목"
            className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-sky-400"
          />
          <textarea
            value={content}
            onChange={(event) => onContentChange(event.target.value)}
            placeholder="공지 내용"
            aria-label="공지 내용"
            rows={4}
            className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-base font-bold leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-sky-400"
          />
        </div>
      </form>

      <section className="mt-5 rounded-2xl bg-slate-800 p-4 ring-1 ring-slate-700">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-white">이번 주 유치부 사진</h2>
            <p className="mt-0.5 text-xs font-bold text-slate-500">사진을 추가하면 선생님 시작 화면의 슬라이드에 표시됩니다.</p>
          </div>
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-extrabold text-slate-400 ring-1 ring-slate-700">
            {weeklyPhotos.length}장
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            value={weeklyPhotoTitle}
            onChange={(event) => onWeeklyPhotoTitleChange(event.target.value)}
            placeholder="사진 제목 또는 설명"
            aria-label="사진 제목 또는 설명"
            className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
          />
          <label className="flex h-12 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 text-sm font-extrabold text-white shadow transition hover:bg-emerald-400 active:scale-95 focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-3 focus-within:outline-sky-400">
            <Upload className="h-4 w-4" />
            사진 추가
            <input type="file" accept="image/*" onChange={onAddWeeklyPhoto} className="sr-only" aria-label="이번 주 유치부 사진 파일 선택" />
          </label>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {weeklyPhotos.length === 0 && (
            <div className="rounded-2xl bg-slate-900/60 px-4 py-8 text-center ring-1 ring-slate-700/60 sm:col-span-2">
              <ImageIcon className="mx-auto h-8 w-8 text-slate-600" />
              <p className="mt-3 text-sm font-extrabold text-slate-400">등록된 사진이 없습니다.</p>
            </div>
          )}
          {weeklyPhotos.map((photo) => (
            <article key={photo.id} className="overflow-hidden rounded-2xl bg-slate-900/60 ring-1 ring-slate-700/60">
              <div className="aspect-[4/3] bg-slate-900">
                <img src={photo.imageUrl} alt={photo.title} className="h-full w-full object-cover" />
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-extrabold text-white">{photo.title}</p>
                <p className="mt-1 text-[11px] font-bold text-slate-500">
                  {new Intl.DateTimeFormat("ko-KR", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  }).format(new Date(photo.createdAt))}
                </p>
                <button
                  type="button"
                  onClick={() => onDeleteWeeklyPhoto(photo.id)}
                  className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-red-500/10 text-sm font-extrabold text-red-300 ring-1 ring-red-500/25 transition hover:bg-red-500/20 active:scale-95"
                >
                  <Trash2 className="h-4 w-4" />
                  삭제
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-5 flex items-center justify-between">
        <h2 className="text-base font-extrabold text-slate-300">공지 글 목록</h2>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-extrabold text-slate-400 ring-1 ring-slate-700">
          {notices.length}개
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {notices.length === 0 && (
          <div className="rounded-2xl bg-slate-800 px-4 py-10 text-center ring-1 ring-slate-700">
            <Megaphone className="mx-auto h-8 w-8 text-slate-600" />
            <p className="mt-3 text-sm font-extrabold text-slate-400">등록된 공지사항이 없습니다.</p>
          </div>
        )}
        {notices.map((notice) => (
          <article key={notice.id} className="rounded-2xl bg-slate-800 p-4 ring-1 ring-slate-700">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="break-words text-base font-extrabold text-white">{notice.title}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold text-slate-500">
                    {new Intl.DateTimeFormat("ko-KR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(notice.createdAt))}
                  </p>
                  {notice.showToTeachers && (
                    <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-extrabold text-amber-300 ring-1 ring-amber-400/30">
                      선생님 팝업
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDelete(notice.id)}
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-red-500/10 px-3 text-xs font-extrabold text-red-300 ring-1 ring-red-500/25 transition hover:bg-red-500/20 active:scale-95"
              >
                <Trash2 className="h-4 w-4" />
                삭제
              </button>
            </div>
            <p className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-slate-900/60 p-3 text-sm font-bold leading-6 text-slate-300 ring-1 ring-slate-700/60">
              {notice.content}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FoundationManager({
  materials,
  title,
  onTitleChange,
  onAdd,
  onActivate,
  onDelete,
}: {
  materials: FoundationMaterial[];
  title: string;
  onTitleChange: (value: string) => void;
  onAdd: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onActivate: (materialId: string) => void;
  onDelete: (materialId: string) => void;
}) {
  return (
    <section className="px-5 pt-4">
      <section className="rounded-2xl bg-slate-800 p-4 ring-1 ring-slate-700">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-white">머릿돌 PDF 업로드</h2>
            <p className="mt-0.5 text-xs font-bold leading-5 text-slate-500">
              PDF를 추가하면 선생님 화면의 머릿돌 탭에서 현재 선택된 자료가 표시됩니다.
            </p>
          </div>
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-extrabold text-slate-400 ring-1 ring-slate-700">
            {materials.length}개
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="예: 2026년 5월 4주 머릿돌"
            aria-label="머릿돌 제목"
            className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
          />
          <label className="flex h-12 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 text-sm font-extrabold text-white shadow transition hover:bg-emerald-400 active:scale-95 focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-3 focus-within:outline-sky-400">
            <Upload className="h-4 w-4" />
            PDF 추가
            <input type="file" accept="application/pdf" onChange={onAdd} className="sr-only" aria-label="머릿돌 PDF 파일 선택" />
          </label>
        </div>

        <p className="mt-3 rounded-xl bg-slate-900/70 px-3 py-2 text-xs font-bold leading-5 text-slate-400 ring-1 ring-slate-700/60">
          현재는 테스트용으로 브라우저 localStorage에 저장됩니다. 실제 배포에서는 PDF 파일을 서버/스토리지에 올리고 DB에는 파일 URL만 저장하는 방식으로 바꾸는 것이 좋습니다.
        </p>
      </section>

      <div className="mt-5 flex items-center justify-between">
        <h2 className="text-base font-extrabold text-slate-300">등록된 머릿돌</h2>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-extrabold text-slate-400 ring-1 ring-slate-700">
          현재 {materials.find((material) => material.isActive)?.title ?? "없음"}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {materials.length === 0 && (
          <div className="rounded-2xl bg-slate-800 px-4 py-10 text-center ring-1 ring-slate-700">
            <FileText className="mx-auto h-8 w-8 text-slate-600" />
            <p className="mt-3 text-sm font-extrabold text-slate-400">등록된 머릿돌 PDF가 없습니다.</p>
          </div>
        )}
        {materials.map((material) => (
          <article key={material.id} className="rounded-2xl bg-slate-800 p-4 ring-1 ring-slate-700">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="break-words text-base font-extrabold text-white">{material.title}</h3>
                  {material.isActive && (
                    <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-extrabold text-emerald-300 ring-1 ring-emerald-400/30">
                      현재 표시 중
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-xs font-bold text-slate-500">{material.fileName}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {new Intl.DateTimeFormat("ko-KR", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(material.createdAt))}
                </p>
              </div>
              <FileText className="h-5 w-5 shrink-0 text-emerald-300" />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onActivate(material.id)}
                disabled={material.isActive}
                className="flex h-11 items-center justify-center rounded-xl bg-emerald-500/15 px-2 text-xs font-extrabold text-emerald-300 ring-1 ring-emerald-500/25 transition hover:bg-emerald-500/25 active:scale-95 disabled:opacity-50"
              >
                활성화
              </button>
              <a
                href={material.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-11 items-center justify-center gap-1 rounded-xl bg-slate-900 px-2 text-xs font-extrabold text-slate-300 ring-1 ring-slate-700 transition hover:text-white active:scale-95"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                열기
              </a>
              <button
                type="button"
                onClick={() => onDelete(material.id)}
                className="flex h-11 items-center justify-center gap-1 rounded-xl bg-red-500/10 px-2 text-xs font-extrabold text-red-300 ring-1 ring-red-500/25 transition hover:bg-red-500/20 active:scale-95"
              >
                <Trash2 className="h-3.5 w-3.5" />
                삭제
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ScheduleManager({
  images,
  title,
  onTitleChange,
  onAdd,
  onActivate,
  onDelete,
}: {
  images: ScheduleImage[];
  title: string;
  onTitleChange: (value: string) => void;
  onAdd: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onActivate: (imageId: string) => void;
  onDelete: (imageId: string) => void;
}) {
  return (
    <section className="px-5 pt-4">
      <section className="rounded-2xl bg-slate-800 p-4 ring-1 ring-slate-700">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-white">계획표 이미지 업로드</h2>
            <p className="mt-0.5 text-xs font-bold leading-5 text-slate-500">
              이미지를 추가하면 선생님 화면의 계획표 탭에 현재 선택된 이미지가 표시됩니다.
            </p>
          </div>
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-extrabold text-slate-400 ring-1 ring-slate-700">
            {images.length}개
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="예: 2026년 6월 유치부 계획표"
            aria-label="계획표 제목"
            className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400"
          />
          <label className="flex h-12 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-violet-500 px-4 text-sm font-extrabold text-white shadow transition hover:bg-violet-400 active:scale-95 focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-3 focus-within:outline-sky-400">
            <Upload className="h-4 w-4" />
            이미지 추가
            <input type="file" accept="image/*" onChange={onAdd} className="sr-only" aria-label="계획표 이미지 파일 선택" />
          </label>
        </div>

        <p className="mt-3 rounded-xl bg-slate-900/70 px-3 py-2 text-xs font-bold leading-5 text-slate-400 ring-1 ring-slate-700/60">
          모바일에서 보기 좋도록 세로형 이미지나 글자가 큰 계획표 이미지를 권장합니다.
        </p>
      </section>

      <div className="mt-5 flex items-center justify-between">
        <h2 className="text-base font-extrabold text-slate-300">등록된 계획표</h2>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-extrabold text-slate-400 ring-1 ring-slate-700">
          현재 {images.find((image) => image.isActive)?.title ?? "없음"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {images.length === 0 && (
          <div className="rounded-2xl bg-slate-800 px-4 py-10 text-center ring-1 ring-slate-700 sm:col-span-2">
            <CalendarDays className="mx-auto h-8 w-8 text-slate-600" />
            <p className="mt-3 text-sm font-extrabold text-slate-400">등록된 계획표 이미지가 없습니다.</p>
          </div>
        )}
        {images.map((image) => (
          <article key={image.id} className="overflow-hidden rounded-2xl bg-slate-800 ring-1 ring-slate-700">
            <div className="aspect-[3/4] bg-slate-900">
              <img src={image.imageUrl} alt={image.title} className="h-full w-full object-contain" />
            </div>
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="break-words text-base font-extrabold text-white">{image.title}</h3>
                {image.isActive && (
                  <span className="rounded-full bg-violet-400/15 px-2 py-0.5 text-[11px] font-extrabold text-violet-300 ring-1 ring-violet-400/30">
                    현재 표시 중
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-xs font-bold text-slate-500">{image.fileName}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {new Intl.DateTimeFormat("ko-KR", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(image.createdAt))}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onActivate(image.id)}
                  disabled={image.isActive}
                  className="flex h-11 items-center justify-center rounded-xl bg-violet-500/15 px-2 text-xs font-extrabold text-violet-300 ring-1 ring-violet-500/25 transition hover:bg-violet-500/25 active:scale-95 disabled:opacity-50"
                >
                  활성화
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(image.id)}
                  className="flex h-11 items-center justify-center gap-1 rounded-xl bg-red-500/10 px-2 text-xs font-extrabold text-red-300 ring-1 ring-red-500/25 transition hover:bg-red-500/20 active:scale-95"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  삭제
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function LessonVideoManager({
  videos,
  title,
  url,
  description,
  onTitleChange,
  onUrlChange,
  onDescriptionChange,
  onAdd,
  onDelete,
}: {
  videos: LessonVideo[];
  title: string;
  url: string;
  description: string;
  onTitleChange: (value: string) => void;
  onUrlChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onAdd: (event: React.FormEvent<HTMLFormElement>) => void;
  onDelete: (videoId: string) => void;
}) {
  return (
    <section className="px-5 pt-4">
      <form onSubmit={onAdd} className="rounded-2xl bg-slate-800 p-4 ring-1 ring-slate-700">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-white">공과 영상 링크 추가</h2>
            <p className="mt-0.5 text-xs font-bold leading-5 text-slate-500">
              유튜브 링크를 추가하면 선생님 화면의 공과 자료실에서 언제든 다시 볼 수 있습니다.
            </p>
          </div>
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-extrabold text-slate-400 ring-1 ring-slate-700">
            {videos.length}개
          </span>
        </div>

        <div className="grid gap-2">
          <input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="예: 6월 1주차 공과 - 보이지 않는 하나님"
            aria-label="공과 제목"
            className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-rose-400"
          />
          <input
            value={url}
            onChange={(event) => onUrlChange(event.target.value)}
            placeholder="유튜브 링크 또는 영상 ID"
            aria-label="유튜브 링크 또는 영상 ID"
            className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-rose-400"
          />
          <textarea
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="설명 또는 메모"
            aria-label="공과 설명"
            rows={3}
            className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-base font-bold leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-rose-400"
          />
          <button
            type="submit"
            className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-rose-500 px-4 text-sm font-extrabold text-white shadow transition hover:bg-rose-400 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            공과 추가
          </button>
        </div>
      </form>

      <div className="mt-5 flex items-center justify-between">
        <h2 className="text-base font-extrabold text-slate-300">등록된 공과 영상</h2>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-extrabold text-slate-400 ring-1 ring-slate-700">
          {videos.length}개
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {videos.length === 0 && (
          <div className="rounded-2xl bg-slate-800 px-4 py-10 text-center ring-1 ring-slate-700 sm:col-span-2">
            <PlayCircle className="mx-auto h-8 w-8 text-slate-600" />
            <p className="mt-3 text-sm font-extrabold text-slate-400">등록된 공과 영상이 없습니다.</p>
          </div>
        )}
        {videos.map((video) => (
          <article key={video.id} className="overflow-hidden rounded-2xl bg-slate-800 ring-1 ring-slate-700">
            <div className="aspect-video bg-slate-900">
              <img
                src={`https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`}
                alt={`${video.title} 썸네일`}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="p-4">
              <h3 className="break-words text-base font-extrabold text-white">{video.title}</h3>
              {video.description && (
                <p className="mt-2 line-clamp-2 whitespace-pre-wrap break-words text-sm font-bold leading-6 text-slate-400">
                  {video.description}
                </p>
              )}
              <p className="mt-2 text-xs font-bold text-slate-500">
                {new Intl.DateTimeFormat("ko-KR", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                }).format(new Date(video.createdAt))}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <a
                  href={`https://www.youtube.com/watch?v=${video.videoId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 items-center justify-center gap-1 rounded-xl bg-slate-900 px-2 text-xs font-extrabold text-slate-300 ring-1 ring-slate-700 transition hover:text-white active:scale-95"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  열기
                </a>
                <button
                  type="button"
                  onClick={() => onDelete(video.id)}
                  className="flex h-11 items-center justify-center gap-1 rounded-xl bg-red-500/10 px-2 text-xs font-extrabold text-red-300 ring-1 ring-red-500/25 transition hover:bg-red-500/20 active:scale-95"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  삭제
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: "blue" | "green" | "amber" }) {
  const colors = {
    blue: "from-sky-500/20 to-sky-600/20 text-sky-400 ring-sky-500/30",
    green: "from-emerald-500/20 to-emerald-600/20 text-emerald-400 ring-emerald-500/30",
    amber: "from-amber-500/20 to-amber-600/20 text-amber-400 ring-amber-500/30",
  };
  return (
    <div className={cn("flex flex-col items-center gap-1 rounded-2xl bg-gradient-to-br p-3 ring-1", colors[color])}>
      {icon}
      <span className="text-lg font-extrabold">{value}</span>
      <span className="text-[10px] font-bold text-slate-400">{label}</span>
    </div>
  );
}

function ActivityDonut({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: "amber" | "emerald" | "sky";
}) {
  const percent = toPercent(count, total);
  const colorMap = {
    amber: { fill: "#f59e0b", text: "text-amber-300", ring: "ring-amber-500/25" },
    emerald: { fill: "#10b981", text: "text-emerald-300", ring: "ring-emerald-500/25" },
    sky: { fill: "#38bdf8", text: "text-sky-300", ring: "ring-sky-500/25" },
  }[color];

  return (
    <div className={cn("rounded-2xl bg-slate-800/80 p-3 text-center ring-1", colorMap.ring)}>
      <div
        className="mx-auto grid h-16 w-16 place-items-center rounded-full"
        style={{
          background: `conic-gradient(${colorMap.fill} ${percent * 3.6}deg, #334155 0deg)`,
        }}
        aria-label={`${label} ${percent}%`}
      >
        <div className="grid h-11 w-11 place-items-center rounded-full bg-slate-900">
          <span className={cn("text-sm font-extrabold", colorMap.text)}>{percent}%</span>
        </div>
      </div>
      <p className="mt-2 text-xs font-extrabold text-white">{label}</p>
      <p className="mt-0.5 text-[10px] font-bold text-slate-500">{count}/{total}</p>
    </div>
  );
}
