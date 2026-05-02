use sysinfo::System;
use tauri::command;
use crate::process_monitor::{ProcessConfig, SharedState};

#[derive(Debug, Clone, serde::Serialize)]
pub struct RunningProcess {
    pub pid: u32,
    pub name: String,
    pub exe_path: Option<String>,
}

#[command]
pub async fn get_running_processes() -> Result<Vec<RunningProcess>, String> {
    let sys = System::new_all();
    Ok(sys
        .processes()
        .iter()
        .filter(|(_, p)| p.exe().is_some())
        .map(|(pid, proc)| RunningProcess {
            pid: pid.as_u32(),
            name: proc.name().to_string_lossy().to_string(),
            exe_path: proc
                .exe()
                .map(|e| e.to_string_lossy().to_string()),
        })
        .collect())
}

#[command]
pub fn get_configured_processes(state: tauri::State<'_, SharedState>) -> Vec<ProcessConfig> {
    let guard = state.blocking_lock();
    guard.configured_processes.clone()
}

#[command]
pub async fn save_process_config(
    state: tauri::State<'_, SharedState>,
    config: ProcessConfig,
) -> Result<(), String> {
    let mut guard = state.lock().await;
    // Check if exists, update or add
    if let Some(existing) = guard.configured_processes.iter_mut().find(|c| c.process_name == config.process_name) {
        existing.exe_path = config.exe_path;
        existing.match_type = config.match_type;
    } else {
        guard.configured_processes.push(config);
    }
    Ok(())
}

#[command]
pub async fn delete_process_config(
    state: tauri::State<'_, SharedState>,
    process_name: String,
) -> Result<(), String> {
    let mut guard = state.lock().await;
    guard.configured_processes.retain(|c| c.process_name != process_name);
    Ok(())
}

#[command]
pub fn update_tray_tooltip(app: tauri::AppHandle, tooltip: String) -> Result<(), String> {
    if let Some(tray) = app.tray_by_id("main") {
        tray.set_tooltip(Some(&tooltip)).map_err(|e| e.to_string())?;
    }
    Ok(())
}