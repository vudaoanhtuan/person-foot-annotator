import type { FootRecord } from "@/types/record";

export type AnnotStatus = "annotated" | "empty";
export type ViewStatus = "viewed" | "unviewed";

export function annotStatus(record: FootRecord | undefined): AnnotStatus {
  return record && record.foot_x != null && record.foot_y != null
    ? "annotated"
    : "empty";
}

export function viewStatus(name: string, viewedSet: Set<string>): ViewStatus {
  return viewedSet.has(name) ? "viewed" : "unviewed";
}

export const ANNOT_STATUS_BG: Record<AnnotStatus, string> = {
  annotated: "bg-emerald-500",
  empty: "bg-neutral-300",
};

export const ANNOT_STATUS_LABEL: Record<AnnotStatus, string> = {
  annotated: "Annotated",
  empty: "Not annotated",
};

export const VIEW_STATUS_LABEL: Record<ViewStatus, string> = {
  unviewed: "Unviewed",
  viewed: "Viewed",
};

export const VIEW_STATUS_BG: Record<ViewStatus, string> = {
  unviewed: "bg-neutral-300",
  viewed: "bg-emerald-500",
};
