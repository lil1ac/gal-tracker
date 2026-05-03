import type { UnlistenFn } from '@tauri-apps/api/event'
import type { RunningProcess, GameProcess } from '../types'
import { query } from './database'

function isTauriEnv(): boolean {
  return !!(typeof window !== 'undefined' && window.__TAURI_INTERNALS__)
}

export function isProcessMonitoringAvailable(): boolean {
  return isTauriEnv()
}

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke(cmd, args)
}

export async function getRunningProcesses(): Promise<RunningProcess[]> {
  if (!isTauriEnv()) return []
  return tauriInvoke('get_running_processes')
}

export async function getConfiguredProcesses(): Promise<GameProcess[]> {
  if (!isTauriEnv()) return []
  return tauriInvoke('get_configured_processes')
}

export async function saveProcessConfig(
  id: string,
  gameId: string,
  processName: string,
  exePath: string | null,
  matchType: 'process_name' | 'exe_path' | 'name_and_path'
): Promise<void> {
  if (!isTauriEnv()) return
  return tauriInvoke('save_process_config', { id, gameId, processName, exePath, matchType })
}

export async function deleteProcessConfig(id: string): Promise<void> {
  if (!isTauriEnv()) return
  return tauriInvoke('delete_process_config', { id })
}

export async function updateTrayTooltip(text: string): Promise<void> {
  if (!isTauriEnv()) return
  return tauriInvoke('update_tray_tooltip', { tooltip: text })
}

export async function syncAllProcessConfigs(): Promise<void> {
  const configs = await query<GameProcess>(
    'SELECT * FROM game_processes WHERE enabled = 1'
  )
  for (const c of configs) {
    await saveProcessConfig(c.id, c.game_id, c.process_name, c.exe_path, c.match_type)
  }
}

export interface ProcessEventPayload {
  config_id: string
  game_id: string
  process_name: string
}

export async function onProcessStart(callback: (payload: ProcessEventPayload) => void): Promise<UnlistenFn> {
  if (!isTauriEnv()) return () => {}
  const { listen } = await import('@tauri-apps/api/event')
  return listen<ProcessEventPayload>('process-start', (event) => {
    callback(event.payload)
  })
}

export async function onProcessExit(callback: (payload: ProcessEventPayload) => void): Promise<UnlistenFn> {
  if (!isTauriEnv()) return () => {}
  const { listen } = await import('@tauri-apps/api/event')
  console.log('[processService] registering process-exit listener')
  return listen<ProcessEventPayload>('process-exit', (event) => {
    console.log('[processService] received process-exit event:', event.payload)
    callback(event.payload)
  })
}
