#!/usr/bin/env python3
"""Generate a small test dataset for Person Foot Annotator.

Usage: python3 scripts/make_test_dataset.py <output_dir> [num_images]

Creates:
  <output_dir>/images/            bounding-box crops
  <output_dir>/context_images/    context images with the bb drawn as a rectangle
  <output_dir>/db.sqlite          records table; most rows unannotated,
                                  the first row pre-annotated at the bb bottom-center
"""
import random
import sqlite3
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit("Pillow is required: pip install Pillow")

CONTEXT_W, CONTEXT_H = 640, 512


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    out = Path(sys.argv[1])
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 12

    images_dir = out / "images"
    context_dir = out / "context_images"
    images_dir.mkdir(parents=True, exist_ok=True)
    context_dir.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(out / "db.sqlite")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS records (
          image_file TEXT PRIMARY KEY,
          foot_x REAL,
          foot_y REAL,
          image_width REAL,
          image_height REAL,
          context_image_x REAL,
          context_image_y REAL
        )
        """
    )
    conn.execute("DELETE FROM records")

    rng = random.Random(42)
    for i in range(n):
        name = f"person_{i:03d}.png"
        bb_w = rng.randint(80, 180)
        bb_h = rng.randint(160, 320)
        x_min = rng.randint(20, CONTEXT_W - bb_w - 20)
        y_min = rng.randint(20, CONTEXT_H - bb_h - 20)
        x_max, y_max = x_min + bb_w, y_min + bb_h

        bg = (
            rng.randint(150, 230),
            rng.randint(150, 230),
            rng.randint(150, 230),
        )
        ctx = Image.new("RGB", (CONTEXT_W, CONTEXT_H), bg)
        draw = ImageDraw.Draw(ctx)
        # Light grid to make extrapolated clicks easy to eyeball.
        for gx in range(0, CONTEXT_W, 64):
            draw.line([(gx, 0), (gx, CONTEXT_H)], fill=(255, 255, 255), width=1)
        for gy in range(0, CONTEXT_H, 64):
            draw.line([(0, gy), (CONTEXT_W, gy)], fill=(255, 255, 255), width=1)
        # The "person" bb area.
        draw.rectangle([x_min, y_min, x_max - 1, y_max - 1], fill=(90, 110, 160))
        draw.text((x_min + 4, y_min + 4), name, fill=(255, 255, 255))
        ctx.save(context_dir / name)

        crop = ctx.crop((x_min, y_min, x_max, y_max))
        crop.save(images_dir / name)

        # Pre-annotate the first image at the bb bottom-center (foot = (0, 0.5)).
        foot = (0.0, 0.5) if i == 0 else (None, None)
        conn.execute(
            "INSERT INTO records VALUES (?, ?, ?, ?, ?, ?, ?)",
            (name, foot[0], foot[1], bb_w, bb_h, x_min, y_min),
        )

    conn.commit()
    conn.close()
    print(f"Created {n} images under {out}")


if __name__ == "__main__":
    main()
