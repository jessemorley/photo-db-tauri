use crate::file_ops::{discover_photographers, get_images as get_images_fs, Photographer, ImageFile};
use crate::storage::{get_setting, set_setting, delete_setting};
use tauri::AppHandle;
use serde_json::json;
use std::process::Command;

#[tauri::command]
pub async fn select_directory(app: AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let folder = app.dialog()
        .file()
        .set_title("Select Photography Folder")
        .blocking_pick_folder();

    if let Some(folder_path) = folder {
        let folder_str = folder_path.as_path()
            .ok_or_else(|| "Failed to get path".to_string())?
            .to_string_lossy()
            .to_string();
        set_setting(&app, "selectedFolder", json!(folder_str))?;
        Ok(Some(folder_str))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn get_photographers(root_path: String) -> Result<Vec<Photographer>, String> {
    discover_photographers(&root_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_images(folder_path: String) -> Result<Vec<ImageFile>, String> {
    get_images_fs(&folder_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_stored_folder(app: AppHandle) -> Result<Option<String>, String> {
    match get_setting(&app, "selectedFolder") {
        Ok(value) => Ok(value.as_str().map(|s| s.to_string())),
        Err(_) => Ok(None)
    }
}

#[tauri::command]
pub async fn clear_stored_folder(app: AppHandle) -> Result<(), String> {
    delete_setting(&app, "selectedFolder")
}

#[tauri::command]
pub async fn get_theme(app: AppHandle) -> Result<String, String> {
    match get_setting(&app, "theme") {
        Ok(value) => Ok(value.as_str().unwrap_or("auto").to_string()),
        Err(_) => Ok("auto".to_string())
    }
}

#[tauri::command]
pub async fn set_theme(theme: String, app: AppHandle) -> Result<(), String> {
    set_setting(&app, "theme", json!(theme))
}

#[tauri::command]
pub async fn get_show_hex(app: AppHandle) -> Result<bool, String> {
    match get_setting(&app, "showHex") {
        Ok(value) => Ok(value.as_bool().unwrap_or(true)),
        Err(_) => Ok(true)
    }
}

#[tauri::command]
pub async fn set_show_hex(show_hex: bool, app: AppHandle) -> Result<(), String> {
    set_setting(&app, "showHex", json!(show_hex))
}

#[tauri::command]
pub async fn get_eyedropper_active(app: AppHandle) -> Result<bool, String> {
    match get_setting(&app, "eyedropperActive") {
        Ok(value) => Ok(value.as_bool().unwrap_or(false)),
        Err(_) => Ok(false)
    }
}

#[tauri::command]
pub async fn set_eyedropper_active(active: bool, app: AppHandle) -> Result<(), String> {
    set_setting(&app, "eyedropperActive", json!(active))
}

#[tauri::command]
pub async fn get_histogram_active(app: AppHandle) -> Result<bool, String> {
    match get_setting(&app, "histogramActive") {
        Ok(value) => Ok(value.as_bool().unwrap_or(false)),
        Err(_) => Ok(false)
    }
}

#[tauri::command]
pub async fn set_histogram_active(active: bool, app: AppHandle) -> Result<(), String> {
    set_setting(&app, "histogramActive", json!(active))
}

#[tauri::command]
pub async fn get_gallery_style(app: AppHandle) -> Result<String, String> {
    match get_setting(&app, "galleryStyle") {
        Ok(value) => Ok(value.as_str().unwrap_or("default").to_string()),
        Err(_) => Ok("default".to_string())
    }
}

#[tauri::command]
pub async fn set_gallery_style(gallery_style: String, app: AppHandle) -> Result<(), String> {
    set_setting(&app, "galleryStyle", json!(gallery_style))
}

#[tauri::command]
pub async fn reveal_in_finder(file_path: String) -> Result<(), String> {
    Command::new("open")
        .args(["-R", &file_path])
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}
