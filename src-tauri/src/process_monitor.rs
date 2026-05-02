use sysinfo::System;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;
use std::collections::HashMap;
use std::time::{Duration, Instant};

const POLL_INTERVAL: Duration = Duration::from_secs(1);
const START_DEBOUNCE_MS: u64 = 3000;
const EXIT_DEBOUNCE_MS: u64 = 5000;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProcessConfig {
    pub process_name: String,
    pub exe_path: Option<String>,
    pub match_type: String, // 'process_name' | 'exe_path' | 'name_and_path'
}

#[derive(Default)]
pub struct ProcessState {
    pub seen_at: HashMap<String, Instant>,       // process_name -> first_seen
    pub last_seen: HashMap<String, Instant>,    // process_name -> last_seen
    pub emitted_start: HashMap<String, bool>,   // process_name -> already emitted start event
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
                    let existing_first_seen = state_guard.process_state.seen_at.get(&config.process_name).copied();
                    let first_seen = existing_first_seen.unwrap_or(now);

                    if existing_first_seen.is_none() {
                        state_guard.process_state.seen_at.insert(config.process_name.clone(), now);
                    }
                    state_guard.process_state.last_seen.insert(config.process_name.clone(), now);

                    // Check if we've reached start debounce threshold
                    let already_emitted = state_guard.process_state.emitted_start.get(&config.process_name).copied().unwrap_or(false);
                    if first_seen.elapsed().as_millis() as u64 >= START_DEBOUNCE_MS && !already_emitted {
                        // Emit process-start event (once per cycle, until process exits)
                        let _ = app_handle.emit("process-start", &config.process_name);
                        state_guard.process_state.emitted_start.insert(config.process_name.clone(), true);
                    }
                } else {
                    // Process not running - check if we need to emit exit
                    let last_seen_instant = state_guard.process_state.last_seen.remove(&config.process_name);
                    let first_seen_instant = state_guard.process_state.seen_at.get(&config.process_name).copied();

                    if let (Some(last_seen), Some(first_seen)) = (last_seen_instant, first_seen_instant) {
                        let first_seen_elapsed = first_seen.elapsed().as_millis() as u64;
                        let last_seen_elapsed = last_seen.elapsed().as_millis() as u64;

                        // Only emit exit if process was running for at least START_DEBOUNCE_MS
                        // and has been gone for at least EXIT_DEBOUNCE_MS
                        if first_seen_elapsed >= START_DEBOUNCE_MS
                            && last_seen_elapsed >= EXIT_DEBOUNCE_MS
                        {
                            let _ = app_handle.emit("process-exit", &config.process_name);
                        }
                        // Clear all state when exit debounce completes (regardless of exit event)
                        state_guard.process_state.seen_at.remove(&config.process_name);
                        state_guard.process_state.emitted_start.remove(&config.process_name);
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
}