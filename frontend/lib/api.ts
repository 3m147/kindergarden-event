// 프론트 ↔ Spring Boot REST 클라이언트.
// 환경변수로 베이스 URL 분리 — 개발 중엔 localhost:8080, 배포 시엔 .env.production 에서 덮어쓴다.
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";

export type ClassDto = { classId: number; className: string };

export type StudentRecitationDto = {
  studentId: number;
  name: string;
  success: boolean;
  submitted: boolean;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  // 204 방어
  return (res.status === 204 ? (undefined as T) : ((await res.json()) as T));
}

export const api = {
  listClasses: () => request<ClassDto[]>("/api/classes"),

  getClassRecitations: (classId: number, date?: string) =>
    request<StudentRecitationDto[]>(
      `/api/classes/${classId}/recitations${date ? `?date=${date}` : ""}`
    ),

  toggleRecitation: (studentId: number, success: boolean, date?: string) =>
    request<StudentRecitationDto>(
      `/api/students/${studentId}/recitation${date ? `?date=${date}` : ""}`,
      { method: "PUT", body: JSON.stringify({ success }) }
    ),

  submitClass: (classId: number, date?: string) =>
    request<{ classId: number; date: string; updated: number }>(
      `/api/classes/${classId}/submit${date ? `?date=${date}` : ""}`,
      { method: "POST" }
    ),
};
