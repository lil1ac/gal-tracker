use sysinfo::System;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;
use std::collections::HashMap;
use std::time::{Duration, Instant};

const POLL_INTERVAL: Duration = Duration::from_secs(1);
const START_DEBOUNCE_MS: u64 = 3000;
const EXIT_DEBOUNCE_MS: u64 = 5000;

#[derive(Debug, Clone)]
pub struct ProcessConfig {
    pub process_name: String,
    pub exe_path: Option<String>,
    pub match_type: String, // 'process_name' | 'exe_path' | 'name_and_path'
}

pub struct ProcessState {
    pub seen_at: HashMap<String, Instant>,   // process_name -> first_seen
    pub last_seen: HashMap<String, Instant>, // process_name -> last_seen
}

impl Default for ProcessState {
    fn default() -> Self {
        Self {
            seen_at: HashMap::new(),
            last_seen: HashMap::new(),
        }
    }
}

pub type SharedState = Arc<Mutex<ProcessState>>;

/// Starts the process monitoring loop in a background thread.
/// Polls sysinfo every second and emits tauri events for process start/exit.
pub fn start(app_handle: AppHandle, state: SharedState) {
    std::thread::spawn(move || {
        let mut sys = System::new_all();

        loop {
            sys.refresh_all();
            let now = Instant::now();

            // Get configured processes from database
            let configured = get_configured_processes_sync(&app_handle);

            // Build map of current running processes: name -> exe_path
            let current_procs: HashMap<String, String> = sys
                .processes()
                .iter()
                .filter_map(|(_pid, proc)| {
                    let name = proc.name().to_string_lossy().to_string();
                    let exe = proc
                        .exe()
                        .map(|e| e.to_string_lossy().to_string())
                        .unwrap_or_default();
                    Some((name, exe))
                })
                .collect();

            let mut state_guard = state.blocking_lock();

            // Check each configured process
            for config in &configured {
                let is_running = match config.match_type.as_str() {
                    "process_name" => current_procs.contains_key(&config.process_name),
                    "exe_path" => {
                        if let Some(ref expected_path) = config.exe_path {
                            current_procs
                                .values()
                                .any(|p| p.eq_ignore_ascii_case(expected_path))
                        } else {
                            false
                        }
                    }
                    "name_and_path" => current_procs
                        .get(&config.process_name)
                        .map(|p| {
                            p.eq_ignore_ascii_case(
                                &config.exe_path.as_deref().unwrap_or(""),
                            )
                        })
                        .unwrap_or(false),
                    _ => false,
                };

                if is_running {
                    // Insert or get first_seen, then update last_seen
                    let existing_first_seen = state_guard.seen_at.get(&config.process_name).copied();
                    let first_seen = existing_first_seen.unwrap_or(now);

                    if existing_first_seen.is_none() {
                        state_guard.seen_at.insert(config.process_name.clone(), now);
                    }
                    state_guard.last_seen.insert(config.process_name.clone(), now);

                    // Check if we've reached start debounce threshold
                    if first_seen.elapsed().as_millis() as u64 >= START_DEBOUNCE_MS {
                        // Emit process-start event (idempotent - only fires once per cycle)
                        let _ = app_handle.emit("process-start", &config.process_name);
                    }
                } else {
                    // Process not running - check if we need to emit exit
                    let last_seen_instant = state_guard.last_seen.remove(&config.process_name);
                    let first_seen_instant = state_guard.seen_at.get(&config.process_name).copied();

                    if let (Some(last_seen), Some(first_seen)) = (last_seen_instant, first_seen_instant) {
                        let first_seen_elapsed = first_seen.elapsed().as_millis() as u64;
                        let last_seen_elapsed = last_seen.elapsed().as_millis() as u64;

                        // Only emit exit if process was running for at least START_DEBOUNCE_MS
                        // and has been gone for at least EXIT_DEBOUNCE_MS
                        if first_seen_elapsed >= START_DEBOUNCE_MS
                            && last_seen_elapsed >= EXIT_DEBOUNCE_MS
                        {
                            let _ = app_handle.emit("process-exit", &config.process_name);
                            state_guard.seen_at.remove(&config.process_name);
                        } else if first_seen_elapsed < START_DEBOUNCE_MS {
                            // Process didn't run long enough, clear state without exit event
                            state_guard.seen_at.remove(&config.process_name);
                        }
                    }
                }
            }

            drop(state_guard);
            std::thread::sleep(POLL_INTERVAL);
        }
    });
}

/// Retrieves configured processes from the database.
/// This is a stub that returns empty vec - full implementation comes in Task 6.
fn get_configured_processes_sync(_app_handle: &AppHandle) -> Vec<ProcessConfig> {
    // TODO: Task 6 will implement full database query via commands
    vec![]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_process_state_default() {
        let state = ProcessState::default();
        assert!(state.seen_at.is_empty());
        assert!(state.last_seen.is_empty());
    }
}