import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Draft, Effort } from '../types'

type Tier = 'smaller' | 'middle' | 'larger'
type Assessment = { kind: string; tier: Tier; reason: string }

// Keyword rules drawn from the guidance on choosing a model and effort level.
// Heuristic only: it reads the words of the task, not the code it touches.
const ARCHITECTURE = /\b(architecture|design|refactor|migrat\w*|plan|trade-?offs?|schema|rewrite|strategy)\b/i
const SUBTLE = /\b(bugs?|debug\w*|why|race|flaky|failing|crash\w*|leaks?|regressions?|security|vulnerab\w*|performance|investigat\w*|root cause|intermittent)\b/i
const MECHANICAL = /\b(rename|typos?|format\w*|lint\w*|imports?|move|sort|bump|reword|spelling|replace|delete unused)\b/i

const MODEL: Record<Tier, string> = {
  smaller: 'Haiku (smaller tier)',
  middle: 'Sonnet (middle tier)',
  larger: 'Opus (larger tier)',
}
// The suggested effort per tier, on the ladder the buttons walk.
const LADDER: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max']
const BASE: Record<Tier, Effort> = { smaller: 'low', middle: 'medium', larger: 'high' }

const draft = atom({ plugin: 'run-check', key: 'draft' } as const, '' as Draft, { shape: 'draft-1' })
const adjust = atom({ plugin: 'run-check', key: 'adjust' } as const, 0, { shape: 'adjust-1' })
const hidden = atom({ plugin: 'run-check', key: 'hidden' } as const, false, { shape: 'hidden-1' })
const pending = atom({ plugin: 'run-check', key: 'pending' } as const, '' as Effort | '', { shape: 'pending-1' })
const lastEnd = atom({ plugin: 'run-check', key: 'lastEnd' } as const, 0, { shape: 'lastEnd-1' })
const tick = atom({ plugin: 'run-check', key: 'tick' } as const, 0, { shape: 'tick-1' })

// The prompt cache is assumed to hold for one hour after the main loop's last turn: the
// session's requests use a 1-hour cache TTL. This is an estimate, not a reading.
const CACHE_MS = 60 * 60 * 1000

const kTokens = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : `${Math.round(n / 1000)}K`)
const clockTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

function assess(task: string): Assessment {
  if (ARCHITECTURE.test(task))
    return {
      kind: 'architecture or design',
      tier: 'larger',
      reason: 'design decisions are where a smaller model is most often confidently wrong.',
    }
  if (SUBTLE.test(task))
    return {
      kind: 'subtle (debugging or investigation)',
      tier: 'larger',
      reason: 'subtle bugs and unfamiliar code are where a larger model earns its cost.',
    }
  if (MECHANICAL.test(task))
    return {
      kind: 'mechanical',
      tier: 'smaller',
      reason: 'precise, describable edits are fast and cheap on a smaller model.',
    }
  return {
    kind: 'general',
    tier: 'middle',
    reason: 'no strong signal either way; the middle tier is the safe default.',
  }
}

// The effort for a draft, moved by the person's Lower and Higher presses.
function effortFor(text: string, offset: number): Effort {
  const base = LADDER.indexOf(BASE[assess(text).tier])
  return LADDER[Math.min(LADDER.length - 1, Math.max(0, base + offset))]
}

function report(task: string): string {
  if (task.trim() === '') return 'Usage: /run-check <describe the task>'
  const a = assess(task)
  const effort =
    a.tier === 'larger'
      ? 'high; raise it if Claude skips files, tests or verification.'
      : `${BASE[a.tier]}; no need to raise it for this kind of task.`
  return [
    'Run check',
    `Task type: ${a.kind}`,
    `Model: ${MODEL[a.tier]}. ${a.reason}`,
    `Effort: ${effort}`,
    '',
    'Before you run:',
    '- Is the goal and the done-condition stated in the prompt?',
    '- Are the files, tools and MCP servers it needs connected?',
    '- Does CLAUDE.md say what matters in this project?',
    '',
    'If the first answer is wrong, check the context first, then the model, then the effort.',
    'Effort shapes how much Claude does; it does not cap tokens.',
  ].join('\n')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'run-check',
      description: 'Suggest a model tier and effort level for a task, with a pre-run checklist',
    })
    $.clock.every(30000, () => {
      void update($, tick, n => n + 1)
    })

    return next(e)
  })

  on('command.run', { command: 'run-check' }, async (_$, e) => {
    return { text: report(e.args) }
  })

  // Keep the draft in step with the prompt box, one edit at a time.
  on('prompt.edit', async ($, e, next) => {
    const text = e.text.slice(0, e.start) + e.inputText + e.text.slice(e.end)
    await update($, draft, () => text.slice(0, 2000))

    return next(e)
  })

  // Sending: the effort the person set for this draft goes to the turn, then the band clears.
  on('prompt.submit', async ($, e, next) => {
    const text = await read($, draft)
    if (text.trim() !== '') {
      const offset = await read($, adjust)
      await update($, pending, () => (offset === 0 ? '' : effortFor(text, offset)))
    }
    await update($, draft, () => '')
    await update($, adjust, () => 0)
    await update($, hidden, () => false)

    return next(e)
  })

  // The main loop's requests use the effort the person chose; subagents keep theirs.
  on('turn.step', async function* ($, e, next) {
    const chosen = (await read($, pending)) as Effort | ''
    if (!e.agentId && chosen) return yield* next({ ...e, effort: chosen })

    return yield* next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (!e.agentId) {
      await update($, pending, () => '')
      const now = await $.clock.now()
      await update($, lastEnd, () => now)
    }

    return next(e)
  })

  // The band above the prompt: a status strip always, the effort card while there is a draft.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    await read($, tick)
    const usage = await $.session.usage()
    const now = await $.clock.now()
    const last = await read($, lastEnd)

    const parts: string[] = []
    const ctx = usage.context
    if (ctx.tokens !== undefined && ctx.percent !== undefined)
      parts.push(`Chat ${ctx.percent}% full (${kTokens(ctx.tokens)} of ${kTokens(ctx.window)})`)
    const five = usage.rateLimits.find(r => r.kind === 'five_hour')
    if (five) {
      const reset = five.resetsAt ? `, resets ${clockTime(five.resetsAt)}` : ''
      parts.push(`5-hour ${five.percentUsed}% used${reset}`)
    }
    const week = usage.rateLimits.find(r => r.kind === 'seven_day')
    if (week) parts.push(`week ${week.percentUsed}%`)
    if (last > 0) {
      const left = Math.max(0, Math.round((last + CACHE_MS - now) / 60000))
      parts.push(left > 0 ? `warm ~${left}m left (est.)` : 'cache cold (est.)')
    }
    const strip = parts.length ? <Text dimColor>{parts.join(' · ')}</Text> : null

    const text = (await read($, draft)).trim()
    let card = null
    if (text !== '' && !(await read($, hidden))) {
      const a = assess(text)
      const offset = await read($, adjust)
      const shown = effortFor(text, offset)
      const note = offset === 0 ? 'from the suggestion' : `${offset > 0 ? 'up' : 'down'} from the suggestion`
      card = (
        <Box>
          <Text>{`Effort ${shown} for this message, ${note}: ${a.kind}.`}</Text>
          <Button key="lower" label="Lower" onPress={() => update($, adjust, n => Math.max(-4, n - 1))} />
          <Button key="higher" label="Higher" onPress={() => update($, adjust, n => Math.min(4, n + 1))} />
          <Button key="hide" label="Hide" onPress={() => update($, hidden, () => true)} />
        </Box>
      )
    }

    if (!strip && !card) return <Box />
    return (
      <Box flexDirection="column">
        {strip}
        {card}
      </Box>
    )
  })
}
