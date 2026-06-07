import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useDatasetStore } from "@/store/datasetStore";
import {
  annotStatus,
  viewStatus,
  ANNOT_STATUS_BG,
  ANNOT_STATUS_LABEL,
  VIEW_STATUS_LABEL,
} from "@/lib/status";

const ROW_HEIGHT = 32;

export default function ImageList() {
  const images = useDatasetStore((s) => s.images);
  const currentIndex = useDatasetStore((s) => s.currentIndex);
  const setIndex = useDatasetStore((s) => s.setIndex);
  const records = useDatasetStore((s) => s.records);
  const viewedSet = useDatasetStore((s) => s.viewedSet);

  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: images.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  useEffect(() => {
    virtualizer.scrollToIndex(currentIndex, { align: "auto" });
  }, [currentIndex, virtualizer]);

  let annotatedCount = 0;
  for (const name of images) {
    if (annotStatus(records.get(name)) === "annotated") annotatedCount++;
  }

  return (
    <div className="flex-1 min-h-0 w-full border-r border-neutral-200 bg-white flex flex-col">
      <div className="px-3 py-2 text-xs uppercase tracking-wide text-neutral-500 border-b border-neutral-200">
        Images ({annotatedCount} / {images.length})
      </div>
      <div ref={parentRef} className="flex-1 min-h-0 overflow-y-auto always-scrollbar">
        {images.length === 0 ? (
          <div className="px-3 py-4 text-sm text-neutral-500">No images</div>
        ) : (
          <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((item) => {
              const name = images[item.index];
              const as = annotStatus(records.get(name));
              const vs = viewStatus(name, viewedSet);
              const isCurrent = item.index === currentIndex;
              const dim = vs === "unviewed" && !isCurrent;
              return (
                <div
                  key={item.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: item.size,
                    transform: `translateY(${item.start}px)`,
                  }}
                  onClick={() => setIndex(item.index)}
                  className={`flex items-center gap-2 px-3 cursor-pointer text-sm truncate ${
                    isCurrent
                      ? "bg-blue-100 text-blue-900"
                      : dim
                        ? "hover:bg-neutral-100 text-neutral-400"
                        : "hover:bg-neutral-100 text-neutral-800"
                  }`}
                  title={`${name} — ${ANNOT_STATUS_LABEL[as]} · ${VIEW_STATUS_LABEL[vs]}`}
                >
                  <span
                    className={`inline-block w-2 h-2 rounded-full shrink-0 ${ANNOT_STATUS_BG[as]}`}
                    aria-label={ANNOT_STATUS_LABEL[as]}
                  />
                  <span className="truncate">{name}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
