use rusqlite::{params, Connection};
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

fn db_path(dataset: &str) -> PathBuf {
    Path::new(dataset).join("db.sqlite")
}

fn images_dir(dataset: &str) -> PathBuf {
    Path::new(dataset).join("images")
}

fn context_dir(dataset: &str) -> PathBuf {
    Path::new(dataset).join("context_images")
}

fn trash_dir(dataset: &str) -> PathBuf {
    Path::new(dataset).join("trash")
}

#[derive(Serialize)]
pub struct FootRecord {
    image_file: String,
    foot_x: Option<f64>,
    foot_y: Option<f64>,
    image_width: f64,
    image_height: f64,
    context_image_x: f64,
    context_image_y: f64,
}

#[derive(Serialize)]
pub struct OpenedDataset {
    records: Vec<FootRecord>,
}

#[tauri::command]
pub fn open_dataset(path: String) -> Result<OpenedDataset, String> {
    let db = db_path(&path);
    if !db.is_file() {
        return Err(format!("db.sqlite not found under: {path}"));
    }
    if !context_dir(&path).is_dir() {
        return Err(format!("'context_images' subfolder not found under: {path}"));
    }
    let conn = Connection::open(&db).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT image_file, foot_x, foot_y, \
             image_width, image_height, \
             context_image_x, context_image_y \
             FROM records ORDER BY image_file",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(FootRecord {
                image_file: row.get(0)?,
                foot_x: row.get(1)?,
                foot_y: row.get(2)?,
                image_width: row.get(3)?,
                image_height: row.get(4)?,
                context_image_x: row.get(5)?,
                context_image_y: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut records = Vec::new();
    for r in rows {
        records.push(r.map_err(|e| e.to_string())?);
    }
    Ok(OpenedDataset { records })
}

#[tauri::command]
pub fn write_foot(
    path: String,
    image_file: String,
    foot_x: f64,
    foot_y: f64,
) -> Result<(), String> {
    let conn = Connection::open(db_path(&path)).map_err(|e| e.to_string())?;
    let n = conn
        .execute(
            "UPDATE records SET foot_x = ?1, foot_y = ?2 WHERE image_file = ?3",
            params![foot_x, foot_y, image_file],
        )
        .map_err(|e| e.to_string())?;
    if n == 0 {
        return Err(format!("no record for image_file: {image_file}"));
    }
    Ok(())
}

#[derive(Serialize)]
pub struct DeleteFailure {
    image_file: String,
    reason: String,
}

#[derive(Serialize)]
pub struct DeleteReport {
    deleted: Vec<String>,
    failed: Vec<DeleteFailure>,
}

/// Move `src` to `dst` if it exists. Returns whether a move happened.
fn move_if_exists(src: &Path, dst: &Path) -> Result<bool, String> {
    if !src.exists() {
        return Ok(false);
    }
    if let Some(parent) = dst.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::rename(src, dst).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn delete_image(path: String, image_file: String) -> Result<DeleteReport, String> {
    let mut deleted = Vec::new();
    let mut failed = Vec::new();

    let img_src = images_dir(&path).join(&image_file);
    let img_dst = trash_dir(&path).join("images").join(&image_file);
    let ctx_src = context_dir(&path).join(&image_file);
    let ctx_dst = trash_dir(&path).join("context_images").join(&image_file);

    // Move both files first (tolerating missing files), then delete the DB row.
    let img_moved = match move_if_exists(&img_src, &img_dst) {
        Ok(moved) => moved,
        Err(e) => {
            failed.push(DeleteFailure {
                image_file,
                reason: format!("failed to move crop image: {e}"),
            });
            return Ok(DeleteReport { deleted, failed });
        }
    };
    if let Err(e) = move_if_exists(&ctx_src, &ctx_dst) {
        // Roll back the crop move so the dataset stays consistent.
        if img_moved {
            let _ = fs::rename(&img_dst, &img_src);
        }
        failed.push(DeleteFailure {
            image_file,
            reason: format!("failed to move context image: {e}"),
        });
        return Ok(DeleteReport { deleted, failed });
    }

    let db_result = Connection::open(db_path(&path))
        .and_then(|conn| {
            conn.execute(
                "DELETE FROM records WHERE image_file = ?1",
                params![image_file],
            )
        })
        .map_err(|e| e.to_string());
    match db_result {
        Ok(_) => deleted.push(image_file),
        Err(e) => {
            // Roll back file moves so files and DB stay in sync.
            let _ = fs::rename(&ctx_dst, &ctx_src);
            if img_moved {
                let _ = fs::rename(&img_dst, &img_src);
            }
            failed.push(DeleteFailure {
                image_file,
                reason: format!("db delete failed: {e}"),
            });
        }
    }
    Ok(DeleteReport { deleted, failed })
}
