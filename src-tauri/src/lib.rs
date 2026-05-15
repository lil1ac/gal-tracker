mod commands;
mod process_monitor;
mod tray_manager;

use commands::{get_running_processes, get_configured_processes, save_process_config, delete_process_config, update_tray_tooltip, launch_game_exe, fetch_bangumi_private_json};
use process_monitor::SharedState;
use std::sync::Arc;

pub fn run() {
    let state: SharedState = Arc::new(tokio::sync::Mutex::new(
        process_monitor::MonitorState::default(),
    ));

    let (_stop_tx, stop_rx) = tokio::sync::oneshot::channel::<()>();

    tauri::Builder::default()
        .manage(state.clone())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            get_running_processes,
            get_configured_processes,
            save_process_config,
            delete_process_config,
            update_tray_tooltip,
            launch_game_exe,
            fetch_bangumi_private_json,
        ])
        .setup(move |app| {
            let handle = app.handle().clone();
            let state_clone = state.clone();
            tray_manager::setup_tray(&handle)?;
            process_monitor::start(handle, state_clone, stop_rx);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
