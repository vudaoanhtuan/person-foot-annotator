import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Landing from "@/shared/components/Landing";
import AnnotatorWorkspace from "@/features/annotator/AnnotatorWorkspace";
import { useDatasetStore } from "@/store/datasetStore";
import { useFootStore } from "@/store/footStore";
import {
  useOpenDatasetHotkey,
  useSaveHotkey,
  useCloseDatasetHotkey,
  useToggleLeftSidebarHotkey,
} from "@/lib/hotkeys";
import { installAppMenu } from "@/lib/menu";

export default function App() {
  const path = useDatasetStore((s) => s.path);
  const [version, setVersion] = useState("");

  useOpenDatasetHotkey();
  useSaveHotkey();
  useCloseDatasetHotkey();
  useToggleLeftSidebarHotkey();

  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion("dev"));
    installAppMenu().catch((e) => console.error("menu install failed", e));
  }, []);

  useEffect(() => {
    const w = getCurrentWindow();
    const unlistenP = w.onCloseRequested(async (event) => {
      const { flush, boundImage } = useFootStore.getState();
      if (!boundImage) return;
      event.preventDefault();
      await flush();
      await w.destroy();
    });
    return () => {
      unlistenP.then((un) => un()).catch(() => {});
    };
  }, []);

  if (!path) return <Landing version={version} />;
  return <AnnotatorWorkspace />;
}
