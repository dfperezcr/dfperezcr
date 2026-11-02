import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Window } from '../types'

const THRESHOLDS = [75, 90] as const
// The shape tag changes when the stored value's fields change.
const window = atom(
  { plugin: 'limit-watch', key: 'window' } as const,
  { resetsAt: '', level: 0 } as Window,
  { shape: 'window-1' },
)

const clock = (iso: string) => (iso ? `${new Date(iso).toISOString().slice(11, 16)} UTC` : 'unknown time')

export const register: Register = on => {
  on('session.measure', async ($, e, next) => {
    const five = e.rateLimits.find(r => r.kind === 'five_hour')
    if (!five) return next(e)

    const resetsAt = five.resetsAt ?? ''
    const seen = await read($, window)
    // A new window (the reset time moved) starts with no alert shown.
    const level = seen.resetsAt === resetsAt ? seen.level : 0
    const due = THRESHOLDS.filter(t => five.percentUsed >= t && t > level)
    const next_level = due.length ? Math.max(...due) : level

    if (due.length) {
      $.ui.toast(`5-hour limit at ${five.percentUsed}%. Resets at ${clock(resetsAt)}.`)
    }
    await update($, window, () => ({ resetsAt, level: next_level }))
    $.ui.status(`5h ${five.percentUsed}% · resets ${clock(resetsAt)}`)

    return next(e)
  })
}
