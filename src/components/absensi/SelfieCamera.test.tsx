// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { SelfieCamera } from './SelfieCamera'
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let container: HTMLDivElement
let root: ReturnType<typeof createRoot>
beforeEach(() => {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
})
afterEach(async () => { await act(() => root.unmount()); container.remove(); vi.restoreAllMocks() })
it('stops camera tracks when cancelled and when a permission result arrives after unmount', async () => {
  let resolve!: (stream: MediaStream) => void
  const getUserMedia = vi.fn(() => new Promise<MediaStream>(done => { resolve = done }))
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
  const cancel = vi.fn(); const stop = vi.fn()
  await act(() => root.render(<SelfieCamera onCapture={vi.fn()} onCancel={cancel} />))
  const button = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Batal')!
  await act(() => button.click()); expect(cancel).toHaveBeenCalledOnce()
  await act(() => root.render(null))
  await act(() => resolve({ getTracks: () => [{ stop }] } as unknown as MediaStream))
  expect(stop).toHaveBeenCalledOnce()
})
it('keeps capture disabled when camera access is denied', async () => {
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn().mockRejectedValue(new Error('Permission denied')) } })
  await act(() => root.render(<SelfieCamera onCapture={vi.fn()} onCancel={vi.fn()} />))
  expect(container.querySelector('[role=alert]')?.textContent).toContain('Permission denied')
  expect(Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Ambil foto')?.disabled).toBe(true)
})
