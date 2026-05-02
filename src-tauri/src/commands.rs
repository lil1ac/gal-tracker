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
    game_id: String,
    process_name: String,
    exe_path: Option<String>,
    match_type: String,
) -> Result<(), String> {
    let mut guard = state.lock().await;
    let config = ProcessConfig {
        game_id,
        process_name: process_name.clone(),
        exe_path,
        match_type,
    };
    if let Some(existing) = guard.configured_processes.iter_mut().find(|c| c.process_name == process_name) {
        *existing = config;
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