import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { contextImageUrl } from "@/lib/tauri";
import {
  bbRect,
  computeContentLayout,
  containerToImage,
  footToImage,
  imageToContainer,
  imageToFoot,
} from "@/lib/geometry";
import { useDatasetStore } from "@/store/datasetStore";
import { useFootStore } from "@/store/footStore";
import type { FootRecord } from "@/types/record";

const MARKER_RADIUS = 8;
/** Zoom limits relative to the object-contain fit scale. */
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 16;
const KEY_ZOOM_STEP = 1.25;
const WHEEL_ZOOM_SPEED = 0.01;

export default function ContextViewer({
  datasetPath,
  record,
}: {
  datasetPath: string;
  record: FootRecord;
}) {
  const setImageSize = useDatasetStore((s) => s.setImageSize);
  const draft = useFootStore((s) => s.draft);

  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  // Explicit zoom scale (image px -> screen px); null = default fit.
  const [zoomScale, setZoomScale] = useState<number | null>(null);
  // Image point + viewport point to re-align after a zoom re-render.
  const pendingAnchorRef = useRef<{ px: number; py: number; ax: number; ay: number } | null>(null);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () =>
      setViewport({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ready =
    naturalSize !== null && viewport.width > 0 && viewport.height > 0;
  const layout = ready
    ? computeContentLayout(
        viewport.width,
        viewport.height,
        naturalSize.width,
        naturalSize.height,
        zoomScale ?? undefined,
      )
    : null;
  const bb = bbRect(record);

  const applyZoom = (factor: number, anchor?: { x: number; y: number }) => {
    const el = scrollRef.current;
    if (!ready || !layout || !el) return;
    const fitScale = Math.min(
      viewport.width / naturalSize.width,
      viewport.height / naturalSize.height,
    );
    const next = Math.min(
      fitScale * MAX_ZOOM,
      Math.max(fitScale * MIN_ZOOM, layout.scale * factor),
    );
    if (next === layout.scale) return;
    // Viewport point to keep fixed, and the image point currently under it.
    const ax = anchor?.x ?? viewport.width / 2;
    const ay = anchor?.y ?? viewport.height / 2;
    pendingAnchorRef.current = {
      px: (el.scrollLeft + ax - layout.offsetX) / layout.scale,
      py: (el.scrollTop + ay - layout.offsetY) / layout.scale,
      ax,
      ay,
    };
    setZoomScale(next);
  };
  const applyZoomRef = useRef(applyZoom);
  applyZoomRef.current = applyZoom;

  // After the zoomed layout renders, scroll so the anchored image point stays put.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    const pending = pendingAnchorRef.current;
    if (!el || !pending || !layout) return;
    pendingAnchorRef.current = null;
    el.scrollLeft = pending.px * layout.scale + layout.offsetX - pending.ax;
    el.scrollTop = pending.py * layout.scale + layout.offsetY - pending.ay;
  }, [zoomScale]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cmd/Ctrl + scroll zooms at the cursor; plain scroll pans natively.
  // Native listener: React's onWheel is passive, so preventDefault (to stop
  // webview pinch-zoom) wouldn't work there.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      applyZoomRef.current(Math.exp(-e.deltaY * WHEEL_ZOOM_SPEED), {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Cmd/Ctrl + "+"/"=" zoom in, "-"/"_" zoom out, "0" reset.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        applyZoomRef.current(KEY_ZOOM_STEP);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        applyZoomRef.current(1 / KEY_ZOOM_STEP);
      } else if (e.key === "0") {
        e.preventDefault();
        setZoomScale(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onImgLoaded = (img: HTMLImageElement) => {
    const { naturalWidth, naturalHeight } = img;
    if (naturalWidth <= 0) return;
    setNaturalSize((prev) =>
      prev && prev.width === naturalWidth && prev.height === naturalHeight
        ? prev
        : { width: naturalWidth, height: naturalHeight },
    );
    setImageSize({ width: naturalWidth, height: naturalHeight });
  };

  const onClick = (e: React.MouseEvent) => {
    if (!layout || e.button !== 0) return;
    // Content-relative coordinates; scroll position is already baked into the rect.
    const rect = contentRef.current!.getBoundingClientRect();
    const { cx, cy } = containerToImage(
      e.clientX - rect.left,
      e.clientY - rect.top,
      layout,
    );
    const foot = imageToFoot(cx, cy, bb);
    if (!foot) return;
    useFootStore.getState().setFoot(foot);
  };

  const imageStyle =
    layout && naturalSize
      ? {
          left: layout.offsetX,
          top: layout.offsetY,
          width: naturalSize.width * layout.scale,
          height: naturalSize.height * layout.scale,
        }
      : undefined;
  const bbTopLeft = layout ? imageToContainer(bb.xMin, bb.yMin, layout) : null;
  const bbBottomRight = layout ? imageToContainer(bb.xMax, bb.yMax, layout) : null;
  const marker =
    layout && draft
      ? (() => {
          const { cx, cy } = footToImage(draft, bb);
          return imageToContainer(cx, cy, layout);
        })()
      : null;
  const bbCenter = layout
    ? imageToContainer((bb.xMin + bb.xMax) / 2, (bb.yMin + bb.yMax) / 2, layout)
    : null;

  return (
    <div
      ref={scrollRef}
      className="relative w-full h-full min-w-0 overflow-auto select-none"
    >
      <div
        ref={contentRef}
        onClick={onClick}
        className="relative cursor-crosshair"
        style={
          layout
            ? { width: layout.contentW, height: layout.contentH }
            : { width: "100%", height: "100%" }
        }
      >
        <img
          src={contextImageUrl(datasetPath, record.image_file)}
          alt={record.image_file}
          draggable={false}
          className={`absolute pointer-events-none max-w-none ${imageStyle ? "" : "opacity-0"}`}
          style={imageStyle}
          // The component remounts per image; a memory-cached image can already be
          // complete before onLoad is attached, so also check in the ref callback.
          ref={(img) => {
            if (img && img.complete && img.naturalWidth > 0) onImgLoaded(img);
          }}
          onLoad={(e) => onImgLoaded(e.currentTarget)}
        />
        {layout && bbTopLeft && bbBottomRight && (
          <svg
            className="absolute inset-0 pointer-events-none"
            width={layout.contentW}
            height={layout.contentH}
          >
            <rect
              x={bbTopLeft.x}
              y={bbTopLeft.y}
              width={bbBottomRight.x - bbTopLeft.x}
              height={bbBottomRight.y - bbTopLeft.y}
              fill="none"
              stroke="#2563eb"
              strokeWidth={2}
            />
            {marker && bbCenter && (
              <line
                x1={bbCenter.x}
                y1={bbCenter.y}
                x2={marker.x}
                y2={marker.y}
                stroke="#ff0000"
                strokeWidth={1}
              />
            )}
            {marker && (
              <circle
                cx={marker.x}
                cy={marker.y}
                r={MARKER_RADIUS}
                fill="#ff0000"
              />
            )}
          </svg>
        )}
      </div>
    </div>
  );
}
