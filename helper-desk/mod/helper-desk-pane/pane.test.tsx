import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'helper-desk-pane',
  component: 'Pane',
  requestId: 'helper-desk-pane',
  props: {
    title: 'Sub-agents',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

const AGENT = {
  id: 'a1',
  description: 'find the config',
  type: 'Explore',
  status: 'running',
  name: 'scout',
} as const

test('the pane lists a running sub-agent with its tool calls, on every surface', async ($, on) => {
  on('command.register', () => ({ value: { command: 'helper-desk-pane' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('agent.list', () => ({ value: [AGENT] }))
  on('clock.every', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: 'Bash', command: 'ls', agentId: 'a1' })

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })

    const row = await ui.find({ type: 'Text', text: /scout/ })
    expect(row?.text).toBe('scout running · 1 tools · 0 tok')
    await ui.unmount()
  }
})

test('the pane says so when no sub-agent runs', async ($, on) => {
  on('command.register', () => ({ value: { command: 'helper-desk-pane' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('agent.list', () => ({ value: [] }))
  on('clock.every', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })

  expect((await ui.find({ type: 'Text' }))?.text).toBe('No sub-agents running.')
  await ui.unmount()
})
