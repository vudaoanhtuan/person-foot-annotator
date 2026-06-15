# Person Foot Annotator

Desktop app (Tauri v2 + React + TypeScript + Tailwind + Zustand) for annotating
the foot position of a person by clicking on an extended context image.

## Dataset format

Open a folder containing:

- `images/` — bounding-box crop images
- `context_images/` — extended bounding-box images (same filenames as `images/`)
- `db.sqlite` — table `records` with columns:
  - `image_file` (TEXT)
  - `foot_x`, `foot_y` (REAL, nullable) — normalized relative to the **center of
    the bounding-box image**: bb edges map to ±0.5, values outside that range
    are allowed (foot outside the bb / context image)
  - `image_width`, `image_height` (REAL) — pixel size of the bb crop image
  - `context_image_x`, `context_image_y` (REAL) — pixel coords of the bb image's
    top-left corner inside the context image

## Annotation

Left-click anywhere in the main workspace to place the foot point. Clicks
outside the displayed image are extrapolated through the display transform:

```
foot_x = (cx − bb_center_x) / bb_width
foot_y = (cy − bb_center_y) / bb_height
```

where `(cx, cy)` is the click position in context-image pixel coordinates.

By default the image is shown at 75% of the contain fit with most of the free
space below it, so foot positions under the image bottom stay clickable.

## Hotkeys

| Key | Action |
| --- | --- |
| `Space` / `→` | Next image |
| `Shift+Space` / `←` | Previous image |
| `Scroll` | Pan (scrollbars appear when the image overflows the viewport) |
| `Cmd/Ctrl+Scroll` | Zoom at cursor |
| `Cmd/Ctrl+=` / `Cmd/Ctrl+-` | Zoom in / out |
| `Cmd/Ctrl+0` | Reset zoom |
| `Cmd/Ctrl+Backspace` (or `Cmd/Ctrl+Delete`) | Delete current image (moves files to `trash/`, removes the DB row) |
| `Cmd/Ctrl+O` | Open dataset |
| `Cmd/Ctrl+S` | Save now |
| `Cmd/Ctrl+W` | Close dataset |
| `Cmd/Ctrl+L` | Toggle image list sidebar |

Annotations auto-save 5 s after the last edit, and immediately on image change,
dataset close, and window close.

## Development

```sh
pnpm install
pnpm tauri dev
```

Generate a sample dataset (requires Pillow):

```sh
python3 scripts/make_test_dataset.py /tmp/foot-test-dataset 12
```

## Build

```sh
pnpm tauri build
```

App icons are generated from `src-tauri/icons/icon.svg`:

```sh
rsvg-convert -w 1024 -h 1024 src-tauri/icons/icon.svg -o src-tauri/icons/icon-1024.png
pnpm tauri icon src-tauri/icons/icon-1024.png
```
