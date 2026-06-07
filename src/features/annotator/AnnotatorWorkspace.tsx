import { useEffect, useRef } from "react";
import { useDatasetStore } from "@/store/datasetStore";
import { useFootStore } from "@/store/footStore";
import { useUiStore } from "@/store/uiStore";
import { useNavigationHotkeys, useDeleteHotkey } from "@/lib/hotkeys";
import ImageList from "./ImageList";
import ContextViewer from "./ContextViewer";
import StatusBar from "./StatusBar";
import WorkspaceLayout from "@/shared/components/WorkspaceLayout";

export default function AnnotatorWorkspace() {
  const path = useDatasetStore((s) => s.path)!;
  const images = useDatasetStore((s) => s.images);
  const records = useDatasetStore((s) => s.records);
  const currentIndex = useDatasetStore((s) => s.currentIndex);
  const loadFor = useFootStore((s) => s.loadFor);
  const flush = useFootStore((s) => s.flush);
  const leftSidebarVisible = useUiStore((s) => s.leftSidebarVisible);

  useNavigationHotkeys();
  useDeleteHotkey();

  const prevImageRef = useRef<string | null>(null);

  useEffect(() => {
    const currentImage = images[currentIndex];
    if (!currentImage) return;
    const prev = prevImageRef.current;
    (async () => {
      if (prev && prev !== currentImage) {
        await flush();
      }
      prevImageRef.current = currentImage;
      loadFor(currentImage);
    })();
  }, [currentIndex, images, loadFor, flush]);

  const currentImage = images[currentIndex];
  const currentRecord = currentImage ? records.get(currentImage) : undefined;

  return (
    <WorkspaceLayout className="border-t border-neutral-200">
      {leftSidebarVisible && (
        <WorkspaceLayout.LeftSideBar>
          <ImageList />
        </WorkspaceLayout.LeftSideBar>
      )}
      <WorkspaceLayout.Main>
        <div className="flex-1 flex min-w-0 bg-neutral-100">
          {currentRecord ? (
            // Remount per image so zoom level and scroll position reset to defaults.
            <ContextViewer
              key={currentRecord.image_file}
              datasetPath={path}
              record={currentRecord}
            />
          ) : (
            <div className="m-auto text-neutral-500">No images in dataset.</div>
          )}
        </div>
      </WorkspaceLayout.Main>
      <WorkspaceLayout.StatusBar>
        <StatusBar />
      </WorkspaceLayout.StatusBar>
    </WorkspaceLayout>
  );
}
