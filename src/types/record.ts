export type FootRecord = {
  image_file: string;
  foot_x: number | null;
  foot_y: number | null;
  bb_in_context_x_min: number;
  bb_in_context_y_min: number;
  bb_in_context_x_max: number;
  bb_in_context_y_max: number;
};

export type FootPoint = { foot_x: number; foot_y: number };

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";
