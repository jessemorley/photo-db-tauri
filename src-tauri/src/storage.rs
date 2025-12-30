use tauri::AppHandle;
use tauri_plugin_store::StoreExt;
use serde_json::Value;

const STORE_FILE: &str = "settings.json";

pub fn get_setting(app: &AppHandle, key: &str) -> Result<Value, String> {
    let store = app.store(STORE_FILE).map_err(|e| e.to_string())?;
    store.get(key).ok_or_else(|| "Key not found".to_string())
}

pub fn set_setting(app: &AppHandle, key: &str, value: Value) -> Result<(), String> {
    let store = app.store(STORE_FILE).map_err(|e| e.to_string())?;
    store.set(key.to_string(), value);
    store.save().map_err(|e| e.to_string())
}

pub fn delete_setting(app: &AppHandle, key: &str) -> Result<(), String> {
    let store = app.store(STORE_FILE).map_err(|e| e.to_string())?;
    store.delete(key);
    store.save().map_err(|e| e.to_string())
}
