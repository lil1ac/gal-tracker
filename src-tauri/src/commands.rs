use sysinfo::System;
use tauri::command;

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