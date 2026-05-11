"use client";

/**
 * TeacherCheckView
 * ----------------
 * 유치부 교사가 한 손으로 조작하는 모바일 암송 체크 화면.
 *
 * 레이아웃 원칙
 *  - 상단 헤더(반 이름 · 타이틀) → 중앙 상단 프로필 → 학생 프로필 그리드 → 하단 고정 액션 바
 *  - 히트 에어리어 최소 56px, 주요 액션은 화면 하단에 고정
 *  - 색 대비는 AA 이상 유지하되, 전체 톤은 파스텔로 부드럽게
 *  - 반 선택은 StartView 에서 완료되며, 이 화면은 고정된 반 하나만 다룬다.
 *
 * 학생 선택 UX
 *  - 중앙 상단의 큰 원형 프로필은 "지금 누구를 보고 있는지"만 보여준다 — 탭 기능 없음.
 *  - 아래 프로필 그리드를 탭하면 해당 학생의 과(1~16) 선택 팝업이 뜬다.
 *  - 팝업에서 "완료" 를 누르면 선택한 과 목록과 함께 성공 표시되고,
 *    프로필에 초록색 원 + 체크 아이콘이 팝 애니메이션으로 나타난다.
 *  - "뒤로" 는 변경 사항 없이 팝업만 닫는다.
 *
 * 데이터 흐름
 *  - 초기엔 더미 데이터로 UI 를 확인한다. API 연동은 `// TODO: API 연동` 지점에서
 *    lib/api.ts 의 함수를 호출해 교체.
 *  - 토글 결과는 낙관적 업데이트(optimistic update) 후 서버 응답으로 보정.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowLeft, X, AlertCircle, PartyPopper, BookOpen, HelpCircle, RefreshCw, Sparkles, Sun, Crown, Save } from "lucide-react";
import { cn } from "@/lib/cn";
import { api, resolveMediaUrl, type StudentRecitationDto } from "@/lib/api";

const TOTAL_RECITATIONS = 16;
const TOTAL_QUIZZES = 18;
const TOTAL_KINDERGARTEN_LESSONS = 52;
const TOTAL_KINDERGARTEN_ACTIVITIES = TOTAL_KINDERGARTEN_LESSONS * 3;
const KINDERGARTEN_BASE_UNLOCK_LESSON = 19;
const KINDERGARTEN_BASE_UNLOCK_DATE = new Date(2026, 4, 10);
type ToggleState = "success" | "fail" | undefined;

function nextToggleState(current: ToggleState): ToggleState {
  if (!current) return "success";
  if (current === "success") return "fail";
  return undefined;
}

// "4월 29일 (수)" 같은 친근한 한국어 날짜 — 헤더에서 선생님이 오늘 체크 중임을 한눈에 인지하도록
function todayLabel() {
  const d = new Date();
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

function getKindergartenAvailableLessonLimit(today = new Date()) {
  const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const daysSinceBase = Math.floor(
    (startOfDay(today) - startOfDay(KINDERGARTEN_BASE_UNLOCK_DATE)) / 86_400_000
  );
  const unlockedWeeks = Math.max(0, Math.floor(daysSinceBase / 7));
  return Math.min(
    TOTAL_KINDERGARTEN_LESSONS,
    KINDERGARTEN_BASE_UNLOCK_LESSON + unlockedWeeks
  );
}

type TeacherCheckViewProps = {
  initialClassId?: number;
  mode?: "festival" | "kindergarten";
};

export default function TeacherCheckView({ initialClassId, mode = "festival" }: TeacherCheckViewProps = {}) {
  const router = useRouter();
  const screenTitle = mode === "kindergarten" ? "유치부 체크" : "암송잔치";
  const screenSubtitle = mode === "kindergarten" ? "오늘 반별 체크" : "행사 암송 체크";

  // 교사 정보 로드
  const [teacherInfo, setTeacherInfo] = React.useState<any>(null);

  React.useEffect(() => {
    const info = localStorage.getItem("teacher_info");
    if (info) {
      setTeacherInfo(JSON.parse(info));
    } else {
      router.push("/");
    }
  }, [router]);

  const selectedClassId = teacherInfo?.classId || initialClassId || 1;
  const className = teacherInfo?.className || "반 정보 없음";

  const [students, setStudents] = React.useState<StudentRecitationDto[]>([]);
  const [activeStudentId, setActiveStudentId] = React.useState<number | null>(null);
  const [modalStudentId, setModalStudentId] = React.useState<number | null>(null);
  const [quizModalStudentId, setQuizModalStudentId] = React.useState<number | null>(null);
  const [kindergartenModalStudentId, setKindergartenModalStudentId] = React.useState<number | null>(null);
  const [actionStudentId, setActionStudentId] = React.useState<number | null>(null);
  const [submittingStudentId, setSubmittingStudentId] = React.useState<number | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  // 브라우저 기본 confirm/alert 대신 부드러운 모달/토스트로 대체
  const [submitConfirmStudentId, setSubmitConfirmStudentId] = React.useState<number | null>(null);
  const [toast, setToast] = React.useState<{ kind: "success" | "error"; text: string } | null>(null);

  // 토스트 자동 사라짐 (3초)
  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadStudents = React.useCallback(async (showToast = false) => {
    if (!teacherInfo) return;
    setRefreshing(true);
    try {
      const data = await api.getClassRecitations(selectedClassId);
      // 클라이언트에서 추가적인 success/quizSuccess 필드를 계산해준다
      const mapped = data.map(s => {
        const lCount = Object.keys(s.lessonStates || {}).length;
        const qCount = Object.keys(s.quizStates || {}).length;
        const kCount = Object.keys(s.kindergartenActivityStates || {}).length;
        return {
          ...s,
          success: lCount === TOTAL_RECITATIONS,
          quizSuccess: qCount === TOTAL_QUIZZES,
          kindergartenSuccess: kCount === TOTAL_KINDERGARTEN_ACTIVITIES
        };
      });
      setStudents(mapped);
      if (showToast) {
        setToast({ kind: "success", text: "최신 상태로 새로고침했어요." });
      }
    } catch (e) {
      console.error("학생 정보 로드 실패", e);
      if (showToast) {
        setToast({ kind: "error", text: "새로고침 중 오류가 발생했어요." });
      }
    } finally {
      setRefreshing(false);
    }
  }, [selectedClassId, teacherInfo]);

  // 선택된 반 학생 + 오늘 상태 로드
  React.useEffect(() => {
    if (!teacherInfo) return;
    loadStudents();
    setActiveStudentId(null);
    setModalStudentId(null);
    setQuizModalStudentId(null);
    setKindergartenModalStudentId(null);
    setActionStudentId(null);
  }, [loadStudents, selectedClassId, teacherInfo]);

  const activeStudent =
    students.find((s) => s.studentId === activeStudentId) ?? students[0] ?? null;
  const modalStudent =
    students.find((s) => s.studentId === modalStudentId) ?? null;
  const quizModalStudent =
    students.find((s) => s.studentId === quizModalStudentId) ?? null;
  const kindergartenModalStudent =
    students.find((s) => s.studentId === kindergartenModalStudentId) ?? null;
  const actionStudent =
    students.find((s) => s.studentId === actionStudentId) ?? null;
  const submitConfirmStudent =
    students.find((s) => s.studentId === submitConfirmStudentId) ?? null;

  // 모든 과(1~16)에 대해 success/fail 표시가 끝난 학생 수 — 진행률 표시용
  const isAllChecked = (states: Record<number, "success" | "fail"> | undefined, total: number) =>
    !!states && Object.keys(states).length === total;
  const recitationDone = students.filter((s) => isAllChecked(s.lessonStates, TOTAL_RECITATIONS)).length;
  const quizDone = students.filter((s) => isAllChecked(s.quizStates, TOTAL_QUIZZES)).length;
  const kindergartenDone = students.filter((s) => Object.keys(s.kindergartenActivityStates ?? {}).length === TOTAL_KINDERGARTEN_ACTIVITIES).length;
  const totalCount = students.length;

  // 학생 프로필 탭: 상단 프로필 동기화 + 액션 시트 오픈
  const handleSelect = (student: StudentRecitationDto) => {
    setActiveStudentId(student.studentId);
    if (mode === "festival" && student.submitted) return; // 제출된 기록은 수정 불가
    if (mode === "kindergarten") {
      setKindergartenModalStudentId(student.studentId);
      return;
    }
    setActionStudentId(student.studentId);
  };

  const handleModalClose = () => {
    setModalStudentId(null);
  };

  // 암송 팝업에서 뒤로가기 → 액션 시트로 복귀
  const handleModalBack = () => {
    const sid = modalStudentId;
    setModalStudentId(null);
    if (sid !== null) setActionStudentId(sid);
  };

  const handleActionClose = () => {
    setActionStudentId(null);
  };

  // 액션 시트에서 "암송" 선택 → 기존 과 선택 팝업 오픈
  const handleOpenRecitation = () => {
    if (actionStudentId === null) return;
    setModalStudentId(actionStudentId);
    setActionStudentId(null);
  };

  // 액션 시트에서 "퀴즈" 선택 → 퀴즈 팝업 오픈
  const handleOpenQuiz = () => {
    if (actionStudentId === null) return;
    setQuizModalStudentId(actionStudentId);
    setActionStudentId(null);
  };

  const handleQuizModalClose = () => {
    setQuizModalStudentId(null);
  };

  const handleKindergartenModalClose = () => {
    setKindergartenModalStudentId(null);
  };

  // 퀴즈 팝업에서 뒤로가기 → 액션 시트로 복귀
  const handleQuizModalBack = () => {
    const sid = quizModalStudentId;
    setQuizModalStudentId(null);
    if (sid !== null) setActionStudentId(sid);
  };

  // 퀴즈 팝업에서 개별 버튼을 누를 때마다 상태 즉시 업데이트
  const handleToggleQuiz = async (quizNum: number) => {
    if (!quizModalStudent) return;
    const studentId = quizModalStudent.studentId;
    const nextState = nextToggleState(quizModalStudent.quizStates?.[quizNum]);

    setStudents((prev) =>
      prev.map((s) => {
        if (s.studentId !== studentId) return s;
        const currentStates = s.quizStates || {};
        const newStates = { ...currentStates };
        if (nextState) newStates[quizNum] = nextState;
        else delete newStates[quizNum];

        const nextQuizSuccess = Array.from({ length: TOTAL_QUIZZES }, (_, i) => i + 1)
          .every((n) => newStates[n] !== undefined);

        return { ...s, quizStates: newStates, quizSuccess: nextQuizSuccess };
      })
    );

    try {
      await api.toggleRecitation(
        studentId,
        quizNum,
        "QUIZ",
        nextState === undefined ? null : nextState === 'success',
        teacherInfo?.id || 1
      );
    } catch (e) {
      console.error("퀴즈 API 저장 실패", e);
    }
  };

  // 팝업에서 개별 버튼을 누를 때마다 상태 즉시 업데이트
  const handleToggleLesson = async (lessonNum: number) => {
    if (!modalStudent) return;
    const studentId = modalStudent.studentId;
    const nextState = nextToggleState(modalStudent.lessonStates?.[lessonNum]);

    setStudents((prev) =>
      prev.map((s) => {
        if (s.studentId !== studentId) return s;
        const currentStates = s.lessonStates || {};
        const newStates = { ...currentStates };
        if (nextState) newStates[lessonNum] = nextState;
        else delete newStates[lessonNum];

        // 팝업창 안의 모든 버튼(1~16과)이 누락(흰색) 없이 모두 초록색 또는 빨간색으로 토글되면 완료 이벤트(success) 발동
        const nextSuccess = Array.from({ length: TOTAL_RECITATIONS }, (_, i) => i + 1)
          .every((n) => newStates[n] !== undefined);

        return { ...s, lessonStates: newStates, success: nextSuccess };
      })
    );

    try {
      await api.toggleRecitation(
        studentId,
        lessonNum,
        "RECITATION",
        nextState === undefined ? null : nextState === 'success',
        teacherInfo?.id || 1
      );
    } catch (e) {
      console.error("API 저장 실패", e);
    }
  };

  const handleToggleKindergartenActivity = async (lessonNum: number, activityType: string) => {
    if (!kindergartenModalStudent) return;
    if (lessonNum > getKindergartenAvailableLessonLimit()) return;
    const studentId = kindergartenModalStudent.studentId;
    const activityKey = `${lessonNum}:${activityType}`;
    const nextState = kindergartenModalStudent.kindergartenActivityStates?.[activityKey] ? undefined : "success";

    setStudents((prev) =>
      prev.map((s) => {
        if (s.studentId !== studentId) return s;
        const currentStates = s.kindergartenActivityStates || {};
        const newStates = { ...currentStates };
        if (nextState) newStates[activityKey] = nextState;
        else delete newStates[activityKey];

        return {
          ...s,
          kindergartenActivityStates: newStates,
          kindergartenSuccess: Object.keys(newStates).length === TOTAL_KINDERGARTEN_ACTIVITIES
        };
      })
    );

    try {
      await api.toggleRecitation(
        studentId,
        lessonNum,
        activityType,
        nextState === "success" ? true : null,
        teacherInfo?.id || 1
      );
    } catch (e) {
      console.error("유치부 체크 API 저장 실패", e);
    }
  };

  const hasAnyRecord = (student: StudentRecitationDto) =>
    Object.keys(student.lessonStates ?? {}).length > 0 ||
    Object.keys(student.quizStates ?? {}).length > 0;

  const handleSubmitClick = (student: StudentRecitationDto) => {
    if (submittingStudentId !== null || student.submitted || !hasAnyRecord(student)) return;
    setSubmitConfirmStudentId(student.studentId);
  };

  const handleSubmitConfirm = async () => {
    if (!submitConfirmStudent) return;
    const studentId = submitConfirmStudent.studentId;
    setSubmitConfirmStudentId(null);
    setSubmittingStudentId(studentId);
    try {
      const updated = await api.submitStudent(studentId);
      setStudents((prev) => prev.map((s) => (s.studentId === studentId ? {
        ...s,
        ...updated,
        success: isAllChecked(updated.lessonStates, TOTAL_RECITATIONS),
        quizSuccess: isAllChecked(updated.quizStates, TOTAL_QUIZZES)
      } : s)));
      setToast({ kind: "success", text: `${updated.name} 최종 제출 완료! 관리자 화면에 반영돼요.` });
    } catch (e) {
      setToast({ kind: "error", text: "제출 중 오류가 발생했어요. 다시 시도해 주세요." });
    } finally {
      setSubmittingStudentId(null);
    }
  };

  const handleBackToModeSelect = () => {
    router.replace("/");
  };

  return (
    <main className="relative mx-auto min-h-[100dvh] w-full max-w-md overflow-hidden bg-gradient-to-b from-pastel-cream via-pastel-yellow/30 to-pastel-pink/20 pb-36">
      {/* 배경 데코 — 부드러운 색 원형 블롭 */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 -left-10 h-48 w-48 rounded-full bg-pastel-yellow/40 blur-3xl" />
        <div className="absolute top-32 -right-12 h-40 w-40 rounded-full bg-pastel-pink/40 blur-3xl" />
        <div className="absolute top-[60%] -left-16 h-44 w-44 rounded-full bg-pastel-green/30 blur-3xl" />
      </div>

      {/* 상단: 반 이름 + 타이틀 */}
      <header className="sticky top-0 z-20 bg-pastel-cream/85 px-5 pb-3 pt-[max(env(safe-area-inset-top),1.25rem)] backdrop-blur">
        <div className="relative flex items-center justify-center">
          <div className="text-center">
            <p className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-pastel-yellowDeep shadow-sm ring-1 ring-pastel-yellow/60 sm:text-xs">
              <Sun className="h-3 w-3" />
              {todayLabel()} · {className}
            </p>
            <h1 className="mt-2 text-xl font-extrabold text-slate-800 sm:text-2xl">
              {screenTitle} <span className="ml-0.5">📖</span>
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              <span className="font-bold text-pastel-yellowDeep">{screenSubtitle}</span> · 학생을 눌러 <span className="font-bold text-pastel-greenDeep">암송</span> ·
              <span className="font-bold text-pastel-blueDeep"> 퀴즈</span>를 표시하세요
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadStudents(true)}
            disabled={refreshing}
            className="absolute left-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-white active:scale-95 disabled:opacity-60"
            aria-label="학생 목록 새로고침"
            title="새로고침"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </button>
          <button
            type="button"
            onClick={handleBackToModeSelect}
            className="absolute right-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-white active:scale-95"
            aria-label="화면 선택으로 이동"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* 중앙 상단: 선생님 프로필 영역 */}
      <section className="relative flex flex-col items-center justify-center px-5 pt-6 pb-2">
        <div className="relative flex flex-col items-center gap-2">
          {/* 프로필 둘레 빛나는 링 */}
          <div className="relative">
            <div aria-hidden className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-pastel-greenDeep via-pastel-yellowDeep to-pastel-blueDeep opacity-70 blur-[2px]" />
            <div className="relative h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-full border-[4px] border-white bg-white shadow-soft">
              {teacherInfo ? (
                <StudentAvatar name={teacherInfo.name} photoUrl={teacherInfo.photoUrl} />
              ) : (
                <StudentAvatar name="선생님" />
              )}
            </div>
            {/* 반짝 데코 */}
            <Sparkles aria-hidden className="absolute -right-1 -top-1 h-5 w-5 text-pastel-yellowDeep drop-shadow" />
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-sm font-extrabold text-slate-700">
              {teacherInfo ? `${teacherInfo.name} 선생님` : "선생님"}
            </span>
            <span className="text-[11px] text-slate-500">오늘도 화이팅이에요 💛</span>
          </div>
        </div>
      </section>

      {/* 학생 프로필 그리드 */}
      <section className="relative mt-5 px-4 sm:mt-6 sm:px-5" aria-label="학생 선택">
        {students.length === 0 ? (
          <div className="rounded-3xl bg-white/80 p-10 text-center shadow-soft ring-1 ring-pastel-yellow/40 backdrop-blur">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-pastel-yellow/60 text-2xl">
              🌱
            </div>
            <p className="text-sm font-bold text-slate-600">이 반의 학생 정보가 아직 없어요</p>
            <p className="mt-1 text-xs text-slate-400">관리자에게 학생 등록을 요청해 주세요</p>
          </div>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:gap-3">
            {students.map((s) => (
              <StudentTile
                key={s.studentId}
                student={s}
                mode={mode}
                active={s.studentId === activeStudent?.studentId}
                onTap={() => handleSelect(s)}
                onSubmit={() => handleSubmitClick(s)}
                submitting={submittingStudentId === s.studentId}
                canSubmit={hasAnyRecord(s)}
              />
            ))}
          </ul>
        )}
      </section>

      {/* 하단 고정 진행률 바 */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md rounded-t-3xl border-t border-pastel-yellowDeep/30 bg-white/95 px-5 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4 shadow-soft backdrop-blur"
        aria-label="진행률 영역"
      >
        {mode === "kindergarten" ? (
          <div className="mb-2">
            <ProgressBar
              icon={<BookOpen className="h-4 w-4" />}
              label="유치부 체크"
              done={kindergartenDone}
              total={totalCount}
              color="green"
            />
          </div>
        ) : (
          <div className="mb-2 grid grid-cols-2 gap-2">
            <ProgressBar
              icon={<BookOpen className="h-4 w-4" />}
              label="암송"
              done={recitationDone}
              total={totalCount}
              color="green"
            />
            <ProgressBar
              icon={<HelpCircle className="h-4 w-4" />}
              label="퀴즈"
              done={quizDone}
              total={totalCount}
              color="blue"
            />
          </div>
        )}
      </nav>

      {/* 액션 시트 (암송 / 퀴즈 선택) */}
      {actionStudent && (
        <StudentActionSheet
          student={actionStudent}
          onClose={handleActionClose}
          onRecitation={handleOpenRecitation}
          onQuiz={handleOpenQuiz}
        />
      )}

      {/* 과 선택 팝업 (암송) */}
      {modalStudent && (
        <StudentLessonModal
          student={modalStudent}
          onClose={handleModalClose}
          onBack={handleModalBack}
          onToggle={handleToggleLesson}
        />
      )}

      {/* 퀴즈 팝업 */}
      {quizModalStudent && (
        <StudentQuizModal
          student={quizModalStudent}
          onClose={handleQuizModalClose}
          onBack={handleQuizModalBack}
          onToggle={handleToggleQuiz}
        />
      )}

      {/* 유치부 체크 팝업 */}
      {kindergartenModalStudent && (
        <StudentKindergartenModal
          student={kindergartenModalStudent}
          onClose={handleKindergartenModalClose}
          onToggle={handleToggleKindergartenActivity}
        />
      )}

      {/* 제출 확인 모달 — 브라우저 confirm 대신 톤에 맞춘 다이얼로그 */}
      {mode === "festival" && submitConfirmStudent && (
        <ConfirmDialog
          title="최종 제출할까요?"
          description={`${submitConfirmStudent.name}의 오늘 암송 결과를\n제출 후에는 수정할 수 없어요.`}
          confirmText="제출하기"
          cancelText="다시 볼게요"
          onConfirm={handleSubmitConfirm}
          onCancel={() => setSubmitConfirmStudentId(null)}
        />
      )}

      {/* 토스트 — 성공/실패 알림 */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-32 z-50 flex justify-center px-5">
          <div
            className={cn(
              "pointer-events-auto flex max-w-md items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-soft animate-fade-in",
              toast.kind === "success" ? "bg-pastel-greenDeep" : "bg-red-500"
            )}
            role="status"
          >
            {toast.kind === "success" ? <PartyPopper className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span>{toast.text}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-1 rounded-full p-0.5 transition hover:bg-white/20"
              aria-label="알림 닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

/**
 * 제출 등 위험한 액션을 한 번 더 묻는 모달.
 * window.confirm 처럼 동작하되 톤/접근성/시각적 일관성 유지.
 */
function ConfirmDialog({
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-slate-900/50 px-5 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-soft">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-pastel-yellow">
          <AlertCircle className="h-7 w-7 text-pastel-yellowDeep" />
        </div>
        <h2 className="text-center text-lg font-extrabold text-slate-800">{title}</h2>
        <p className="mt-2 whitespace-pre-line text-center text-sm text-slate-500">
          {description}
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-12 flex-1 rounded-2xl bg-slate-100 text-base font-extrabold text-slate-600 transition active:scale-[0.98]"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-12 flex-1 rounded-2xl bg-gradient-to-br from-pastel-greenDeep to-pastel-blueDeep text-base font-extrabold text-white shadow-soft transition active:scale-[0.98]"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function StudentTile({
  student,
  mode,
  active,
  onTap,
  onSubmit,
  submitting,
  canSubmit,
}: {
  student: StudentRecitationDto;
  mode: "festival" | "kindergarten";
  active: boolean;
  onTap: () => void;
  onSubmit: () => void;
  submitting: boolean;
  canSubmit: boolean;
}) {
  const done = student.success;
  const quizDone = student.quizSuccess;
  const kindergartenDone = student.kindergartenSuccess;
  const allDone = mode === "kindergarten" ? !!kindergartenDone : done && quizDone;
  const score = Object.values(student.lessonStates ?? {}).filter(s => s === 'success').length;
  const quizScore = Object.values(student.quizStates ?? {}).filter(s => s === 'success').length;
  const kindergartenScore = Object.values(student.kindergartenActivityStates ?? {}).filter(s => s === 'success').length;
  const recitationCount = Object.keys(student.lessonStates ?? {}).length;
  const quizCount = Object.keys(student.quizStates ?? {}).length;
  const kindergartenCount = Object.keys(student.kindergartenActivityStates ?? {}).length;

  return (
    <li className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={onTap}
        aria-pressed={done}
        aria-label={`${student.name} 과 선택 열기`}
        disabled={mode === "festival" && student.submitted}
        className={cn(
          "group relative flex w-full flex-col items-center gap-1.5 overflow-hidden rounded-3xl p-2 shadow-soft ring-1 ring-white/60 transition sm:gap-2 sm:p-3",
          "active:scale-95 disabled:opacity-60",
          allDone
            ? "bg-gradient-to-b from-pastel-green/70 to-pastel-green/40"
            : mode === "festival" && student.submitted
              ? "bg-slate-50"
              : "bg-white/90 backdrop-blur",
          active && "ring-4 ring-pastel-yellowDeep/60"
        )}
      >
        {/* 완료된 학생 카드의 우상단 별 데코 */}
        {allDone && (
          <Sparkles aria-hidden className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-pastel-yellowDeep" />
        )}
        <div
          className={cn(
            "relative h-16 w-16 overflow-hidden rounded-full border-[4px] bg-white transition-colors sm:h-20 sm:w-20",
            allDone ? "border-pastel-greenDeep" : done || kindergartenDone ? "border-pastel-greenDeep/60" : quizDone ? "border-pastel-blueDeep/60" : "border-white"
          )}
        >
          <StudentAvatar name={student.name} photoUrl={student.photoUrl} />
          {allDone && (
            <span key={JSON.stringify(student.lessonStates) + JSON.stringify(student.quizStates) + JSON.stringify(student.kindergartenActivityStates)} className="absolute inset-0 flex animate-pop items-center justify-center rounded-full bg-pastel-greenDeep/40">
              <Check className="h-7 w-7 text-white drop-shadow sm:h-8 sm:w-8" strokeWidth={3} />
            </span>
          )}
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs font-extrabold text-slate-800 sm:text-sm">{student.name}</span>
          <div className="mt-0.5 flex items-center gap-1">
            {mode === "kindergarten" ? (
              kindergartenDone ? (
                <span className="text-[10px] font-extrabold text-pastel-greenDeep sm:text-[11px]">📚 {kindergartenScore}</span>
              ) : kindergartenCount > 0 ? (
                <span className="text-[10px] font-bold text-slate-400 sm:text-[11px]">📚 {kindergartenCount}/{TOTAL_KINDERGARTEN_ACTIVITIES}</span>
              ) : null
            ) : (
              <>
                {done ? (
                  <span className="text-[10px] font-extrabold text-pastel-greenDeep sm:text-[11px]">📖 {score}</span>
                ) : recitationCount > 0 ? (
                  <span className="text-[10px] font-bold text-slate-400 sm:text-[11px]">📖 {recitationCount}/{TOTAL_RECITATIONS}</span>
                ) : null}
                {quizDone ? (
                  <span className="text-[10px] font-extrabold text-pastel-blueDeep sm:text-[11px]">❓ {quizScore}</span>
                ) : quizCount > 0 ? (
                  <span className="text-[10px] font-bold text-slate-400 sm:text-[11px]">❓ {quizCount}/{TOTAL_QUIZZES}</span>
                ) : null}
              </>
            )}
          </div>
        </div>
      </button>
      {mode === "festival" && (
        <button
          type="button"
          onClick={onSubmit}
          disabled
          className="h-9 rounded-2xl bg-white/80 text-[11px] font-extrabold text-slate-400 shadow-sm ring-1 ring-slate-200 disabled:active:scale-100"
        >
          {student.submitted ? "✓ 제출됨" : submitting ? "제출 중..." : canSubmit ? "최종 제출 비활성화" : "최종 제출"}
        </button>
      )}
    </li>
  );
}

/**
 * 학생별 과(1~16) 선택 팝업 — 모바일 친화적인 바텀 시트.
 *  - 뒤로: 변경 없이 닫기
 *  - 완료: 선택한 과 목록으로 onComplete 콜백. 호출 측에서 success 갱신.
 *  - 배경 탭 / ESC 로도 닫힘.
 *  - 팝업이 떠 있는 동안 body 스크롤 잠금.
 */
function StudentLessonModal({
  student,
  onClose,
  onBack,
  onToggle,
}: {
  student: StudentRecitationDto;
  onClose: () => void;
  onBack: () => void;
  onToggle: (lessonNum: number) => void;
}) {
  const states = student.lessonStates ?? {};
  const done = student.success;

  // body 스크롤 잠금
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ESC 로 닫기
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lesson-modal-title"
      className="fixed inset-0 z-40 flex animate-fade-in items-end justify-center bg-slate-900/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mx-auto flex max-h-[90dvh] w-full max-w-md animate-slide-up flex-col overflow-hidden rounded-t-3xl bg-white shadow-soft">
        {/* 시트 핸들 */}
        <div className="flex shrink-0 justify-center pb-1 pt-3">
          <span className="h-1.5 w-12 rounded-full bg-slate-200" />
        </div>

        {/* 학생 프로필 + 이름 */}
        <header className="flex shrink-0 items-center gap-3 bg-gradient-to-b from-pastel-green/40 to-transparent px-5 pb-4 pt-3">
          <div className="relative shrink-0">
            <div aria-hidden className="absolute -inset-0.5 rounded-full bg-gradient-to-tr from-pastel-greenDeep to-emerald-300 opacity-70 blur-[2px]" />
            <div className={cn(
              "relative h-14 w-14 overflow-hidden rounded-full border-[4px] bg-white transition-colors",
              done ? "border-pastel-greenDeep" : "border-white"
            )}>
              <StudentAvatar name={student.name} photoUrl={student.photoUrl} />
              {done && (
                <span key={JSON.stringify(states)} className="absolute inset-0 flex animate-pop items-center justify-center rounded-full bg-pastel-greenDeep/30">
                  <Check className="h-6 w-6 text-white drop-shadow" strokeWidth={3} />
                </span>
              )}
            </div>
          </div>
          <div className="min-w-0">
            <p
              id="lesson-modal-title"
              className="truncate text-xl font-extrabold text-slate-800"
            >
              <span className="mr-1">📖</span>{student.name}
            </p>
            <p className="text-xs text-slate-500">탭할 때마다 <b>성공 → 실패 → 미정</b> 순</p>
          </div>
        </header>

        {/* 색상 범례 — 처음 쓰는 선생님이 의미를 헷갈리지 않도록 */}
        <ColorLegend successLabel="성공" successColor="green" />

        {/* 과 버튼 그리드 (1~16, 4열) — 필요 시 내부 스크롤 */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: TOTAL_RECITATIONS }, (_, i) => i + 1).map((n) => {
              const state = states[n];
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => onToggle(n)}
                  aria-pressed={state !== undefined}
                  className={cn(
                    "flex h-14 items-center justify-center rounded-2xl text-base font-extrabold transition active:scale-95",
                    state === 'success'
                      ? "bg-pastel-greenDeep text-white shadow-soft"
                      : state === 'fail'
                        ? "bg-red-400 text-white shadow-soft"
                        : "bg-pastel-cream text-slate-700 ring-1 ring-slate-200"
                  )}
                >
                  {n}과
                </button>
              );
            })}
          </div>
          {Object.keys(states).length > 0 && (
            <p className="mt-3 text-center text-sm text-slate-500">
              성공: {formatLessons(states) || '실패'}
            </p>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex shrink-0 gap-2 border-t border-slate-100 px-5 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 shadow-soft transition active:scale-[0.98]"
            aria-label="뒤로 가기"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-14 flex-1 rounded-2xl bg-gradient-to-br from-pastel-greenDeep to-emerald-500 text-lg font-extrabold text-white shadow-soft transition active:scale-[0.98]"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

const KINDERGARTEN_BOOKS = [
  { id: 1, title: "1~3월", start: 1, end: 13 },
  { id: 2, title: "4~6월", start: 14, end: 26 },
  { id: 3, title: "7~9월", start: 27, end: 39 },
  { id: 4, title: "10~12월", start: 40, end: 52 },
];

const KINDERGARTEN_ACTIVITIES = [
  { key: "KINDERGARTEN_ATTENDANCE", label: "출석", color: "yellow" },
  { key: "KINDERGARTEN_FOUNDATION", label: "머릿돌", color: "green" },
  { key: "KINDERGARTEN_RECITATION", label: "암송", color: "blue" },
] as const;

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

function getKindergartenActivityKey(lesson: number, activityType: string) {
  return `${lesson}:${activityType}`;
}

/**
 * 유치부 체크 팝업 — 바텀시트 안에서 과별 활동 칩을 빠르게 표시한다.
 */
function StudentKindergartenModal({
  student,
  onClose,
  onToggle,
}: {
  student: StudentRecitationDto;
  onClose: () => void;
  onToggle: (lessonNum: number, activityType: string) => void;
}) {
  const states = student.kindergartenActivityStates ?? {};
  const done = Object.keys(states).length === TOTAL_KINDERGARTEN_ACTIVITIES;
  const [selectedBookId, setSelectedBookId] = React.useState(1);
  const selectedBook = KINDERGARTEN_BOOKS.find((book) => book.id === selectedBookId) ?? KINDERGARTEN_BOOKS[0];
  const selectedLessons = Array.from(
    { length: selectedBook.end - selectedBook.start + 1 },
    (_, i) => selectedBook.start + i
  );
  const availableLessonLimit = getKindergartenAvailableLessonLimit();
  const weeklyLesson = availableLessonLimit;
  const weeklySelectedCount = KINDERGARTEN_ACTIVITIES.filter(
    (activity) => states[getKindergartenActivityKey(weeklyLesson, activity.key)] === "success"
  ).length;

  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kindergarten-modal-title"
      className="fixed inset-0 z-40 flex animate-fade-in items-end justify-center overflow-hidden bg-slate-900/55 px-0 backdrop-blur-[3px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative mx-auto flex h-[76dvh] w-full max-w-md animate-slide-up flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-soft">
        <div className="flex shrink-0 justify-center pb-1 pt-3">
          <span className="h-1.5 w-12 rounded-full bg-slate-200" />
        </div>

        <header className="shrink-0 bg-gradient-to-b from-pastel-yellow/40 via-pastel-green/20 to-transparent px-5 pb-3 pt-2">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="h-14 w-14 overflow-hidden rounded-full border-[4px] border-white bg-white shadow-soft">
                <StudentAvatar name={student.name} photoUrl={student.photoUrl} />
              </div>
              <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-pastel-yellowDeep text-white shadow-sm">
                <Crown className="h-3.5 w-3.5" />
              </span>
              {done && (
                <span className="absolute inset-0 flex animate-pop items-center justify-center rounded-full bg-pastel-greenDeep/25">
                  <Check className="h-6 w-6 text-white drop-shadow" strokeWidth={3} />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p id="kindergarten-modal-title" className="truncate text-xl font-extrabold text-slate-800">
                과별 활동 체크
              </p>
              <p className="mt-0.5 text-xs font-bold text-slate-500">
                {student.name} · {student.className}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm ring-1 ring-slate-200 transition active:scale-95"
              aria-label="활동 체크 닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="shrink-0 px-5 pb-3">
          <div className="mb-3 rounded-3xl bg-gradient-to-br from-pastel-yellow/70 to-pastel-green/50 p-3 shadow-sm ring-1 ring-pastel-yellowDeep/20">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold tracking-[0.08em] text-pastel-yellowDeep">
                  이번 주 체크
                </p>
                <p className="mt-1 truncate text-sm font-extrabold text-slate-800">
                  {weeklyLesson}과: {LESSON_TITLES[weeklyLesson]}
                </p>
                <p className="mt-1 text-[11px] font-bold text-slate-500">
                  {weeklySelectedCount}/3 완료
                </p>
              </div>
              {weeklySelectedCount === KINDERGARTEN_ACTIVITIES.length && (
                <span className="shrink-0 rounded-full bg-pastel-greenDeep px-3 py-1 text-xs font-extrabold text-white">
                  완료
                </span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {KINDERGARTEN_ACTIVITIES.map((activity) => {
                const selected = states[getKindergartenActivityKey(weeklyLesson, activity.key)] === "success";
                return (
                  <button
                    key={activity.key}
                    type="button"
                    onClick={() => onToggle(weeklyLesson, activity.key)}
                    aria-pressed={selected}
                    className={cn(
                      "flex h-11 items-center justify-center rounded-2xl text-sm font-extrabold shadow-sm transition active:scale-95",
                      selected && activity.color === "yellow" && "bg-pastel-yellowDeep text-white",
                      selected && activity.color === "green" && "bg-pastel-greenDeep text-white",
                      selected && activity.color === "blue" && "bg-pastel-blueDeep text-white",
                      !selected && "bg-white/90 text-slate-600 ring-1 ring-white/80"
                    )}
                  >
                    {activity.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1 rounded-3xl bg-pastel-cream p-1">
            {KINDERGARTEN_BOOKS.map((book) => {
              const active = selectedBook.id === book.id;
              return (
                <button
                  key={book.id}
                  type="button"
                  onClick={() => setSelectedBookId(book.id)}
                  className={cn(
                    "h-10 min-w-0 rounded-2xl px-1 text-center text-[11px] font-extrabold transition active:scale-95 sm:text-xs",
                    active
                      ? "bg-white text-pastel-greenDeep shadow-sm ring-1 ring-pastel-greenDeep/20"
                      : "text-slate-500"
                  )}
                >
                  {book.title}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 pb-4">
          {selectedLessons.map((lesson) => {
            const locked = lesson > availableLessonLimit;
            const selectedCount = KINDERGARTEN_ACTIVITIES.filter(
              (activity) => states[getKindergartenActivityKey(lesson, activity.key)] === "success"
            ).length;
            const complete = selectedCount === KINDERGARTEN_ACTIVITIES.length;
            const progress = Math.round((selectedCount / KINDERGARTEN_ACTIVITIES.length) * 100);
            return (
              <section
                key={lesson}
                className={cn(
                  "rounded-3xl bg-white p-4 shadow-soft ring-2 transition",
                  locked
                    ? "bg-slate-50 opacity-60 ring-slate-100"
                    : complete
                      ? "ring-pastel-greenDeep/70"
                      : "ring-slate-100"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className={cn("text-base font-extrabold", locked ? "text-slate-400" : "text-slate-800")}>
                      {lesson}과: {LESSON_TITLES[lesson]}
                    </h3>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      {locked ? `${availableLessonLimit + 1}과부터 순서대로 열려요` : `${selectedCount}/3 완료`}
                    </p>
                  </div>
                  {locked && (
                    <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-extrabold text-slate-500">
                      잠김
                    </span>
                  )}
                  {complete && !locked && (
                    <span className="rounded-full bg-pastel-greenDeep px-3 py-1 text-xs font-extrabold text-white">
                      완료
                    </span>
                  )}
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-pastel-cream">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-pastel-greenDeep to-pastel-blueDeep transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {KINDERGARTEN_ACTIVITIES.map((activity) => {
                    const selected = states[getKindergartenActivityKey(lesson, activity.key)] === "success";
                    return (
                      <button
                        key={activity.key}
                        type="button"
                        onClick={() => onToggle(lesson, activity.key)}
                        disabled={locked}
                        aria-pressed={selected}
                        className={cn(
                          "flex h-12 items-center justify-center rounded-2xl text-sm font-extrabold shadow-sm transition active:scale-95",
                          selected && activity.color === "yellow" && "bg-pastel-yellowDeep text-white",
                          selected && activity.color === "green" && "bg-pastel-greenDeep text-white",
                          selected && activity.color === "blue" && "bg-pastel-blueDeep text-white",
                          !selected && "bg-white text-slate-600 ring-2 ring-slate-200",
                          locked && "cursor-not-allowed bg-slate-100 text-slate-400 ring-slate-200 active:scale-100"
                        )}
                      >
                        {activity.label}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-slate-100 bg-white px-5 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-pastel-greenDeep to-pastel-blueDeep text-lg font-extrabold text-white shadow-soft transition active:scale-[0.98]"
          >
            <Save className="h-5 w-5" />
            저장하기
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 학생별 퀴즈(1~18) 선택 팝업 — 암송 모달과 동일한 구조, 다른 색상 테마.
 */
function StudentQuizModal({
  student,
  onClose,
  onBack,
  onToggle,
}: {
  student: StudentRecitationDto;
  onClose: () => void;
  onBack: () => void;
  onToggle: (quizNum: number) => void;
}) {
  const states = student.quizStates ?? {};
  const done = student.quizSuccess;

  // body 스크롤 잠금
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ESC 로 닫기
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-modal-title"
      className="fixed inset-0 z-40 flex animate-fade-in items-end justify-center bg-slate-900/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mx-auto flex max-h-[90dvh] w-full max-w-md animate-slide-up flex-col overflow-hidden rounded-t-3xl bg-white shadow-soft">
        {/* 시트 핸들 */}
        <div className="flex shrink-0 justify-center pb-1 pt-3">
          <span className="h-1.5 w-12 rounded-full bg-slate-200" />
        </div>

        {/* 학생 프로필 + 이름 */}
        <header className="flex shrink-0 items-center gap-3 bg-gradient-to-b from-pastel-blue/40 to-transparent px-5 pb-4 pt-3">
          <div className="relative shrink-0">
            <div aria-hidden className="absolute -inset-0.5 rounded-full bg-gradient-to-tr from-pastel-blueDeep to-sky-300 opacity-70 blur-[2px]" />
            <div className={cn(
              "relative h-14 w-14 overflow-hidden rounded-full border-[4px] bg-white transition-colors",
              done ? "border-pastel-blueDeep" : "border-white"
            )}>
              <StudentAvatar name={student.name} photoUrl={student.photoUrl} />
              {done && (
                <span key={JSON.stringify(states)} className="absolute inset-0 flex animate-pop items-center justify-center rounded-full bg-pastel-blueDeep/30">
                  <Check className="h-6 w-6 text-white drop-shadow" strokeWidth={3} />
                </span>
              )}
            </div>
          </div>
          <div className="min-w-0">
            <p
              id="quiz-modal-title"
              className="truncate text-xl font-extrabold text-slate-800"
            >
              <span className="mr-1">❓</span>{student.name}
            </p>
            <p className="text-xs text-slate-500">탭할 때마다 <b>정답 → 오답 → 미정</b> 순</p>
          </div>
        </header>

        <ColorLegend successLabel="정답" successColor="blue" />

        {/* 퀴즈 버튼 그리드 (1~18, 4열) */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: TOTAL_QUIZZES }, (_, i) => i + 1).map((n) => {
              const state = states[n];
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => onToggle(n)}
                  aria-pressed={state !== undefined}
                  className={cn(
                    "flex h-14 items-center justify-center rounded-2xl text-base font-extrabold transition active:scale-95",
                    state === 'success'
                      ? "bg-pastel-blueDeep text-white shadow-soft"
                      : state === 'fail'
                        ? "bg-red-400 text-white shadow-soft"
                        : "bg-pastel-cream text-slate-700 ring-1 ring-slate-200"
                  )}
                >
                  {n}번
                </button>
              );
            })}
          </div>
          {Object.keys(states).length > 0 && (
            <p className="mt-3 text-center text-sm text-slate-500">
              정답: {formatQuiz(states) || '오답'}
            </p>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex shrink-0 gap-2 border-t border-slate-100 px-5 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 shadow-soft transition active:scale-[0.98]"
            aria-label="뒤로 가기"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-14 flex-1 rounded-2xl bg-gradient-to-br from-pastel-blueDeep to-sky-500 text-lg font-extrabold text-white shadow-soft transition active:scale-[0.98]"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 학생 액션 시트 — 프로필 탭 시 암송 / 퀴즈 선택 바텀 시트.
 */
function StudentActionSheet({
  student,
  onClose,
  onRecitation,
  onQuiz,
}: {
  student: StudentRecitationDto;
  onClose: () => void;
  onRecitation: () => void;
  onQuiz: () => void;
}) {
  // body 스크롤 잠금
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ESC 로 닫기
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const done = student.success;
  const quizDone = student.quizSuccess;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="활동 선택"
      className="fixed inset-0 z-40 flex animate-fade-in items-end justify-center bg-slate-900/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mx-auto flex w-full max-w-md animate-slide-up flex-col overflow-hidden rounded-t-3xl bg-white shadow-soft">
        {/* 시트 핸들 */}
        <div className="flex shrink-0 justify-center pb-1 pt-3">
          <span className="h-1.5 w-12 rounded-full bg-slate-200" />
        </div>

        {/* 학생 프로필 — 부드러운 파스텔 배경 강조 */}
        <header className="relative flex flex-col items-center gap-2 bg-gradient-to-b from-pastel-yellow/40 to-transparent px-5 pb-5 pt-3">
          <div className="relative">
            <div aria-hidden className="absolute -inset-1 rounded-full bg-gradient-to-tr from-pastel-greenDeep via-pastel-yellowDeep to-pastel-blueDeep opacity-60 blur-[2px]" />
            <div className={cn(
              "relative h-20 w-20 overflow-hidden rounded-full border-[4px] bg-white shadow-soft transition-colors",
              done ? "border-pastel-greenDeep" : "border-white"
            )}>
              <StudentAvatar name={student.name} photoUrl={student.photoUrl} />
              {done && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-pastel-greenDeep/30">
                  <Check className="h-7 w-7 text-white drop-shadow" strokeWidth={3} />
                </span>
              )}
            </div>
          </div>
          <p className="text-xl font-extrabold text-slate-800">{student.name}</p>
          <p className="text-sm text-slate-500">어떤 활동을 표시할까요?</p>
        </header>

        {/* 암송 / 퀴즈 버튼 */}
        <div className="flex gap-3 px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-3">
          <button
            type="button"
            onClick={onRecitation}
            className="relative flex h-28 flex-1 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-3xl bg-gradient-to-br from-pastel-greenDeep to-emerald-500 text-white shadow-soft transition active:scale-[0.97]"
          >
            {done && (
              <Sparkles aria-hidden className="absolute right-2 top-2 h-4 w-4 text-white/80" />
            )}
            <span className="text-3xl">📖</span>
            <span className="text-lg font-extrabold">암송</span>
            <span className="text-[10px] font-bold text-white/85">말씀 외우기</span>
          </button>
          <button
            type="button"
            onClick={onQuiz}
            className="relative flex h-28 flex-1 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-3xl bg-gradient-to-br from-pastel-blueDeep to-sky-500 text-white shadow-soft transition active:scale-[0.97]"
          >
            {quizDone && (
              <Sparkles aria-hidden className="absolute right-2 top-2 h-4 w-4 text-white/80" />
            )}
            <span className="text-3xl">❓</span>
            <span className="text-lg font-extrabold">퀴즈</span>
            <span className="text-[10px] font-bold text-white/85">문제 풀기</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 학생 아바타.
 * 실제 서비스에서는 업로드된 student.photoUrl 을 쓰되,
 * 개발 중엔 이름을 시드로 한 일관된 캐릭터 SVG(dicebear) 로 "프로필 사진" 느낌을 낸다.
 * 같은 이름은 항상 같은 캐릭터 → 교사가 얼굴로 학생을 식별할 수 있다.
 */
function StudentAvatar({ name, photoUrl }: { name: string; photoUrl?: string }) {
  const seed = encodeURIComponent(name);
  const src = resolveMediaUrl(photoUrl) || `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&backgroundColor=ffecb3,fff4b8,cdefc4,cde7fb,fcd5e0`;
  // 외부 SVG 는 next/image 설정을 건드리지 않도록 일반 img 태그로 표시.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />;
}

/**
 * 모달 안의 색상 의미 안내. 4열 그리드 위에 한 줄로 표시한다.
 * - 암송 모달: successLabel="성공" / 색=green
 * - 퀴즈 모달: successLabel="정답" / 색=blue
 */
function ColorLegend({
  successLabel,
  successColor,
}: {
  successLabel: string;
  successColor: "green" | "blue";
}) {
  const successBg = successColor === "green" ? "bg-pastel-greenDeep" : "bg-pastel-blueDeep";
  const failLabel = successLabel === "성공" ? "실패" : "오답";
  return (
    <div className="mx-5 mb-3 flex items-center justify-center gap-3 rounded-xl bg-pastel-cream/60 px-3 py-1.5 text-[11px] font-bold text-slate-600">
      <span className="flex items-center gap-1">
        <span className={cn("h-3 w-3 rounded", successBg)} />
        {successLabel}
      </span>
      <span className="flex items-center gap-1">
        <span className="h-3 w-3 rounded bg-red-400" />
        {failLabel}
      </span>
      <span className="flex items-center gap-1">
        <span className="h-3 w-3 rounded bg-white ring-1 ring-slate-200" />
        미정
      </span>
    </div>
  );
}

function ProgressBar({
  icon,
  label,
  done,
  total,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  done: number;
  total: number;
  color: "green" | "blue";
}) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const isFull = total > 0 && done === total;
  // 색상 클래스를 두 가지만 분기 — 디자인 톤 통일
  const fill =
    color === "green"
      ? "bg-gradient-to-r from-pastel-greenDeep to-emerald-400"
      : "bg-gradient-to-r from-pastel-blueDeep to-sky-400";
  const tint = color === "green" ? "text-pastel-greenDeep" : "text-pastel-blueDeep";
  const bg = color === "green" ? "bg-pastel-green/40" : "bg-pastel-blue/40";

  return (
    <div className={cn("relative flex flex-col gap-1 overflow-hidden rounded-2xl px-3 py-2", bg)}>
      {isFull && (
        <Sparkles aria-hidden className={cn("absolute right-1.5 top-1.5 h-3.5 w-3.5", tint)} />
      )}
      <div className="flex items-center justify-between">
        <span className={cn("flex items-center gap-1 text-xs font-extrabold", tint)}>
          {icon}
          {label}
        </span>
        <span className="text-xs font-extrabold text-slate-700">
          {done}<span className="text-slate-400">/{total}</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/80 ring-1 ring-white/60">
        <div
          className={cn("h-full rounded-full transition-all duration-500", fill)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// 성공(success)한 과 번호를 "1·3·5과" 처럼 짧게 표시
function formatLessons(states?: Record<number, 'success' | 'fail'>) {
  if (!states) return "";
  const successLessons = Object.entries(states)
    .filter(([_, state]) => state === 'success')
    .map(([lesson]) => Number(lesson))
    .sort((a, b) => a - b);
  if (successLessons.length === 0) return "";
  return `${successLessons.join("·")}과`;
}

// 정답(success)한 퀴즈 번호를 "1·3·5번" 처럼 짧게 표시
function formatQuiz(states?: Record<number, 'success' | 'fail'>) {
  if (!states) return "";
  const correctQuizzes = Object.entries(states)
    .filter(([_, state]) => state === 'success')
    .map(([quiz]) => Number(quiz))
    .sort((a, b) => a - b);
  if (correctQuizzes.length === 0) return "";
  return `${correctQuizzes.join("·")}번`;
}
