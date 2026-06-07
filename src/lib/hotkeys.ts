import { useEffect } from "react";
import { useDatasetStore } from "@/store/datasetStore";
import { useFootStore } from "@/store/footStore";
import { useUiStore } from "@/store/uiStore";
import { pickAndOpenDataset } from "./openDataset";
import { closeDataset } from "./closeDataset";
import { deleteCurrentImage } from "./deleteCurrent";

// All keyboard shortcuts are handled here in JS. The native menu (menu.ts)
// has no accelerators because they don't fire on Windows while the webview
// has focus, and a single code path is simpler than per-platform splits.

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

/**
 * Cmd/Ctrl+S saves pending annotations. preventDefault stops WebView2's
 * built-in "Save page" dialog.
 */
export function useSaveHotkey() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return;
      if (e.key.toLowerCase() !== "s") return;
      e.preventDefault();
      void useFootStore.getState().flush();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/** Cmd/Ctrl+W closes the dataset. */
export function useCloseDatasetHotkey() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return;
      if (e.key.toLowerCase() !== "w") return;
      e.preventDefault();
      void closeDataset();
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
 * Space / Right/Down arrow -> next image;
 * Shift+Space / Left/Up arrow -> previous image.
 */
export function useNavigationHotkeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      let direction: 1 | -1 | 0 = 0;
      if (e.code === "Space") {
        direction = e.shiftKey ? -1 : 1;
      } else if (e.shiftKey) {
        return;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        direction = -1;
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
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

/** Cmd/Ctrl + Backspace or forward-Delete deletes the current image. */
export function useDeleteHotkey() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return;
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      e.preventDefault();
      void deleteCurrentImage();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
