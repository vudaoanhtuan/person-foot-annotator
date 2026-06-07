import { useEffect } from "react";
import { useDatasetStore } from "@/store/datasetStore";
import { useUiStore } from "@/store/uiStore";
import { pickAndOpenDataset } from "./openDataset";
import { deleteCurrentImage } from "./deleteCurrent";

export function useOpenDatasetHotkey() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        void pickAndOpenDataset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

export function useToggleLeftSidebarHotkey() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return;
      if (e.key.toLowerCase() !== "l") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      useUiStore.getState().toggleLeftSidebar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/**
 * Space / Right arrow -> next image; Shift+Space / Left arrow -> previous image.
 */
export function useNavigationHotkeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      let direction: 1 | -1 | 0 = 0;
      if (e.key === " ") {
        direction = e.shiftKey ? -1 : 1;
      } else if (!e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowUp")) {
        direction = -1;
      } else if (!e.shiftKey && (e.key === "ArrowRight" || e.key === "ArrowDown")) {
        direction = 1;
      }
      if (direction === 0) return;
      e.preventDefault();
      const { currentIndex, setIndex } = useDatasetStore.getState();
      setIndex(currentIndex + direction);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/**
 * Cmd/Ctrl + forward-Delete deletes the current image.
 * Cmd/Ctrl+Backspace is owned by the Image menu accelerator (native), so only
 * the "Delete" key is handled here to avoid double-firing.
 */
export function useDeleteHotkey() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return;
      if (e.key !== "Delete") return;
      e.preventDefault();
      void deleteCurrentImage();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
