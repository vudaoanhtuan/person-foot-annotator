import { Menu, Submenu, MenuItem, PredefinedMenuItem } from "@tauri-apps/api/menu";
import { CheckMenuItem } from "@tauri-apps/api/menu/checkMenuItem";
import { pickAndOpenDataset } from "./openDataset";
import { closeDataset } from "./closeDataset";
import { deleteCurrentImage } from "./deleteCurrent";
import { useDatasetStore } from "@/store/datasetStore";
import { useFootStore } from "@/store/footStore";
import { useUiStore } from "@/store/uiStore";

function navigate(direction: 1 | -1) {
  const { currentIndex, setIndex } = useDatasetStore.getState();
  setIndex(currentIndex + direction);
}

export async function installAppMenu() {
  // No accelerators on any menu item: native accelerators don't fire on
  // Windows while the webview has focus, so all keyboard shortcuts are
  // handled uniformly by the JS listeners in hotkeys.ts instead.
  const openItem = await MenuItem.new({
    id: "open-dataset",
    text: "Open Dataset",
    action: () => {
      void pickAndOpenDataset();
    },
  });

  const saveItem = await MenuItem.new({
    id: "save",
    text: "Save",
    action: () => {
      void useFootStore.getState().flush();
    },
  });

  const closeItem = await MenuItem.new({
    id: "close-dataset",
    text: "Close Dataset",
    action: () => {
      void closeDataset();
    },
  });

  const appQuit = await PredefinedMenuItem.new({ item: "Quit" });

  const appMenu = await Submenu.new({
    text: "Person Foot Annotator",
    items: [appQuit],
  });

  const fileMenu = await Submenu.new({
    text: "File",
    items: [openItem, saveItem, closeItem],
  });

  const nextItem = await MenuItem.new({
    id: "image-next",
    text: "Next Image",
    action: () => navigate(1),
  });

  const prevItem = await MenuItem.new({
    id: "image-prev",
    text: "Previous Image",
    action: () => navigate(-1),
  });

  const imageSep = await PredefinedMenuItem.new({ item: "Separator" });

  const deleteItem = await MenuItem.new({
    id: "image-delete",
    text: "Delete Image",
    action: () => {
      void deleteCurrentImage();
    },
  });

  const imageMenu = await Submenu.new({
    text: "Image",
    items: [nextItem, prevItem, imageSep, deleteItem],
  });

  const toggleLeftSidebarItem = await CheckMenuItem.new({
    id: "view-toggle-left-sidebar",
    text: "Show Left Sidebar",
    checked: useUiStore.getState().leftSidebarVisible,
    action: () => {
      useUiStore.getState().toggleLeftSidebar();
    },
  });

  useUiStore.subscribe((state, prev) => {
    if (state.leftSidebarVisible !== prev.leftSidebarVisible) {
      void toggleLeftSidebarItem.setChecked(state.leftSidebarVisible);
    }
  });

  const viewMenu = await Submenu.new({
    text: "View",
    items: [toggleLeftSidebarItem],
  });

  const menu = await Menu.new({ items: [appMenu, fileMenu, imageMenu, viewMenu] });
  await menu.setAsAppMenu();
}
