import { api } from "@/lib/tauri";
import { useDatasetStore } from "@/store/datasetStore";
import { useFootStore } from "@/store/footStore";

/** Delete the current image (move files to trash/, drop the DB row) and select the next one. */
export async function deleteCurrentImage() {
  const ds = useDatasetStore.getState();
  const name = ds.currentImage();
  if (!ds.path || !name) return;
  // Discard any pending edits for the image being deleted.
  useFootStore.getState().cancelScheduled();
  useFootStore.setState({
    draft: null,
    dirty: false,
    status: "idle",
    boundImage: null,
  });
  try {
    const report = await api.deleteImage(ds.path, name);
    if (report.deleted.includes(name)) {
      useDatasetStore.getState().removeImage(name);
    } else {
      console.error("delete failed", report.failed);
    }
  } catch (e) {
    console.error("delete failed", e);
  }
}
