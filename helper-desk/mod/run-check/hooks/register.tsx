import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Draft } from '../types'

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

const draft = atom({ plugin: 'run-check', key: 'draft' } as const, '' as Draft, { shape: 'draft-1' })

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

function report(task: string): string {
  if (task.trim() === '') return 'Usage: /run-check <describe the task>'
  const a = assess(task)
  const effort =
    a.tier === 'larger'
      ? 'default; raise to high if Claude skips files, tests or verification.'
      : 'default; no need to raise it for this kind of task.'
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

  on('prompt.submit', async ($, e, next) => {
    await update($, draft, () => '')

    return next(e)
  })

  // The band above the prompt: quiet until there is a draft to judge.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const text = (await read($, draft)).trim()
    if (text === '') return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const a = assess(text)

    return (
      <Box>
        <Text dimColor>{`Run check: ${MODEL[a.tier]} · ${a.kind} · effort default`}</Text>
      </Box>
    )
  })
}
