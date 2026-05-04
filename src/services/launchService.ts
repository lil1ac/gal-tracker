import type { GameProcess } from '../types'

declare global {
  interface Window { __TAURI_INTERNALS__?: unknown }
}

function isTauriEnv(): boolean {
  return !!(typeof window !== 'undefined' && window.__TAURI_INTERNALS__)
}

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke(cmd, args)
}

export function isGameLaunchAvailable(): boolean {
  return isTauriEnv()
}

export function deriveWorkingDir(exePath: string): string {
  const normalized = exePath.trim()
  const slashIndex = Math.max(normalized.lastIndexOf('\\'), normalized.lastIndexOf('/'))
  if (slashIndex <= 0) return ''
  return normalized.slice(0, slashIndex)
}

export function canLaunchProcess(process: GameProcess | null | undefined): process is GameProcess & { exe_path: string } {
  return !!process?.enabled && !!process.exe_path
}

export async function launchGameProcess(process: GameProcess): Promise<void> {
  if (!isTauriEnv()) {
    throw new Error('启动游戏仅在桌面版可用')
  }
  if (!process.exe_path) {
    throw new Error('请先绑定带路径的进程')
  }
  return tauriInvoke('launch_game_exe', {
    exePath: process.exe_path,
    workingDir: deriveWorkingDir(process.exe_path),
  })
}
