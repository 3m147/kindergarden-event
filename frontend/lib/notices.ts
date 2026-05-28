"use client";

export const ADMIN_NOTICES_STORAGE_KEY = "admin_notices";

export type AdminNotice = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  showToTeachers?: boolean;
};

const DEVELOPMENT_ADMIN_NOTICES: AdminNotice[] = [
  {
    id: "demo-teacher-notice",
    title: "테스트 공지",
    content: "선생님 화면 공지 팝업 테스트입니다. 관리자 공지 버튼이 노란색일 때 등록한 글은 이 위치에 표시됩니다.",
    createdAt: "2026-05-24T00:00:00.000Z",
    showToTeachers: true,
  },
];

export function readAdminNotices() {
  const savedNotices = localStorage.getItem(ADMIN_NOTICES_STORAGE_KEY);
  if (savedNotices) {
    return JSON.parse(savedNotices) as AdminNotice[];
  }

  return process.env.NODE_ENV === "development" ? DEVELOPMENT_ADMIN_NOTICES : [];
}

export function writeAdminNotices(notices: AdminNotice[]) {
  localStorage.setItem(ADMIN_NOTICES_STORAGE_KEY, JSON.stringify(notices));
}
