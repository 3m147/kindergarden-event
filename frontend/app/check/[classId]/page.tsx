import TeacherCheckView from "@/components/TeacherCheckView";

// StartView 에서 선택된 반 ID 를 URL 로 받아 체크 화면을 연다.
// /check/3  →  classId = 3
export default function CheckPage({ params }: { params: { classId: string } }) {
  const initialClassId = Number(params.classId);
  return <TeacherCheckView initialClassId={initialClassId} />;
}
