mod commands;
mod process_monitor;
mod tray_manager;

use tauri::AppHandle;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .setup(|app| {
            let handle = app.handle().clone();
            tray_manager::setup_tray(&handle)?;
            process_monitor::start(handle);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}