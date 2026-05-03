use sysinfo::System;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;
use std::collections::HashMap;
use std::time::{Duration, Instant};

const POLL_INTERVAL: Duration = Duration::from_secs(1);
const START_DEBOUNCE_MS: u64 = 1000;
const EXIT_DEBOUNCE_MS: u64 = 1500;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProcessConfig {
    pub id: String,
    pub game_id: String,
    pub process_name: String,
    pub exe_path: Option<String>,
    pub match_type: String, // 'process_name' | 'exe_path' | 'name_and_path'
}

/// Event payloads include game_id so the frontend can match process events to games
#[derive(Debug, Clone, serde::Serialize)]
pub struct ProcessEventPayload {
    pub config_id: String,
    pub game_id: String,
    pub process_name: String,
}

#[derive(Debug, Clone)]
struct RunningProcessSnapshot {
    name: String,
    exe_path: String,
}

#[derive(Default)]
pub struct ProcessState {
    pub seen_at: HashMap<String, Instant>,       // config_id -> first_seen
    pub last_seen: HashMap<String, Instant>,    // config_id -> last_seen
    pub emitted_start: HashMap<String, bool>,   // config_id -> already emitted start event
}

/// Unified state for process monitoring
pub struct MonitorState {
    pub process_state: ProcessState,
    pub configured_processes: Vec<ProcessConfig>,
}

impl Default for MonitorState {
    fn default() -> Self {
        Self {
            process_state: ProcessState::default(),
            configured_processes: Vec::new(),
        }
    }
}

/// Shared state type alias - Arc allows sharing across threads
pub type SharedState = Arc<Mutex<MonitorState>>;

fn same_path(left: &str, right: &str) -> bool {
    left.eq_ignore_ascii_case(right)
}

fn process_matches(config: &ProcessConfig, processes: &[RunningProcessSnapshot]) -> bool {
    match config.match_type.as_str() {
        "process_name" => processes
            .iter()
            .any(|process| process.name.eq_ignore_ascii_case(&config.process_name)),
        "exe_path" => config
            .exe_path
            .as_deref()
            .map(|expected_path| {
                processes
                    .iter()
                    .any(|process| same_path(&process.exe_path, expected_path))
            })
            .unwrap_or(false),
        "name_and_path" => config
            .exe_path
            .as_deref()
            .map(|expected_path| {
                processes.iter().any(|process| {
                    process.name.eq_ignore_ascii_case(&config.process_name)
                        && same_path(&process.exe_path, expected_path)
                })
            })
            .unwrap_or(false),
        _ => false,
    }
}

/// Starts the process monitoring loop in a background thread.
/// Polls sysinfo every second and emits tauri events for process start/exit.
/// Returns a handle to control the monitor.
pub fn start(app_handle: AppHandle, state: SharedState, mut stop_rx: tokio::sync::oneshot::Receiver<()>) {
    std::thread::spawn(move || {
        let mut sys = System::new_all();

        loop {
            // Check for shutdown signal
            if stop_rx.try_recv().is_ok() {
                break;
            }

            sys.refresh_all();
            let now = Instant::now();

            // Get configured processes from shared state (no blocking DB access)
            let configured = {
                let state_guard = state.blocking_lock();
                state_guard.configured_processes.clone()
            };

            // Keep each process as a separate snapshot. A HashMap keyed by name
            // collapses duplicate executable names and makes path matching flaky.
            let current_procs: Vec<RunningProcessSnapshot> = sys
                .processes()
                .iter()
                .filter_map(|(_pid, proc)| {
                    let name = proc.name().to_string_lossy().to_string();
                    let exe_path = proc.exe()?.to_string_lossy().to_string();
                    Some(RunningProcessSnapshot { name, exe_path })
                })
                .collect();

            let mut state_guard = state.blocking_lock();

            // Check each configured process
            for config in &configured {
                let is_running = process_matches(config, &current_procs);

                if is_running {
                    // Insert or get first_seen, then update last_seen
                    let existing_first_seen = state_guard.process_state.seen_at.get(&config.id).copied();
                    let first_seen = existing_first_seen.unwrap_or(now);

                    if existing_first_seen.is_none() {
                        state_guard.process_state.seen_at.insert(config.id.clone(), now);
                    }
                    state_guard.process_state.last_seen.insert(config.id.clone(), now);

                    // Check if we've reached start debounce threshold
                    let already_emitted = state_guard.process_state.emitted_start.get(&config.id).copied().unwrap_or(false);
                    if first_seen.elapsed().as_millis() as u64 >= START_DEBOUNCE_MS && !already_emitted {
                        // Emit process-start event with game_id
                        let payload = ProcessEventPayload {
                            config_id: config.id.clone(),
                            game_id: config.game_id.clone(),
                            process_name: config.process_name.clone(),
                        };
                        println!("[process_monitor] emitting process-start: game_id={}, process={}", payload.game_id, payload.process_name);
                        let _ = app_handle.emit("process-start", &payload);
                        state_guard.process_state.emitted_start.insert(config.id.clone(), true);
                    }
                } else {
                    // Process not running - keep last_seen until the exit debounce
                    // threshold is reached. Removing it immediately loses the only
                    // timestamp needed to decide when to emit process-exit.
                    let last_seen_instant = state_guard.process_state.last_seen.get(&config.id).copied();
                    let first_seen_instant = state_guard.process_state.seen_at.get(&config.id).copied();

                    if let (Some(last_seen), Some(first_seen)) = (last_seen_instant, first_seen_instant) {
                        let first_seen_elapsed = first_seen.elapsed().as_millis() as u64;
                        let last_seen_elapsed = last_seen.elapsed().as_millis() as u64;

                        // Only emit exit if process was running for at least START_DEBOUNCE_MS
                        // and has been gone for at least EXIT_DEBOUNCE_MS
                        if first_seen_elapsed >= START_DEBOUNCE_MS
                            && last_seen_elapsed >= EXIT_DEBOUNCE_MS
                        {
                            let payload = ProcessEventPayload {
                                config_id: config.id.clone(),
                                game_id: config.game_id.clone(),
                                process_name: config.process_name.clone(),
                            };
                            println!("[process_monitor] emitting process-exit: game_id={}, process={}", payload.game_id, payload.process_name);
                            let _ = app_handle.emit("process-exit", &payload);
                            // Clear all state only after the exit debounce completes.
                            state_guard.process_state.last_seen.remove(&config.id);
                            state_guard.process_state.seen_at.remove(&config.id);
                            state_guard.process_state.emitted_start.remove(&config.id);
                        } else if first_seen_elapsed < START_DEBOUNCE_MS {
                            // A short-lived process never became an active session.
                            state_guard.process_state.last_seen.remove(&config.id);
                            state_guard.process_state.seen_at.remove(&config.id);
                            state_guard.process_state.emitted_start.remove(&config.id);
                        }
                    }
                }
            }

            drop(state_guard);
            std::thread::sleep(POLL_INTERVAL);
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_process_state_default() {
        let state = ProcessState::default();
        assert!(state.seen_at.is_empty());
        assert!(state.last_seen.is_empty());
        assert!(state.emitted_start.is_empty());
    }

    #[test]
    fn test_exe_path_match_requires_same_path() {
        let config = ProcessConfig {
            id: "cfg".into(),
            game_id: "game".into(),
            process_name: "game.exe".into(),
            exe_path: Some("D:\\Games\\Real\\game.exe".into()),
            match_type: "exe_path".into(),
        };
        let processes = vec![
            RunningProcessSnapshot {
                name: "game.exe".into(),
                exe_path: "D:\\Games\\Other\\game.exe".into(),
            },
            RunningProcessSnapshot {
                name: "launcher.exe".into(),
                exe_path: "D:\\Games\\Real\\launcher.exe".into(),
            },
        ];

        assert!(!process_matches(&config, &processes));
    }

    #[test]
    fn test_name_and_path_match_requires_same_process_entry() {
        let config = ProcessConfig {
            id: "cfg".into(),
            game_id: "game".into(),
            process_name: "game.exe".into(),
            exe_path: Some("D:\\Games\\Real\\game.exe".into()),
            match_type: "name_and_path".into(),
        };
        let processes = vec![
            RunningProcessSnapshot {
                name: "game.exe".into(),
                exe_path: "D:\\Games\\Other\\game.exe".into(),
            },
            RunningProcessSnapshot {
                name: "helper.exe".into(),
                exe_path: "D:\\Games\\Real\\game.exe".into(),
            },
        ];

        assert!(!process_matches(&config, &processes));
    }
}
