import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import type { FootRecord } from "@/types/record";

export type OpenedDataset = {
  records: FootRecord[];
};

export type DeleteFailure = { image_file: string; reason: string };
export type DeleteReport = { deleted: string[]; failed: DeleteFailure[] };

export const api = {
  openDataset: (path: string) =>
    invoke<OpenedDataset>("open_dataset", { path }),
  writeFoot: (path: string, imageFile: string, footX: number, footY: number) =>
    invoke<void>("write_foot", { path, imageFile, footX, footY }),
  deleteImage: (path: string, imageFile: string) =>
    invoke<DeleteReport>("delete_image", { path, imageFile }),
};

export function contextImageUrl(datasetPath: string, imageFile: string): string {
  // Normalize to the dataset's separator so Windows paths stay consistent.
  const sep = datasetPath.includes("\\") ? "\\" : "/";
  const name = sep === "\\" ? imageFile.replace(/\//g, "\\") : imageFile;
  return convertFileSrc(`${datasetPath}${sep}context_images${sep}${name}`);
}
