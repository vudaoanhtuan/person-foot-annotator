import type { FootPoint, FootRecord } from "@/types/record";

export type Rect = { xMin: number; yMin: number; xMax: number; yMax: number };

/** Layout of an object-contain image inside a container box. */
export type ContainLayout = {
  /** Offset of the rendered image's top-left within the container, in container px. */
  offsetX: number;
  offsetY: number;
  /** renderedImagePx / naturalImagePx (uniform for object-contain). */
  scale: number;
};

export function bbRect(record: FootRecord): Rect {
  return {
    xMin: record.context_image_x,
    yMin: record.context_image_y,
    xMax: record.context_image_x + record.image_width,
    yMax: record.context_image_y + record.image_height,
  };
}

/** Default zoom relative to the object-contain fit (< 1 leaves margin around the image). */
export const DEFAULT_ZOOM = 0.75;
/** Fraction of the free vertical space placed above the image; the rest goes below,
 *  leaving room to click foot positions under the image bottom. 0 = image anchored
 *  to the top, all free space at the bottom. */
const TOP_FRACTION = 0;
/** Extra clickable margin (as a fraction of the viewport) kept around an image
 *  that overflows the viewport, so extrapolated clicks remain possible. */
const OVERFLOW_MARGIN = 0.25;

/**
 * Layout of the image inside the scrollable content area.
 * offsetX/offsetY/scale position the image within the content (so they plug
 * into containerToImage/imageToContainer with content-relative coordinates);
 * contentW/contentH size the scroll content. The content matches the viewport
 * while the image fits (no scrollbars) and grows with a margin once it overflows.
 */
export type ContentLayout = ContainLayout & {
  contentW: number;
  contentH: number;
};

export function computeContentLayout(
  viewportW: number,
  viewportH: number,
  naturalW: number,
  naturalH: number,
  /** Explicit zoom scale; defaults to the contain fit × DEFAULT_ZOOM. */
  scale?: number,
): ContentLayout {
  const fit = Math.min(viewportW / naturalW, viewportH / naturalH);
  const s = scale ?? fit * DEFAULT_ZOOM;
  const renderW = naturalW * s;
  const renderH = naturalH * s;
  const contentW =
    renderW <= viewportW ? viewportW : renderW + 2 * viewportW * OVERFLOW_MARGIN;
  const contentH =
    renderH <= viewportH ? viewportH : renderH + 2 * viewportH * OVERFLOW_MARGIN;
  return {
    scale: s,
    offsetX: (contentW - renderW) / 2,
    offsetY: (contentH - renderH) * TOP_FRACTION,
    contentW,
    contentH,
  };
}

/**
 * Container-relative px -> context-image natural px.
 * Linear and unclamped, so positions outside the rendered image extrapolate.
 */
export function containerToImage(
  x: number,
  y: number,
  layout: ContainLayout,
): { cx: number; cy: number } {
  return {
    cx: (x - layout.offsetX) / layout.scale,
    cy: (y - layout.offsetY) / layout.scale,
  };
}

/** Context-image natural px -> container px (for placing overlays). */
export function imageToContainer(
  cx: number,
  cy: number,
  layout: ContainLayout,
): { x: number; y: number } {
  return {
    x: cx * layout.scale + layout.offsetX,
    y: cy * layout.scale + layout.offsetY,
  };
}

/**
 * Context-image px -> foot point normalized relative to the bb center.
 * Bb edges map to ±0.5; values beyond that are allowed (foot outside the bb).
 */
export function imageToFoot(cx: number, cy: number, bb: Rect): FootPoint | null {
  const bbW = bb.xMax - bb.xMin;
  const bbH = bb.yMax - bb.yMin;
  if (bbW <= 0 || bbH <= 0) return null;
  return {
    foot_x: (cx - (bb.xMin + bb.xMax) / 2) / bbW,
    foot_y: (cy - (bb.yMin + bb.yMax) / 2) / bbH,
  };
}

/** Inverse of imageToFoot: normalized foot -> context-image natural px. */
export function footToImage(foot: FootPoint, bb: Rect): { cx: number; cy: number } {
  const bbW = bb.xMax - bb.xMin;
  const bbH = bb.yMax - bb.yMin;
  return {
    cx: (bb.xMin + bb.xMax) / 2 + foot.foot_x * bbW,
    cy: (bb.yMin + bb.yMax) / 2 + foot.foot_y * bbH,
  };
}
