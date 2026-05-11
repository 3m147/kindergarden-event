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
import { Shield, LogOut, ChevronDown, ChevronUp, Users, BookOpen, HelpCircle, CheckCircle2, XCircle, ArrowLeft, Camera, RefreshCw } from "lucide-react";
import { api, resolveMediaUrl, type StudentRecitationDto } from "@/lib/api";

const TOTAL_RECITATIONS = 16;
const TOTAL_QUIZZES = 18;
const TOTAL_KINDERGARTEN_LESSONS = 52;
const KINDERGARTEN_ACTIVITY_TYPES = [
  { key: "KINDERGARTEN_ATTENDANCE", label: "출석", color: "amber" },
  { key: "KINDERGARTEN_FOUNDATION", label: "머릿돌", color: "emerald" },
  { key: "KINDERGARTEN_RECITATION", label: "암송", color: "sky" },
] as const;

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
  const [expandedClass, setExpandedClass] = React.useState<number | null>(null);
  const [expandedStudent, setExpandedStudent] = React.useState<number | null>(null);
  const [students, setStudents] = React.useState<StudentRecitationDto[]>([]);
  const [refreshing, setRefreshing] = React.useState(false);
  const [unlockingStudentId, setUnlockingStudentId] = React.useState<number | null>(null);
  const [toast, setToast] = React.useState<{ kind: "success" | "error"; text: string } | null>(null);

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
    if (auth !== "true") {
      router.replace("/admin");
      return;
    }
    setAuthenticated(true);
    loadScores();
  }, [loadScores, router]);

  const handleLogout = () => {
    localStorage.removeItem("admin_authenticated");
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
  const screenTitle = mode === "festival" ? "암송잔치 현황" : "유치부 체크 현황";
  const screenSubtitle = mode === "festival" ? "최종 제출된 암송 · 퀴즈 결과" : "출석 · 머릿돌 · 암송 활동 결과";

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-2xl bg-slate-900 pb-8">
      {/* 헤더 */}
      <header className="sticky top-0 z-20 bg-slate-900/95 px-5 pb-4 pt-[max(env(safe-area-inset-top),1.25rem)] backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-white sm:text-xl">{screenTitle}</h1>
              <p className="text-xs text-slate-400">{screenSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadScores(true)}
              disabled={refreshing}
              className="flex h-10 items-center gap-1.5 rounded-xl bg-slate-800 px-3 text-sm font-bold text-slate-400 ring-1 ring-slate-700 transition hover:text-white active:scale-95 disabled:opacity-60"
              title="새로고침"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              새로고침
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/profiles")}
              className="flex h-10 items-center gap-1.5 rounded-xl bg-slate-800 px-3 text-sm font-bold text-slate-400 ring-1 ring-slate-700 transition hover:text-white active:scale-95"
            >
              <Camera className="h-4 w-4" />
              프로필
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-10 items-center gap-1.5 rounded-xl bg-slate-800 px-3 text-sm font-bold text-slate-400 ring-1 ring-slate-700 transition hover:text-white active:scale-95"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 화면 선택 */}
      <section className="px-5 pt-2">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-800 p-1 ring-1 ring-slate-700">
          <button
            type="button"
            onClick={() => {
              setMode("kindergarten");
              setExpandedClass(null);
              setExpandedStudent(null);
              router.push("/admin/dashboard/kindergarten");
            }}
            className={cn(
              "h-11 rounded-xl text-sm font-extrabold transition active:scale-[0.98]",
              mode === "kindergarten"
                ? "bg-emerald-500 text-white shadow"
                : "text-slate-400 hover:text-white"
            )}
          >
            유치부 체크
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("festival");
              setExpandedClass(null);
              setExpandedStudent(null);
              router.push("/admin/dashboard/festival");
            }}
            className={cn(
              "h-11 rounded-xl text-sm font-extrabold transition active:scale-[0.98]",
              mode === "festival"
                ? "bg-amber-400 text-slate-900 shadow"
                : "text-slate-400 hover:text-white"
            )}
          >
            암송잔치
          </button>
        </div>
      </section>

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
                                  {isStudentExpanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                                </div>
                              </button>

                              {/* 상세 과별 현황 */}
                              {isStudentExpanded && (
                                <div className="border-t border-slate-700/50 px-3 pb-3 pt-2">
                                  {mode === "kindergarten" && (
                                    <>
                                      <p className="mb-2 text-xs font-bold text-amber-300">🌱 유치부 활동</p>
                                      <div className="mb-4 grid grid-cols-3 gap-2">
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
