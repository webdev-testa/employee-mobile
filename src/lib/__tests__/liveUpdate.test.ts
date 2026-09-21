import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Capacitor } from '@capacitor/core'
import { LiveUpdate } from '@capawesome/capacitor-live-update'
import { supabase } from '@/lib/supabase'
import {
  APP_VERSION,
  checkForUpdates,
  markLiveUpdateReady,
  resetToBuiltInBundle,
  getCurrentBundleInfo,
  compareSemver,
  isValidBundleUrl,
} from '../live-update'

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
  },
}))

vi.mock('@capawesome/capacitor-live-update', () => ({
  LiveUpdate: {
    ready: vi.fn(),
    getBundles: vi.fn(),
    getCurrentBundle: vi.fn(),
    downloadBundle: vi.fn(),
    setNextBundle: vi.fn(),
    reload: vi.fn(),
    reset: vi.fn(),
  },
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    schema: vi.fn(),
  },
}))

describe('LiveUpdate Module (live-update.ts)', () => {
  let mockSelect: any
  let mockOrder: any
  let mockLimit: any
  let mockSingle: any
  let mockFrom: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockSingle = vi.fn()
    mockLimit = vi.fn(() => ({ single: mockSingle }))
    mockOrder = vi.fn(() => ({ limit: mockLimit }))
    mockSelect = vi.fn(() => ({ order: mockOrder }))
    mockFrom = vi.fn(() => ({ select: mockSelect }))

    vi.mocked(supabase.schema).mockReturnValue({
      from: mockFrom,
    } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Utility Functions', () => {
    it('compareSemver accurately compares semantic version strings', () => {
      expect(compareSemver('1.2.0', '1.1.9')).toBe(1)
      expect(compareSemver('2.0.0', '1.9.9')).toBe(1)
      expect(compareSemver('1.0.1', '1.0.0')).toBe(1)
      expect(compareSemver('1.0.0', '1.0.0')).toBe(0)
      expect(compareSemver('1.0.0', '1.2.0')).toBe(-1)
      expect(compareSemver('1.1.9', '1.2.0')).toBe(-1)
      expect(compareSemver('1.2.0-beta.1', '1.1.0')).toBe(1)
    })

    it('isValidBundleUrl validates HTTPS protocol and rejects insecure or malformed URLs', () => {
      expect(isValidBundleUrl('https://example.supabase.co/storage/bundle.zip')).toBe(true)
      expect(isValidBundleUrl('http://insecure-domain.com/bundle.zip')).toBe(false)
      expect(isValidBundleUrl('ftp://ftp.example.com/bundle.zip')).toBe(false)
      expect(isValidBundleUrl('not a url')).toBe(false)
      expect(isValidBundleUrl('   ')).toBe(false)
    })
  })

  describe('Browser / Non-Native Environment', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)
    })

    it('checkForUpdates skips execution and returns { updated: false }', async () => {
      const result = await checkForUpdates()
      expect(result).toEqual({ updated: false })
      expect(supabase.schema).not.toHaveBeenCalled()
      expect(LiveUpdate.downloadBundle).not.toHaveBeenCalled()
    })

    it('markLiveUpdateReady skips execution without calling LiveUpdate.ready', async () => {
      await markLiveUpdateReady()
      expect(LiveUpdate.ready).not.toHaveBeenCalled()
    })

    it('resetToBuiltInBundle skips execution without resetting', async () => {
      await resetToBuiltInBundle()
      expect(LiveUpdate.reset).not.toHaveBeenCalled()
      expect(LiveUpdate.reload).not.toHaveBeenCalled()
    })

    it('getCurrentBundleInfo returns default APP_VERSION and null activeBundleId', async () => {
      const info = await getCurrentBundleInfo()
      expect(info).toEqual({
        currentVersion: APP_VERSION,
        activeBundleId: null,
      })
      expect(LiveUpdate.getCurrentBundle).not.toHaveBeenCalled()
    })
  })

  describe('Native Environment (Android / iOS)', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
      vi.mocked(LiveUpdate.getCurrentBundle).mockResolvedValue({ bundleId: undefined } as any)
    })

    it('returns updated: false when no version record is found in database', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Row not found' } })

      const result = await checkForUpdates()
      expect(result).toEqual({ updated: false })
      expect(LiveUpdate.downloadBundle).not.toHaveBeenCalled()
    })

    it('returns updated: false when data record is incomplete or malformed', async () => {
      mockSingle.mockResolvedValue({ data: { version: '', bundle_url: '' }, error: null })

      const result = await checkForUpdates()
      expect(result).toEqual({ updated: false })
      expect(LiveUpdate.downloadBundle).not.toHaveBeenCalled()
    })

    it('rejects malformed or non-semver version strings like whitespace or text', async () => {
      mockSingle.mockResolvedValue({
        data: {
          version: '   ',
          bundle_url: 'https://example.com/bundle.zip',
          mandatory: false,
          release_notes: null,
        },
        error: null,
      })

      const result = await checkForUpdates()
      expect(result).toEqual({ updated: false })
      expect(LiveUpdate.downloadBundle).not.toHaveBeenCalled()
    })

    it('rejects insecure http bundle_url to protect against MITM injection', async () => {
      mockSingle.mockResolvedValue({
        data: {
          version: '1.2.0',
          bundle_url: 'http://insecure-host.com/bundle.zip',
          mandatory: false,
          release_notes: null,
        },
        error: null,
      })

      const result = await checkForUpdates()
      expect(result).toEqual({ updated: false })
      expect(LiveUpdate.downloadBundle).not.toHaveBeenCalled()
    })

    it('returns updated: false when database version matches APP_VERSION', async () => {
      mockSingle.mockResolvedValue({
        data: {
          version: APP_VERSION,
          bundle_url: 'https://example.com/bundle.zip',
          mandatory: false,
          release_notes: 'Bug fixes',
        },
        error: null,
      })

      const result = await checkForUpdates()
      expect(result).toEqual({ updated: false })
      expect(LiveUpdate.getBundles).not.toHaveBeenCalled()
      expect(LiveUpdate.downloadBundle).not.toHaveBeenCalled()
    })

    it('prevents accidental downgrade when database version is older than current running version', async () => {
      // Simulate app having APP_VERSION = '2.0.0' while database has older '1.5.0'
      mockSingle.mockResolvedValue({
        data: {
          version: '0.9.0',
          bundle_url: 'https://example.com/bundle-0.9.0.zip',
          mandatory: false,
          release_notes: 'Older release',
        },
        error: null,
      })

      const result = await checkForUpdates()
      expect(result).toEqual({ updated: false })
      expect(LiveUpdate.getBundles).not.toHaveBeenCalled()
      expect(LiveUpdate.downloadBundle).not.toHaveBeenCalled()
    })

    it('prevents downgrade when active OTA bundle is newer than database version', async () => {
      vi.mocked(LiveUpdate.getCurrentBundle).mockResolvedValue({ bundleId: '2.5.0' } as any)
      mockSingle.mockResolvedValue({
        data: {
          version: '2.0.0',
          bundle_url: 'https://example.com/bundle-2.0.0.zip',
          mandatory: false,
          release_notes: 'Older than active bundle',
        },
        error: null,
      })

      const result = await checkForUpdates()
      expect(result).toEqual({ updated: false })
      expect(LiveUpdate.downloadBundle).not.toHaveBeenCalled()
    })

    it('enforces in-flight mutex to block concurrent checkForUpdates calls', async () => {
      // Simulate delayed network query
      let resolveQuery: (val: any) => void
      const queryPromise = new Promise((resolve) => {
        resolveQuery = resolve
      })

      mockSingle.mockReturnValue(queryPromise)

      const call1 = checkForUpdates()
      const call2 = checkForUpdates()

      // The second concurrent call should immediately return updated: false due to mutex
      const result2 = await call2
      expect(result2).toEqual({ updated: false })

      // Resolve the first call
      resolveQuery!({
        data: {
          version: APP_VERSION,
          bundle_url: 'https://example.com/bundle.zip',
        },
        error: null,
      })

      const result1 = await call1
      expect(result1).toEqual({ updated: false })
    })

    it('downloads new bundle when not yet cached, sets next bundle, and reloads by default', async () => {
      mockSingle.mockResolvedValue({
        data: {
          version: '1.2.0',
          bundle_url: 'https://example.com/bundle-1.2.0.zip',
          mandatory: true,
          release_notes: 'New grooming module',
        },
        error: null,
      })

      vi.mocked(LiveUpdate.getBundles).mockResolvedValue({
        bundleIds: ['1.0.0', '1.1.0'],
      } as any)
      vi.mocked(LiveUpdate.downloadBundle).mockResolvedValue(undefined as any)
      vi.mocked(LiveUpdate.setNextBundle).mockResolvedValue(undefined as any)
      vi.mocked(LiveUpdate.reload).mockResolvedValue(undefined as any)

      const result = await checkForUpdates()

      expect(LiveUpdate.downloadBundle).toHaveBeenCalledWith({
        bundleId: '1.2.0',
        url: 'https://example.com/bundle-1.2.0.zip',
      })
      expect(LiveUpdate.setNextBundle).toHaveBeenCalledWith({
        bundleId: '1.2.0',
      })
      expect(LiveUpdate.reload).toHaveBeenCalledTimes(1)
      expect(result).toEqual({
        updated: true,
        version: '1.2.0',
        notes: 'New grooming module',
      })
    })

    it('skips reloading if autoReload: false is specified (prepares next launch update)', async () => {
      mockSingle.mockResolvedValue({
        data: {
          version: '1.2.0',
          bundle_url: 'https://example.com/bundle-1.2.0.zip',
          mandatory: false,
          release_notes: 'Optional update',
        },
        error: null,
      })

      vi.mocked(LiveUpdate.getBundles).mockResolvedValue({
        bundleIds: [],
      } as any)
      vi.mocked(LiveUpdate.downloadBundle).mockResolvedValue(undefined as any)
      vi.mocked(LiveUpdate.setNextBundle).mockResolvedValue(undefined as any)

      const result = await checkForUpdates({ autoReload: false })

      expect(LiveUpdate.downloadBundle).toHaveBeenCalled()
      expect(LiveUpdate.setNextBundle).toHaveBeenCalledWith({
        bundleId: '1.2.0',
      })
      expect(LiveUpdate.reload).not.toHaveBeenCalled()
      expect(result.updated).toBe(true)
    })

    it('skips downloading if bundle is already downloaded in local storage', async () => {
      mockSingle.mockResolvedValue({
        data: {
          version: '1.2.0',
          bundle_url: 'https://example.com/bundle-1.2.0.zip',
          mandatory: false,
          release_notes: 'Cached update',
        },
        error: null,
      })

      vi.mocked(LiveUpdate.getBundles).mockResolvedValue({
        bundleIds: ['1.0.0', '1.2.0'],
      } as any)
      vi.mocked(LiveUpdate.setNextBundle).mockResolvedValue(undefined as any)
      vi.mocked(LiveUpdate.reload).mockResolvedValue(undefined as any)

      const result = await checkForUpdates()

      expect(LiveUpdate.downloadBundle).not.toHaveBeenCalled()
      expect(LiveUpdate.setNextBundle).toHaveBeenCalledWith({
        bundleId: '1.2.0',
      })
      expect(LiveUpdate.reload).toHaveBeenCalledTimes(1)
      expect(result).toEqual({
        updated: true,
        version: '1.2.0',
        notes: 'Cached update',
      })
    })

    it('catches download errors gracefully and returns updated: false without crashing', async () => {
      mockSingle.mockResolvedValue({
        data: {
          version: '1.3.0',
          bundle_url: 'https://example.com/bundle-1.3.0.zip',
          mandatory: false,
          release_notes: 'Failed bundle',
        },
        error: null,
      })

      vi.mocked(LiveUpdate.getBundles).mockResolvedValue({
        bundleIds: [],
      } as any)
      vi.mocked(LiveUpdate.downloadBundle).mockRejectedValue(new Error('Network timeout downloading ZIP'))

      const result = await checkForUpdates()

      expect(result).toEqual({ updated: false })
      expect(LiveUpdate.setNextBundle).not.toHaveBeenCalled()
      expect(LiveUpdate.reload).not.toHaveBeenCalled()
    })

    it('markLiveUpdateReady calls LiveUpdate.ready and catches exceptions', async () => {
      vi.mocked(LiveUpdate.ready).mockResolvedValue({} as any)
      await markLiveUpdateReady()
      expect(LiveUpdate.ready).toHaveBeenCalledTimes(1)

      // Test resilience on failure
      vi.mocked(LiveUpdate.ready).mockRejectedValue(new Error('Ready failed'))
      await expect(markLiveUpdateReady()).resolves.toBeUndefined()
    })

    it('resetToBuiltInBundle resets and reloads on native, handling errors safely', async () => {
      vi.mocked(LiveUpdate.reset).mockResolvedValue(undefined as any)
      vi.mocked(LiveUpdate.reload).mockResolvedValue(undefined as any)

      await resetToBuiltInBundle()
      expect(LiveUpdate.reset).toHaveBeenCalledTimes(1)
      expect(LiveUpdate.reload).toHaveBeenCalledTimes(1)

      // Test resilience on failure
      vi.mocked(LiveUpdate.reset).mockRejectedValue(new Error('Reset failed'))
      await expect(resetToBuiltInBundle()).resolves.toBeUndefined()
    })

    it('getCurrentBundleInfo retrieves active bundleId from LiveUpdate', async () => {
      vi.mocked(LiveUpdate.getCurrentBundle).mockResolvedValue({ bundleId: '1.2.0' } as any)

      const info = await getCurrentBundleInfo()
      expect(info).toEqual({
        currentVersion: APP_VERSION,
        activeBundleId: '1.2.0',
      })

      // Test failure fallback
      vi.mocked(LiveUpdate.getCurrentBundle).mockRejectedValue(new Error('Plugin error'))
      const failInfo = await getCurrentBundleInfo()
      expect(failInfo).toEqual({
        currentVersion: APP_VERSION,
        activeBundleId: null,
      })
    })
  })
})
