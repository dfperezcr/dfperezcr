import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Count } from '../types'

const PANE = 'helper-desk-pane'
// Tags change when a stored shape changes: an earlier version's values are declined.
const counts = atom({ plugin: 'helper-desk-pane', key: 'counts' } as const, [] as Count[], {
  shape: 'counts-1',
})
// Bumped every few seconds so the pane redraws its live status, nothing else.
const tick = atom({ plugin: 'helper-desk-pane', key: 'tick' } as const, 0, {
  shape: 'tick-1',
})

const add = (id: string, by: { tools?: number; tokens?: number }) => (list: Count[]): Count[] => {
  const tools = by.tools ?? 0
  const tokens = by.tokens ?? 0
  if (!list.some(c => c.id === id)) return [...list, { id, tools, tokens }].slice(-200)
  return list.map(c => (c.id === id ? { ...c, tools: c.tools + tools, tokens: c.tokens + tokens } : c))
}

const fmtTokens = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : `${n}`

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'helper-desk-pane',
      description: 'Show this session\'s sub-agents in a pane',
    })
    void $.ui.open({ id: PANE, title: 'Sub-agents' })
    $.clock.every(3000, () => {
      void update($, tick, n => n + 1)
    })

    return next(e)
  })

  on('command.run', { command: 'helper-desk-pane' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Sub-agents' })

    return { text: 'Sub-agents pane opened.' }
  })

  on('tool.call', async ($, e, next) => {
    if (e.agentId) await update($, counts, add(e.agentId, { tools: 1 }))

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const u = e.usage
    if (e.agentId && u) {
      const tokens =
        u.input_tokens + u.output_tokens + u.cache_creation_input_tokens + u.cache_read_input_tokens
      await update($, counts, add(e.agentId, { tokens }))
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    await read($, tick)
    const list = await read($, counts)
    const agents = await $.agent.list()

    if (agents.length === 0) {
      return (
        <Box flexDirection="column">
          <Text dimColor>No sub-agents running.</Text>
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        {agents.slice(0, 20).map(a => {
          const c = list.find(x => x.id === a.id)
          return (
            <Box flexDirection="column" key={a.id}>
              <Text>{`${a.name ?? a.type} ${a.status} · ${c?.tools ?? 0} tools · ${fmtTokens(c?.tokens ?? 0)} tok`}</Text>
              <Text dimColor>{a.description}</Text>
            </Box>
          )
        })}
      </Box>
    )
  })
}
