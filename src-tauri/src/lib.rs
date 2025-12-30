mod commands;
mod storage;
mod file_ops;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_store::Builder::default().build())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      select_directory,
      get_photographers,
      get_images,
      get_stored_folder,
      clear_stored_folder,
      get_theme,
      set_theme,
      get_show_hex,
      set_show_hex,
      get_eyedropper_active,
      set_eyedropper_active,
      get_histogram_active,
      set_histogram_active,
      get_gallery_style,
      set_gallery_style,
      reveal_in_finder,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
