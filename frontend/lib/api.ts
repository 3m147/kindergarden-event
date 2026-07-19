import type { WeeklyPhoto } from "@/lib/weeklyPhotos";
import type { ScheduleImage } from "@/lib/scheduleImages";
import type { FoundationMaterial } from "@/lib/foundationMaterials";
import type { AdminNotice } from "@/lib/notices";
import { DEFAULT_LESSON_VIDEOS, type LessonVideo } from "@/lib/lessonVideos";

// 프론트 ↔ Spring Boot REST 클라이언트.
// 환경변수로 베이스 URL 분리 — 개발 중엔 localhost:8080, 배포 시엔 .env.production 에서 덮어쓴다.
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";
const AUTH_TOKEN_KEY = "kindergarden_auth_token";

export function saveAuthToken(token?: string) {
  if (typeof window === "undefined" || !token) return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function hasAuthToken() {
  return typeof window !== "undefined" && Boolean(localStorage.getItem(AUTH_TOKEN_KEY));
}

// 토큰이 만료되면 서버가 401을 준다. 이때 남아있는 세션을 지우고 로그인 화면으로 보내지 않으면
// 만료된 토큰을 계속 들고 요청해 화면이 401로 갇힌다. 아래에서 자동으로 복구한다.
let redirectingToLogin = false;

function handleUnauthorized() {
  if (typeof window === "undefined" || redirectingToLogin) return;
  redirectingToLogin = true;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem("teacher_info");
  localStorage.removeItem("admin_authenticated");
  window.location.replace(window.location.pathname.startsWith("/admin") ? "/admin" : "/");
}

export function resolveMediaUrl(url?: string | null) {
  const value = url?.trim();
  if (!value) return "";
  if (/^(https?:|blob:|data:)/i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `${BASE}${value}`;
  return `https://${value}`;
}

export type ClassDto = { classId: number; className: string };

// 네이버 밴드 연동
export type BandConfig = { connected: boolean; enabled: boolean; bandKey: string | null; photoAlbumKey: string | null; lastSyncedAt: string | null };
export type BandOption = { key: string; name: string };
export type BandSyncResult = { imported: number; skipped: number; message: string };

export type StudentRecitationDto = {
  studentId: number;
  name: string;
  photoUrl: string;
  birthDate?: string;
  parentName?: string;
  className: string;
  classId: number;
  lessonStates: Record<number, "success" | "fail">;
  quizStates: Record<number, "success" | "fail">;
  kindergartenStates: Record<number, "success" | "fail">;
  kindergartenActivityStates: Record<string, "success" | "fail">;
  submitted: boolean;
  teacherName: string;
  // 클라이언트에서 계산해 붙이는 파생 필드 (서버 응답에는 없음).
  // "이 학생의 모든 과/퀴즈가 표시됐는가?" — 프로필 그리드의 완료 표시에 사용.
  success?: boolean;
  quizSuccess?: boolean;
  kindergartenSuccess?: boolean;
};

export type AuthResponse = {
  success: boolean;
  id?: number;
  name?: string;
  role?: string;
  classId?: number;
  className?: string;
  photoUrl?: string;
  token?: string;
  message?: string;
};

export type PersonProfileDto = {
  id: number;
  name: string;
  type: "teacher" | "student";
  className: string;
  classId: number;
  role?: string;
  photoUrl?: string;
  birthDate?: string;
  parentName?: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  // 로그인 요청에는 토큰을 붙이지 않는다. 만료된 토큰이 남아 있으면 서버가 로그인 로직에
  // 닿기도 전에 401 로 막아버려, 재로그인조차 못 하고 갇히기 때문이다.
  const isAuthRequest = path.startsWith("/api/auth/");
  const token = !isAuthRequest && typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
  const headers = isFormData 
    ? { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init?.headers ?? {}) }
    : { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init?.headers ?? {}) };

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  // 로그인 실패도 401을 주므로 인증 요청 자체는 제외한다 (비밀번호 오류는 화면에서 안내).
  if (res.status === 401 && !path.startsWith("/api/auth/")) {
    handleUnauthorized();
    throw new Error("세션이 만료되었습니다. 다시 로그인해 주세요.");
  }
  if (!res.ok) {
    let msg = await res.text();
    try { msg = JSON.parse(msg).message || msg; } catch {}
    throw new Error(msg || `API Error: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

function uploadContent<T>(path: string, title: string, file: File, fields?: Record<string, string>) {
  const formData = new FormData();
  formData.append("title", title);
  Object.entries(fields ?? {}).forEach(([key, value]) => formData.append(key, value));
  formData.append("file", file);
  return request<T>(path, { method: "POST", body: formData });
}

function withStringId<T extends { id: string | number }>(item: T): Omit<T, "id"> & { id: string } {
  return { ...item, id: String(item.id) };
}

function listWithStringIds<T extends { id: string | number }>(items: T[]) {
  return items.map(withStringId);
}

export const api = {
  login: (loginId: string, password: string) => 
    request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ loginId, password })
    }),
    
  adminLogin: (loginId: string, password: string) => 
    request<AuthResponse>("/api/auth/admin/login", {
      method: "POST",
      body: JSON.stringify({ loginId, password })
    }),

  listClasses: () => request<ClassDto[]>("/api/classes"),

  getClassRecitations: (classId: number, date?: string) =>
    request<StudentRecitationDto[]>(
      `/api/classes/${classId}/recitations${date ? `?date=${date}` : ""}`
    ),

  createStudent: (classId: number, body: { name: string; birthDate?: string; parentName?: string }) =>
    request<StudentRecitationDto>(
      `/api/classes/${classId}/students`,
      { method: "POST", body: JSON.stringify(body) }
    ),

  updateTeacher: (teacherId: number, name: string) =>
    request<PersonProfileDto>(
      `/api/teachers/${teacherId}`,
      { method: "PUT", body: JSON.stringify({ name }) }
    ),

  updateStudent: (studentId: number, body: { name: string; birthDate?: string; parentName?: string }) =>
    request<PersonProfileDto>(
      `/api/students/${studentId}`,
      { method: "PUT", body: JSON.stringify(body) }
    ),

  toggleRecitation: (studentId: number, lessonNumber: number, type: string, success: boolean | null, teacherId: number, date?: string) =>
    request<StudentRecitationDto>(
      `/api/students/${studentId}/recitation${date ? `?date=${date}` : ""}`,
      { method: "PUT", body: JSON.stringify({ lessonNumber, type, success, teacherId }) }
    ),

  submitStudent: (studentId: number, date?: string) =>
    request<StudentRecitationDto>(
      `/api/students/${studentId}/submit${date ? `?date=${date}` : ""}`,
      { method: "POST" }
    ),

  unlockStudentSubmission: (studentId: number, date?: string) =>
    request<StudentRecitationDto>(
      `/api/admin/students/${studentId}/unlock${date ? `?date=${date}` : ""}`,
      { method: "POST" }
    ),

  getAdminScores: (date?: string) =>
    request<StudentRecitationDto[]>(
      `/api/admin/scores${date ? `?date=${date}` : ""}`
    ),

  getAdminProfiles: () => request<PersonProfileDto[]>("/api/admin/profiles"),

  listWeeklyPhotos: () => request<WeeklyPhoto[]>("/api/content/weekly-photos").then(listWithStringIds),
  addWeeklyPhoto: (title: string, file: File) => uploadContent<WeeklyPhoto>("/api/admin/content/weekly-photos", title, file).then(withStringId),
  deleteWeeklyPhoto: (id: string) => request<void>(`/api/admin/content/weekly-photos/${id}`, { method: "DELETE" }),

  listScheduleImages: () => request<ScheduleImage[]>("/api/content/schedule-images").then(listWithStringIds),
  addScheduleImage: (title: string, file: File) => uploadContent<ScheduleImage>("/api/admin/content/schedule-images", title, file).then(withStringId),
  activateScheduleImage: (id: string) => request<ScheduleImage>(`/api/admin/content/schedule-images/${id}/active`, { method: "PUT" }).then(withStringId),
  deleteScheduleImage: (id: string) => request<void>(`/api/admin/content/schedule-images/${id}`, { method: "DELETE" }),

  listFoundationMaterials: () => request<FoundationMaterial[]>("/api/content/foundation-materials").then(listWithStringIds),
  addFoundationMaterial: (title: string, file: File, ageGroup = "AGE_3_4") => uploadContent<FoundationMaterial>("/api/admin/content/foundation-materials", title, file, { ageGroup }).then(withStringId),
  activateFoundationMaterial: (id: string) => request<FoundationMaterial>(`/api/admin/content/foundation-materials/${id}/active`, { method: "PUT" }).then(withStringId),
  deleteFoundationMaterial: (id: string) => request<void>(`/api/admin/content/foundation-materials/${id}`, { method: "DELETE" }),

  getBandConfig: () => request<BandConfig>("/api/admin/band/config"),
  saveBandConfig: (body: { accessToken?: string; bandKey?: string; photoAlbumKey?: string; enabled?: boolean }) =>
    request<BandConfig>("/api/admin/band/config", { method: "PUT", body: JSON.stringify(body) }),
  listBandBands: () => request<BandOption[]>("/api/admin/band/bands"),
  listBandAlbums: (bandKey: string) => request<BandOption[]>(`/api/admin/band/albums?bandKey=${encodeURIComponent(bandKey)}`),
  syncBandPhotos: () => request<BandSyncResult>("/api/admin/band/sync", { method: "POST" }),

  listNotices: () => request<AdminNotice[]>("/api/content/notices").then(listWithStringIds),
  listAdminNotices: () => request<AdminNotice[]>("/api/admin/content/notices").then(listWithStringIds),
  addNotice: (notice: Omit<AdminNotice, "id" | "createdAt">) => request<AdminNotice>("/api/admin/content/notices", { method: "POST", body: JSON.stringify(notice) }).then(withStringId),
  deleteNotice: (id: string) => request<void>(`/api/admin/content/notices/${id}`, { method: "DELETE" }),

  listLessonVideos: () => request<LessonVideo[]>("/api/content/lesson-videos")
    .then(listWithStringIds)
    .then((videos) => videos.length > 0 ? videos : DEFAULT_LESSON_VIDEOS),
  replaceLessonVideos: (videos: LessonVideo[]) => request<LessonVideo[]>("/api/admin/content/lesson-videos", {
      method: "PUT",
      body: JSON.stringify(videos.map(({ id: _id, ...video }) => video)),
    })
    .then(listWithStringIds),

  uploadProfile: (file: File, type: "teacher" | "student", id: number) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    formData.append("id", id.toString());
    return request<{ url: string }>("/api/profiles/upload", {
      method: "POST",
      body: formData
    });
  }
};
