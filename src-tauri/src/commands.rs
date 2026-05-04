use sysinfo::System;
use tauri::command;
use crate::process_monitor::{ProcessConfig, SharedState};
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Clone, serde::Serialize)]
pub struct RunningProcess {
    pub pid: u32,
    pub name: String,
    pub exe_path: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct LaunchTarget {
    exe_path: PathBuf,
    working_dir: PathBuf,
}

fn resolve_launch_target(
    exe_path: PathBuf,
    working_dir: Option<PathBuf>,
) -> Result<LaunchTarget, String> {
    let extension = exe_path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default();
    if !extension.eq_ignore_ascii_case("exe") {
        return Err("启动程序必须是 .exe 文件".into());
    }

    let working_dir = match working_dir {
        Some(path) => path,
        None => exe_path
            .parent()
            .ok_or_else(|| "无法推导启动目录".to_string())?
            .to_path_buf(),
    };

    Ok(LaunchTarget {
        exe_path,
        working_dir,
    })
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
    id: String,
    game_id: String,
    process_name: String,
    exe_path: Option<String>,
    match_type: String,
) -> Result<(), String> {
    let mut guard = state.lock().await;
    let config = ProcessConfig {
        id: id.clone(),
        game_id,
        process_name: process_name.clone(),
        exe_path,
        match_type,
    };
    if let Some(existing) = guard.configured_processes.iter_mut().find(|c| c.id == id) {
        *existing = config;
    } else {
        guard.configured_processes.push(config);
    }
    Ok(())
}

#[command]
pub async fn delete_process_config(
    state: tauri::State<'_, SharedState>,
    id: String,
) -> Result<(), String> {
    let mut guard = state.lock().await;
    guard.configured_processes.retain(|c| c.id != id);
    Ok(())
}

#[command]
pub fn update_tray_tooltip(app: tauri::AppHandle, tooltip: String) -> Result<(), String> {
    if let Some(tray) = app.tray_by_id("main") {
        tray.set_tooltip(Some(&tooltip)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[command]
pub async fn launch_game_exe(
    exe_path: String,
    working_dir: Option<String>,
) -> Result<(), String> {
    let target = resolve_launch_target(
        PathBuf::from(exe_path),
        working_dir.map(PathBuf::from),
    )?;

    if !target.exe_path.is_file() {
        return Err("启动程序不存在，请重新绑定".into());
    }
    if !target.working_dir.is_dir() {
        return Err("启动目录不存在，请重新绑定".into());
    }

    Command::new(&target.exe_path)
        .current_dir(&target.working_dir)
        .spawn()
        .map_err(|error| format!("启动失败：{error}"))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn resolve_launch_target_uses_exe_parent_as_working_dir() {
        let target = resolve_launch_target(
            PathBuf::from(r"D:\Games\CLANNAD\CLANNAD.exe"),
            None,
        )
        .expect("valid exe path should resolve");

        assert_eq!(target.exe_path, PathBuf::from(r"D:\Games\CLANNAD\CLANNAD.exe"));
        assert_eq!(target.working_dir, PathBuf::from(r"D:\Games\CLANNAD"));
    }

    #[test]
    fn resolve_launch_target_rejects_non_exe_path() {
        let err = resolve_launch_target(
            PathBuf::from(r"D:\Games\CLANNAD\readme.txt"),
            None,
        )
        .expect_err("non-exe path should be rejected");

        assert!(err.contains(".exe"));
    }
}
