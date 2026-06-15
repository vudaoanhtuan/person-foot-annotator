export type FootRecord = {
  image_file: string;
  foot_x: number | null;
  foot_y: number | null;
  image_width: number;
  image_height: number;
  context_image_x: number;
  context_image_y: number;
};

export type FootPoint = { foot_x: number; foot_y: number };

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";
