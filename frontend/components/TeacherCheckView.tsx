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
import { Check, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";
// import { api, type StudentRecitationDto } from "@/lib/api";

type ClassDto = { classId: number; className: string };
type StudentRecitationDto = {
  studentId: number;
  name: string;
  success: boolean;
  submitted: boolean;
  // 팝업에서 선택한 과 상태. 'success'(완료), 'fail'(미완료)
  lessonStates?: Record<number, 'success' | 'fail'>;
};

const TOTAL_LESSONS = 16;

// --- 더미 데이터 ---------------------------------------------------
const DUMMY_CLASSES: ClassDto[] = [
  { classId: 1, className: "만 3-1반" },
  { classId: 2, className: "만 4-1반" },
  { classId: 3, className: "만 4-2반" },
  { classId: 4, className: "만 5-1반" },
  { classId: 5, className: "만 5-2반" },
];

const DUMMY_STUDENTS: Record<number, StudentRecitationDto[]> = {
  1: [
    { studentId: 101, name: "김하은", success: false, submitted: false },
    { studentId: 102, name: "이서준", success: true, submitted: false, lessonStates: { 1: 'success', 2: 'success' } },
    { studentId: 103, name: "박지안", success: false, submitted: false },
  ],
  2: [
    { studentId: 201, name: "최예린", success: false, submitted: false },
    { studentId: 202, name: "정민준", success: false, submitted: false },
    { studentId: 203, name: "한지우", success: false, submitted: false },
  ],
  3: [
    { studentId: 301, name: "윤서아", success: true, submitted: false, lessonStates: { 3: 'success' } },
    { studentId: 302, name: "강유찬", success: false, submitted: false },
  ],
  4: [
    { studentId: 401, name: "조서윤", success: false, submitted: false },
    { studentId: 402, name: "배도윤", success: false, submitted: false },
    { studentId: 403, name: "임나윤", success: false, submitted: false },
  ],
  5: [
    { studentId: 501, name: "문서현", success: false, submitted: false },
    { studentId: 502, name: "권하준", success: false, submitted: false },
  ],
};

type TeacherCheckViewProps = {
  initialClassId?: number;
};

export default function TeacherCheckView({ initialClassId }: TeacherCheckViewProps = {}) {
  const router = useRouter();
  const fallbackClassId = DUMMY_CLASSES[0].classId;
  const safeInitialId =
    initialClassId && DUMMY_CLASSES.some((c) => c.classId === initialClassId)
      ? initialClassId
      : fallbackClassId;

  const selectedClassId = safeInitialId;
  const className = currentClassName(selectedClassId);

  const [students, setStudents] = React.useState<StudentRecitationDto[]>(
    DUMMY_STUDENTS[safeInitialId] ?? []
  );
  const [activeStudentId, setActiveStudentId] = React.useState<number | null>(null);
  // 팝업으로 열려 있는 학생. null 이면 팝업 닫힘.
  const [modalStudentId, setModalStudentId] = React.useState<number | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // 선택된 반 학생 + 오늘 상태 로드
  React.useEffect(() => {
    // TODO: API 연동 — api.getClassRecitations(selectedClassId) 로 교체.
    setStudents(DUMMY_STUDENTS[selectedClassId] ?? []);
    setActiveStudentId(null);
    setModalStudentId(null);
  }, [selectedClassId]);

  const activeStudent =
    students.find((s) => s.studentId === activeStudentId) ?? students[0] ?? null;
  const modalStudent =
    students.find((s) => s.studentId === modalStudentId) ?? null;

  const completedCount = students.filter((s) => s.success).length;
  const totalCount = students.length;
  const alreadySubmitted = students.length > 0 && students.every((s) => s.submitted);

  // 학생 프로필 탭: 상단 프로필 동기화 + 팝업 오픈
  const handleSelect = (student: StudentRecitationDto) => {
    setActiveStudentId(student.studentId);
    if (student.submitted) return; // 제출된 기록은 수정 불가
    setModalStudentId(student.studentId);
  };

  const handleModalClose = () => {
    setModalStudentId(null);
  };

  // 팝업에서 개별 버튼을 누를 때마다 상태 즉시 업데이트
  const handleToggleLesson = async (lessonNum: number) => {
    if (!modalStudent) return;
    const studentId = modalStudent.studentId;

    setStudents((prev) =>
      prev.map((s) => {
        if (s.studentId !== studentId) return s;
        const currentStates = s.lessonStates || {};
        const currentState = currentStates[lessonNum];
        let nextState: 'success' | 'fail' | undefined;
        if (!currentState) nextState = 'success';
        else if (currentState === 'success') nextState = 'fail';
        else nextState = undefined;

        const newStates = { ...currentStates };
        if (nextState) newStates[lessonNum] = nextState;
        else delete newStates[lessonNum];

        // 팝업창 안의 모든 버튼(1~16과)이 누락(흰색) 없이 모두 초록색 또는 빨간색으로 토글되면 완료 이벤트(success) 발동
        const nextSuccess = Array.from({ length: TOTAL_LESSONS }, (_, i) => i + 1)
          .every((n) => newStates[n] !== undefined);

        return { ...s, lessonStates: newStates, success: nextSuccess };
      })
    );

    try {
      // TODO: API 연동 — 팝업에서 누를 때마다 서버 저장 (필요 시)
      // await api.toggleRecitation(studentId, lessonNum, ...); 
    } catch (e) {
      console.error("API 저장 실패", e);
    }
  };

  const handleSubmit = async () => {
    if (submitting || alreadySubmitted) return;
    const ok = window.confirm(
      `오늘 ${className}의 암송 결과를 최종 제출할까요?\n제출 후에는 수정할 수 없어요.`
    );
    if (!ok) return;

    setSubmitting(true);
    try {
      // TODO: API 연동 — await api.submitClass(selectedClassId);
      await new Promise((r) => setTimeout(r, 400)); // 더미 지연
      setStudents((prev) => prev.map((s) => ({ ...s, submitted: true })));
      alert("최종 제출 완료! 전광판에 곧 반영됩니다.");
    } catch (e) {
      alert("제출 중 오류가 발생했어요. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-md bg-pastel-cream pb-36">
      {/* 상단: 반 이름 + 타이틀 */}
      <header className="sticky top-0 z-20 bg-pastel-cream/95 px-5 pb-3 pt-[max(env(safe-area-inset-top),1.25rem)] backdrop-blur">
        <div className="relative flex items-center justify-center">
          <div className="text-center">
            <p className="text-xs font-bold tracking-[0.15em] text-pastel-yellowDeep sm:text-sm">
              {className}
            </p>
            <h1 className="mt-1 text-xl font-extrabold text-slate-800 sm:text-2xl">
              오늘의 암송 체크
            </h1>
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute right-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow-sm ring-1 ring-slate-200 transition active:scale-95"
            aria-label="뒤로 가기"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* 중앙 상단: 선생님 프로필 영역 */}
      <section className="flex flex-col items-center justify-center px-5 pt-6 pb-2">
        <div className="flex gap-6 sm:gap-10">
          <div className="flex flex-col items-center gap-2">
            <div className="h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-full border-[4px] border-pastel-blueDeep bg-white shadow-soft">
              {/* 선생님 아바타 임시 사용 */}
              <StudentAvatar name="정교사" />
            </div>
            <span className="text-sm font-bold text-slate-700">정교사 선생님</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-full border-[4px] border-pastel-yellowDeep bg-white shadow-soft">
              <StudentAvatar name="부교사" />
            </div>
            <span className="text-sm font-bold text-slate-700">부교사 선생님</span>
          </div>
        </div>
      </section>

      {/* 학생 프로필 그리드 */}
      <section className="mt-5 px-4 sm:mt-6 sm:px-5" aria-label="학생 선택">
        {students.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-soft">
            이 반의 학생 정보가 아직 없어요.
          </div>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:gap-3">
            {students.map((s) => (
              <StudentTile
                key={s.studentId}
                student={s}
                active={s.studentId === activeStudent?.studentId}
                onTap={() => handleSelect(s)}
              />
            ))}
          </ul>
        )}
      </section>

      {/* 하단 고정 액션 바 */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md border-t border-pastel-yellowDeep/30 bg-white/95 px-5 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 backdrop-blur"
        aria-label="제출 영역"
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-base font-semibold text-slate-700">
            진행률: <span className="text-pastel-greenDeep">{completedCount}</span>
            <span className="text-slate-400"> / {totalCount}명</span>
          </span>
          <ProgressDots total={totalCount} done={completedCount} />
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || alreadySubmitted || totalCount === 0}
          className={cn(
            "flex h-16 w-full items-center justify-center rounded-2xl text-xl font-extrabold text-white shadow-soft transition",
            "bg-gradient-to-br from-pastel-greenDeep to-pastel-blueDeep",
            "active:scale-[0.98]",
            "disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500"
          )}
        >
          {alreadySubmitted
            ? "이미 제출됨"
            : submitting
              ? "제출 중..."
              : "최종 제출하기"}
        </button>
      </nav>

      {/* 과 선택 팝업 */}
      {modalStudent && (
        <StudentLessonModal
          student={modalStudent}
          onClose={handleModalClose}
          onToggle={handleToggleLesson}
        />
      )}
    </main>
  );
}

function StudentTile({
  student,
  active,
  onTap,
}: {
  student: StudentRecitationDto;
  active: boolean;
  onTap: () => void;
}) {
  const done = student.success;
  const score = Object.values(student.lessonStates ?? {}).filter(s => s === 'success').length;

  return (
    <li>
      <button
        type="button"
        onClick={onTap}
        aria-pressed={done}
        aria-label={`${student.name} 과 선택 열기`}
        disabled={student.submitted}
        className={cn(
          "flex w-full flex-col items-center gap-1.5 rounded-3xl bg-white p-2 shadow-soft transition sm:gap-2 sm:p-3",
          "active:scale-95 disabled:opacity-60",
          done && "bg-pastel-green/60",
          active && "ring-4 ring-pastel-yellowDeep/60"
        )}
      >
        <div
          className={cn(
            "relative h-16 w-16 overflow-hidden rounded-full border-[4px] transition-colors sm:h-20 sm:w-20",
            done ? "border-pastel-greenDeep" : "border-white"
          )}
        >
          <StudentAvatar name={student.name} />
          {done && (
            // 버튼 상태가 바뀔 때마다 다시 팝 애니메이션 발동
            <span key={JSON.stringify(student.lessonStates)} className="absolute inset-0 flex animate-pop items-center justify-center rounded-full bg-pastel-greenDeep/30">
              <Check className="h-7 w-7 text-white drop-shadow sm:h-8 sm:w-8" strokeWidth={3} />
            </span>
          )}
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-slate-800 sm:text-sm">{student.name}</span>
          {done && (
            <span className="text-[11px] sm:text-xs font-extrabold text-pastel-greenDeep mt-0.5">
              {score}점
            </span>
          )}
        </div>
      </button>
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
  onToggle,
}: {
  student: StudentRecitationDto;
  onClose: () => void;
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
      <div className="mx-auto flex max-h-[90dvh] w-full max-w-md animate-slide-up flex-col rounded-t-3xl bg-white shadow-soft">
        {/* 시트 핸들 */}
        <div className="flex shrink-0 justify-center pb-1 pt-3">
          <span className="h-1.5 w-12 rounded-full bg-slate-200" />
        </div>

        {/* 학생 프로필 + 이름 */}
        <header className="flex shrink-0 items-center gap-3 px-5 pb-4 pt-2">
          <div className={cn(
            "relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-[4px] transition-colors",
            done ? "border-pastel-greenDeep" : "border-pastel-yellowDeep"
          )}>
            <StudentAvatar name={student.name} />
            {done && (
              <span key={JSON.stringify(states)} className="absolute inset-0 flex animate-pop items-center justify-center rounded-full bg-pastel-greenDeep/30">
                <Check className="h-6 w-6 text-white drop-shadow" strokeWidth={3} />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p
              id="lesson-modal-title"
              className="truncate text-xl font-extrabold text-slate-800"
            >
              {student.name}
            </p>
            <p className="text-sm text-slate-500">암송한 과를 선택하세요</p>
          </div>
        </header>

        {/* 과 버튼 그리드 (1~16, 4열) — 필요 시 내부 스크롤 */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: TOTAL_LESSONS }, (_, i) => i + 1).map((n) => {
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

        {/* 하단 확인 버튼 */}
        <div className="flex shrink-0 border-t border-slate-100 px-5 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3">
          <button
            type="button"
            onClick={onClose}
            className="h-14 w-full rounded-2xl bg-gradient-to-br from-pastel-greenDeep to-pastel-blueDeep text-lg font-extrabold text-white shadow-soft transition active:scale-[0.98]"
          >
            확인
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
function StudentAvatar({ name }: { name: string }) {
  // TODO: photoUrl 이 있으면 해당 URL 을 우선 사용하도록 확장.
  const seed = encodeURIComponent(name);
  const src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&backgroundColor=ffecb3,fff4b8,cdefc4,cde7fb,fcd5e0`;
  // 외부 SVG 는 next/image 설정을 건드리지 않도록 일반 img 태그로 표시.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />;
}

function ProgressDots({ total, done }: { total: number; done: number }) {
  if (total === 0) return null;
  if (total > 8) {
    const pct = Math.round((done / total) * 100);
    return <span className="text-sm font-semibold text-slate-500">{pct}%</span>;
  }
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-2.5 w-2.5 rounded-full",
            i < done ? "bg-pastel-greenDeep" : "bg-slate-200"
          )}
        />
      ))}
    </div>
  );
}

function currentClassName(id: number) {
  return DUMMY_CLASSES.find((c) => c.classId === id)?.className ?? "";
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
