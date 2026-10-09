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
it('captures a ready camera frame and releases the camera after leaving the screen', async () => {
  const stop = vi.fn()
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
    getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }),
  } })
  const photo = new Blob(['selfie'], { type: 'image/jpeg' })
  const drawImage = vi.fn()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(photo))
  const onCapture = vi.fn()
  await act(() => root.render(<SelfieCamera onCapture={onCapture} onCancel={vi.fn()} />))
  const video = container.querySelector('video')!
  const capture = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Ambil foto')!
  expect(capture.disabled).toBe(true)
  Object.defineProperties(video, { videoWidth: { value: 720 }, videoHeight: { value: 1280 } })
  await act(() => video.dispatchEvent(new Event('loadeddata')))
  expect(capture.disabled).toBe(false)
  await act(() => capture.click())
  expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 720, 1280)
  expect(onCapture).toHaveBeenCalledWith(photo)
  await act(() => root.render(null))
  expect(stop).toHaveBeenCalledOnce()
})
