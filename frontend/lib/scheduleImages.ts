"use client";

export const SCHEDULE_IMAGES_STORAGE_KEY = "kindergarten_schedule_images";

export type ScheduleImage = {
  id: string;
  title: string;
  imageUrl: string;
  fileName: string;
  createdAt: string;
  isActive: boolean;
};

export function readScheduleImages() {
  const savedImages = localStorage.getItem(SCHEDULE_IMAGES_STORAGE_KEY);
  if (!savedImages) return [];

  return JSON.parse(savedImages) as ScheduleImage[];
}

export function writeScheduleImages(images: ScheduleImage[]) {
  localStorage.setItem(SCHEDULE_IMAGES_STORAGE_KEY, JSON.stringify(images));
}

export function getActiveScheduleImage(images = readScheduleImages()) {
  return images.find((image) => image.isActive) ?? images[0] ?? null;
}
