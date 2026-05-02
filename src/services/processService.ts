import { invoke } from '@tauri-apps/api/core'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { RunningProcess, GameProcess } from '../types'

export async function getRunningProcesses(): Promise<RunningProcess[]> {
  return invoke('get_running_processes')
}

export async function getConfiguredProcesses(): Promise<GameProcess[]> {
  return invoke('get_configured_processes')
}

export async function saveProcessConfig(
  gameId: string,
  processName: string,
  exePath: string | null,
  matchType: 'process_name' | 'exe_path' | 'name_and_path'
): Promise<void> {
  return invoke('save_process_config', { gameId, processName, exePath, matchType })
}

export async function deleteProcessConfig(processId: string): Promise<void> {
  return invoke('delete_process_config', { processId })
}

export async function updateTrayTooltip(text: string): Promise<void> {
  return invoke('update_tray_tooltip', { text })
}

export function onProcessStart(callback: (processName: string) => void): Promise<UnlistenFn> {
  return listen<string>('process-start', (event) => {
    callback(event.payload)
  })
}

export function onProcessExit(callback: (processName: string) => void): Promise<UnlistenFn> {
  return listen<string>('process-exit', (event) => {
    callback(event.payload)
  })
}