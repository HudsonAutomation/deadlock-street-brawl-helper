/** Structured JSON lines. The only console call in the app lives here. */

export type LogFields = Record<string, unknown>

export function log(event: string, fields: LogFields = {}): void {
  const line = JSON.stringify({ t: Date.now(), event, ...fields })
  console.log(line)
}
