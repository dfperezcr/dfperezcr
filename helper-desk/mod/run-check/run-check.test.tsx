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
  expect(JSON.stringify(out)).toContain('raise to high')
})

test('an empty run-check prints the usage line', async ($, on) => {
  on('command.register', () => ({ value: { command: 'run-check' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const out = await $.command.run({ command: 'run-check', args: '' } as any)
  expect(JSON.stringify(out)).toContain('Usage: /run-check')
})
