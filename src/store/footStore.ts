import { create } from "zustand";
import { api } from "@/lib/tauri";
import type { FootPoint, SaveStatus } from "@/types/record";
import { useDatasetStore } from "./datasetStore";

const AUTOSAVE_MS = 5000;

type FootState = {
  draft: FootPoint | null;
  dirty: boolean;
  status: SaveStatus;
  // The image the draft belongs to. Used to ensure flushes save under the correct name.
  boundImage: string | null;
  loadFor: (imageFile: string) => void;
  setFoot: (foot: FootPoint) => void;
  flush: () => Promise<void>;
  scheduleSave: () => void;
  cancelScheduled: () => void;
};

let saveTimer: number | null = null;

export const useFootStore = create<FootState>((set, get) => ({
  draft: null,
  dirty: false,
  status: "idle",
  boundImage: null,

  loadFor: (imageFile) => {
    get().cancelScheduled();
    const record = useDatasetStore.getState().records.get(imageFile);
    const draft =
      record && record.foot_x != null && record.foot_y != null
        ? { foot_x: record.foot_x, foot_y: record.foot_y }
        : null;
    set({
      draft,
      dirty: false,
      status: draft ? "saved" : "idle",
      boundImage: imageFile,
    });
    useDatasetStore.getState().markViewed(imageFile);
  },

  setFoot: (foot) => {
    set({ draft: foot, dirty: true, status: "dirty" });
    get().scheduleSave();
  },

  scheduleSave: () => {
    get().cancelScheduled();
    saveTimer = window.setTimeout(() => {
      void get().flush();
    }, AUTOSAVE_MS);
  },

  cancelScheduled: () => {
    if (saveTimer !== null) {
      window.clearTimeout(saveTimer);
      saveTimer = null;
    }
  },

  flush: async () => {
    const { dirty, draft, boundImage } = get();
    const path = useDatasetStore.getState().path;
    if (!dirty || !draft || !path || !boundImage) return;
    get().cancelScheduled();
    set({ status: "saving" });
    try {
      await api.writeFoot(path, boundImage, draft.foot_x, draft.foot_y);
      useDatasetStore.getState().setFoot(boundImage, draft);
      // Only clear dirty if the bound image is still the same one we saved.
      if (get().boundImage === boundImage) {
        set({ dirty: false, status: "saved" });
      }
    } catch (e) {
      console.error("writeFoot failed", e);
      if (get().boundImage === boundImage) {
        set({ status: "error" });
      }
    }
  },
}));
