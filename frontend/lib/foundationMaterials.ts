"use client";

export const FOUNDATION_MATERIALS_STORAGE_KEY = "foundation_materials";

export type FoundationMaterial = {
  id: string;
  title: string;
  fileName: string;
  pdfUrl: string;
  createdAt: string;
  isActive: boolean;
  ageGroup?: FoundationAgeGroup;
};

export type FoundationAgeGroup = "AGE_3_4" | "AGE_5";

export function getFoundationAgeGroupForClass(className?: string | null): FoundationAgeGroup {
  return className?.includes("만 5") ? "AGE_5" : "AGE_3_4";
}

export function getFoundationAgeGroupLabel(ageGroup: FoundationAgeGroup) {
  return ageGroup === "AGE_5" ? "5세" : "3,4세";
}

export function readFoundationMaterials() {
  const savedMaterials = localStorage.getItem(FOUNDATION_MATERIALS_STORAGE_KEY);
  if (!savedMaterials) return [];

  return JSON.parse(savedMaterials) as FoundationMaterial[];
}

export function writeFoundationMaterials(materials: FoundationMaterial[]) {
  localStorage.setItem(FOUNDATION_MATERIALS_STORAGE_KEY, JSON.stringify(materials));
}

export function getActiveFoundationMaterial(materials = readFoundationMaterials(), ageGroup: FoundationAgeGroup = "AGE_3_4") {
  const groupedMaterials = materials.filter((material) => (material.ageGroup ?? "AGE_3_4") === ageGroup);
  return groupedMaterials.find((material) => material.isActive) ?? groupedMaterials[0] ?? null;
}
