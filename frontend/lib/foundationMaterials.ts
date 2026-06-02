"use client";

export const FOUNDATION_MATERIALS_STORAGE_KEY = "foundation_materials";

export type FoundationMaterial = {
  id: string;
  title: string;
  fileName: string;
  pdfUrl: string;
  createdAt: string;
  isActive: boolean;
};

export function readFoundationMaterials() {
  const savedMaterials = localStorage.getItem(FOUNDATION_MATERIALS_STORAGE_KEY);
  if (!savedMaterials) return [];

  return JSON.parse(savedMaterials) as FoundationMaterial[];
}

export function writeFoundationMaterials(materials: FoundationMaterial[]) {
  localStorage.setItem(FOUNDATION_MATERIALS_STORAGE_KEY, JSON.stringify(materials));
}

export function getActiveFoundationMaterial(materials = readFoundationMaterials()) {
  return materials.find((material) => material.isActive) ?? materials[0] ?? null;
}
