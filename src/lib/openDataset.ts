import { open } from "@tauri-apps/plugin-dialog";
import { useDatasetStore } from "@/store/datasetStore";
import { useFootStore } from "@/store/footStore";

export async function pickAndOpenDataset(): Promise<void> {
  const selected = await open({ directory: true, multiple: false });
  if (!selected || typeof selected !== "string") return;
  // Flush any pending edits from the current dataset before switching.
  await useFootStore.getState().flush();
  useFootStore.setState({
    draft: null,
    dirty: false,
    status: "idle",
    boundImage: null,
  });
  await useDatasetStore.getState().open(selected);
}
