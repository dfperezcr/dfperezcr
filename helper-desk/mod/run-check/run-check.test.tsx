import { expect, test } from 'claude-code/testing'

test('a mechanical rename gets the smaller tier', async ($, on) => {
  on('command.register', () => ({ value: { command: 'run-check' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const out = await $.command.run({ command: 'run-check', args: 'rename the variable userId to accountId' } as any)
  expect(JSON.stringify(out)).toContain('Haiku (smaller tier)')
})

test('a debugging task gets the larger tier and a raise-effort note', async ($, on) => {
  on('command.register', () => ({ value: { command: 'run-check' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const out = await $.command.run({ command: 'run-check', args: 'debug the flaky login test' } as any)
  expect(JSON.stringify(out)).toContain('Opus (larger tier)')
  expect(JSON.stringify(out)).toContain('raise it if Claude skips')
})

test('an empty run-check prints the usage line', async ($, on) => {
  on('command.register', () => ({ value: { command: 'run-check' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const out = await $.command.run({ command: 'run-check', args: '' } as any)
  expect(JSON.stringify(out)).toContain('Usage: /run-check')
})

const BAND = { plugin: 'run-check', component: 'AbovePrompt', props: { hasSurvey: false } } as const

test('the band above the prompt shows the suggestion for the draft being typed', async ($, on) => {
  on('command.register', () => ({ value: { command: 'run-check' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.edit', (_, e) => ({ text: e.text, cursor: e.cursor }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.prompt.edit({ text: '', cursor: 0, start: 0, end: 0, inputText: 'debug the flaky login test' } as any)

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' } as any)
  expect((await ui.find({ type: 'Text' }))?.text).toContain('Effort high for this message')
  await ui.unmount()
})

test('Higher raises the effort the band shows for the draft', async ($, on) => {
  on('command.register', () => ({ value: { command: 'run-check' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.edit', (_, e) => ({ text: e.text, cursor: e.cursor }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.prompt.edit({ text: '', cursor: 0, start: 0, end: 0, inputText: 'debug the flaky login test' } as any)

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' } as any)
  await ui.press({ key: 'higher' } as any)
  expect((await ui.find({ type: 'Text' }))?.text).toContain('Effort xhigh for this message, up from the suggestion')
  await ui.unmount()
})

test('the band stays quiet while the draft is empty', async ($, on) => {
  on('command.register', () => ({ value: { command: 'run-check' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  // Nothing draws beneath the plugin: this hook stands for the engine's own band.
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' } as any)
  expect((await ui.find({ type: 'Text' }))?.text).toBe('engine')
  await ui.unmount()
})
