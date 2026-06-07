import { useDatasetStore } from "@/store/datasetStore";
import { useFootStore } from "@/store/footStore";

export async function closeDataset() {
  if (!useDatasetStore.getState().path) return;
  await useFootStore.getState().flush();
  useFootStore.setState({
    draft: null,
    dirty: false,
    status: "idle",
    boundImage: null,
  });
  useDatasetStore.getState().close();
}
