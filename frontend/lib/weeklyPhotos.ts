"use client";

export const WEEKLY_PHOTOS_STORAGE_KEY = "weekly_kindergarten_photos";

export type WeeklyPhoto = {
  id: string;
  title: string;
  imageUrl: string;
  createdAt: string;
};

const DEVELOPMENT_WEEKLY_PHOTOS: WeeklyPhoto[] = [
  {
    id: "demo-weekly-photo-1",
    title: "주일 공과 활동",
    imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=80",
    createdAt: "2026-05-24T00:00:00.000Z",
  },
  {
    id: "demo-weekly-photo-2",
    title: "찬양과 율동 시간",
    imageUrl: "https://images.unsplash.com/photo-1544776193-352d25ca82cd?auto=format&fit=crop&w=900&q=80",
    createdAt: "2026-05-24T00:01:00.000Z",
  },
  {
    id: "demo-weekly-photo-3",
    title: "친구들과 함께한 놀이",
    imageUrl: "https://images.unsplash.com/photo-1564429238817-393bd4286b2d?auto=format&fit=crop&w=900&q=80",
    createdAt: "2026-05-24T00:02:00.000Z",
  },
];

export function readWeeklyPhotos() {
  const savedPhotos = localStorage.getItem(WEEKLY_PHOTOS_STORAGE_KEY);
  if (savedPhotos) {
    return JSON.parse(savedPhotos) as WeeklyPhoto[];
  }

  return process.env.NODE_ENV === "development" ? DEVELOPMENT_WEEKLY_PHOTOS : [];
}

export function writeWeeklyPhotos(photos: WeeklyPhoto[]) {
  localStorage.setItem(WEEKLY_PHOTOS_STORAGE_KEY, JSON.stringify(photos));
}
