import { create } from "zustand";
import { api } from "@/lib/tauri";
import type { FootPoint, FootRecord } from "@/types/record";

type DatasetState = {
  path: string | null;
  /** image_file values from the records table, sorted. */
  images: string[];
  records: Map<string, FootRecord>;
  currentIndex: number;
  /** Session-only set of images that have been displayed. */
  viewedSet: Set<string>;
  imageSize: { width: number; height: number } | null;
  open: (path: string) => Promise<void>;
  close: () => void;
  setIndex: (i: number) => void;
  markViewed: (imageFile: string) => void;
  setFoot: (imageFile: string, foot: FootPoint | null) => void;
  setImageSize: (size: { width: number; height: number } | null) => void;
  removeImage: (imageFile: string) => void;
  currentImage: () => string | null;
  currentRecord: () => FootRecord | null;
};

export const useDatasetStore = create<DatasetState>((set, get) => ({
  path: null,
  images: [],
  records: new Map(),
  currentIndex: 0,
  viewedSet: new Set(),
  imageSize: null,

  open: async (path) => {
    const { records } = await api.openDataset(path);
    const map = new Map(records.map((r) => [r.image_file, r]));
    const images = [...map.keys()].sort();
    set({
      path,
      images,
      records: map,
      currentIndex: 0,
      viewedSet: new Set(),
      imageSize: null,
    });
  },

  close: () => {
    set({
      path: null,
      images: [],
      records: new Map(),
      currentIndex: 0,
      viewedSet: new Set(),
      imageSize: null,
    });
  },

  setIndex: (i) => {
    const { images, currentIndex } = get();
    if (images.length === 0) return;
    const clamped = Math.max(0, Math.min(images.length - 1, i));
    if (clamped === currentIndex) return;
    set({ currentIndex: clamped, imageSize: null });
  },

  markViewed: (imageFile) => {
    const current = get().viewedSet;
    if (current.has(imageFile)) return;
    const next = new Set(current);
    next.add(imageFile);
    set({ viewedSet: next });
  },

  setFoot: (imageFile, foot) => {
    const { records } = get();
    const record = records.get(imageFile);
    if (!record) return;
    const next = new Map(records);
    next.set(imageFile, {
      ...record,
      foot_x: foot ? foot.foot_x : null,
      foot_y: foot ? foot.foot_y : null,
    });
    set({ records: next });
  },

  setImageSize: (size) => {
    set({ imageSize: size });
  },

  removeImage: (imageFile) => {
    const { images, records, viewedSet, currentIndex } = get();
    const nextImages = images.filter((n) => n !== imageFile);
    const nextRecords = new Map(records);
    nextRecords.delete(imageFile);
    const nextViewed = new Set(viewedSet);
    nextViewed.delete(imageFile);
    const currentName = images[currentIndex];
    let nextIndex = currentIndex;
    if (currentName === imageFile) {
      // Keep the same position, which now points at the next image.
      nextIndex = Math.max(0, Math.min(nextImages.length - 1, currentIndex));
    } else if (currentName !== undefined) {
      const pos = nextImages.indexOf(currentName);
      nextIndex = pos >= 0 ? pos : 0;
    }
    set({
      images: nextImages,
      records: nextRecords,
      viewedSet: nextViewed,
      currentIndex: nextIndex,
      imageSize: null,
    });
  },

  currentImage: () => {
    const { images, currentIndex } = get();
    return images[currentIndex] ?? null;
  },

  currentRecord: () => {
    const { records } = get();
    const name = get().currentImage();
    return name ? records.get(name) ?? null : null;
  },
}));
