import { expect, test } from 'claude-code/testing'

const FIVE = (percentUsed: number) => ({
  kind: 'five_hour',
  percentUsed,
  resetsAt: '2026-11-02T18:00:00Z',
})

test('a 75% window raises one alert and shows its status', async ($, on) => {
  on('session.measure', () => ({ changed: [] }))
  const toasts: string[] = []
  let status: string | undefined
  on('ui.toast', (_: any, e: any) => {
    toasts.push(typeof e === 'string' ? e : e.text)
    return { value: undefined }
  })
  on('ui.status', (_: any, e: any) => {
    status = typeof e === 'string' ? e : e.text
    return { value: undefined }
  })

  await $.session.measure({ rateLimits: [FIVE(76)], changed: ['rateLimits'] } as any)
  expect(toasts.length).toBe(1)
  expect(toasts[0]).toContain('76%')
  expect(status).toBe('5h 76% · resets 18:00 UTC')
})

test('the same window does not alert twice, and a 90% window alerts again', async ($, on) => {
  on('session.measure', () => ({ changed: [] }))
  const toasts: string[] = []
  on('ui.toast', (_: any, e: any) => {
    toasts.push(typeof e === 'string' ? e : e.text)
    return { value: undefined }
  })
  on('ui.status', () => ({ value: undefined }))

  await $.session.measure({ rateLimits: [FIVE(76)], changed: ['rateLimits'] } as any)
  await $.session.measure({ rateLimits: [FIVE(80)], changed: ['rateLimits'] } as any)
  expect(toasts.length).toBe(1)
  await $.session.measure({ rateLimits: [FIVE(91)], changed: ['rateLimits'] } as any)
  expect(toasts.length).toBe(2)
  expect(toasts[1]).toContain('91%')
})

test('a new reset time starts a new window with no alert shown', async ($, on) => {
  on('session.measure', () => ({ changed: [] }))
  const toasts: string[] = []
  on('ui.toast', (_: any, e: any) => {
    toasts.push(typeof e === 'string' ? e : e.text)
    return { value: undefined }
  })
  on('ui.status', () => ({ value: undefined }))

  await $.session.measure({ rateLimits: [FIVE(80)], changed: ['rateLimits'] } as any)
  await $.session.measure({
    rateLimits: [{ kind: 'five_hour', percentUsed: 80, resetsAt: '2026-11-02T23:00:00Z' }],
    changed: ['rateLimits'],
  } as any)
  expect(toasts.length).toBe(2)
})
