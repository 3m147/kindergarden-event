import TeacherCheckView from "@/components/TeacherCheckView";

// StartView 에서 선택된 반 ID 를 URL 로 받아 체크 화면을 연다.
// /check/3  →  classId = 3
export default function CheckPage({
  params,
  searchParams,
}: {
  params: { classId: string };
  searchParams?: { mode?: string };
}) {
  const initialClassId = Number(params.classId);
  const mode = searchParams?.mode === "kindergarten" ? "kindergarten" : "festival";
  return <TeacherCheckView initialClassId={initialClassId} mode={mode} />;
}
