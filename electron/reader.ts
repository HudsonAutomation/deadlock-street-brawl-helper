import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createInterface } from 'node:readline'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { log } from '../src/core/log'

export type ReaderStatus = 'starting' | 'ready' | 'failed' | 'off'

export interface ReaderHandle {
  status: ReaderStatus
  detail?: string
  read(id: string, width: number, height: number, rgba: string): Promise<{ id: string; text: string; ms: number }>
  retry(): Promise<void>
  pid(): number | null
  stop(): void
}

const here = dirname(fileURLToPath(import.meta.url))

function helperPath(): string {
  const beside = join(process.resourcesPath ?? '', 'ocr-helper.ps1')
  if (existsSync(beside)) return beside
  return join(here, 'ocr-helper.ps1')
}

export function startReader(onWindows: boolean, devTools: boolean): ReaderHandle {
  if (!onWindows) {
    return {
      status: 'off',
      detail: 'not-windows',
      read: async () => {
        throw new Error('Name reader not running')
      },
      retry: async () => {},
      pid: () => null,
      stop: () => {},
    }
  }
  let child: ChildProcessWithoutNullStreams | null = null
  let status: ReaderStatus = 'starting'
  let exits = 0
  let manual = false
  const pending = new Map<string, { resolve: (value: { id: string; text: string; ms: number }) => void; reject: (err: Error) => void; timer: NodeJS.Timeout }>()

  const failAll = (error: Error) => {
    for (const [id, job] of pending) {
      clearTimeout(job.timer)
      job.reject(error)
      pending.delete(id)
    }
  }

  const launch = () => {
    const script = helperPath()
    child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    const lines = createInterface({ input: child.stdout })
    lines.on('line', (line) => {
      try {
        const row = JSON.parse(line) as { id: string; text: string; ms: number }
        const job = pending.get(row.id)
        if (!job) return
        clearTimeout(job.timer)
        pending.delete(row.id)
        job.resolve(row)
      } catch {
        /* ignore a non-json line */
      }
    })
    child.on('exit', () => {
      exits += 1
      failAll(new Error('Name reader not running'))
      if (manual) {
        manual = false
        return
      }
      if (exits === 1) {
        log('reader.exit', { exits })
        log('reader.restart', {})
        launch()
        return
      }
      status = 'failed'
      log('reader.failed', { exits })
    })
  }

  const started = Date.now()
  launch()
  const warm = Buffer.alloc(160 * 48 * 4, 255).toString('base64')
  const readyTimer = setTimeout(() => {
    if (status === 'starting') {
      status = 'failed'
      log('reader.failed', { reason: 'start-timeout' })
    }
  }, 15000)

  const api: ReaderHandle = {
    get status() {
      return status
    },
    read(id, width, height, rgba) {
      if (status === 'failed' || !child) return Promise.reject(new Error('Name reader not running'))
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id)
          reject(new Error('Name reader not running'))
        }, 3000)
        pending.set(id, { resolve, reject, timer })
        child?.stdin.write(`${id} ${width} ${height} ${rgba}\n`)
      })
    },
    async retry() {
      if (!devTools && status !== 'failed') return
      manual = true
      child?.kill()
      exits = Math.max(0, exits - 1)
      status = 'starting'
      launch()
    },
    pid: () => child?.pid ?? null,
    stop() {
      child?.kill()
    },
  }
  void api.read('warm', 160, 48, warm).then(
    () => {
      status = 'ready'
      clearTimeout(readyTimer)
      log('reader.ready', { ms: Date.now() - started })
    },
    (error: unknown) => {
      status = 'failed'
      clearTimeout(readyTimer)
      log('reader.failed', { reason: error instanceof Error ? error.message : 'warm' })
    },
  )
  return api
}
