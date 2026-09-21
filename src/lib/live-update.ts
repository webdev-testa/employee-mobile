import { Capacitor } from '@capacitor/core';
import { LiveUpdate } from '@capawesome/capacitor-live-update';
import { supabase } from '@/lib/supabase';

/**
 * Version of the web bundle currently built into this APK.
 *
 * IMPORTANT:
 * Every time you create a new OTA release, bump this version
 * before running `bun run build`.
 */
export const APP_VERSION = '1.1.0';

const SEMVER_REGEX = /^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$/;

let isCheckingForUpdates = false;

export interface AppVersionRecord {
  version: string;
  bundle_url: string;
  mandatory: boolean;
  release_notes: string | null;
}

export interface CheckForUpdatesOptions {
  /**
   * Whether to immediately reload the WebView after downloading the bundle.
   * If false, setNextBundle() is called and the bundle will activate on next launch.
   * Defaults to true.
   */
  autoReload?: boolean;
}

/**
 * Compare two semver strings (e.g. "1.2.0" and "1.1.9").
 * Returns:
 *   1 if a > b
 *  -1 if a < b
 *   0 if a == b
 */
export function compareSemver(a: string, b: string): number {
  const cleanA = a.trim().split('-')[0];
  const cleanB = b.trim().split('-')[0];
  const partsA = cleanA.split('.').map((num) => parseInt(num, 10) || 0);
  const partsB = cleanB.split('.').map((num) => parseInt(num, 10) || 0);

  const maxLen = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < maxLen; i++) {
    const partA = partsA[i] ?? 0;
    const partB = partsB[i] ?? 0;
    if (partA > partB) return 1;
    if (partA < partB) return -1;
  }
  return 0;
}

/**
 * Validates if the bundle URL is a secure, valid HTTPS URL.
 */
export function isValidBundleUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr.trim());
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Check Supabase for a newer web bundle.
 *
 * Only runs on Android/iOS.
 * If anything fails, the current app continues normally.
 */
export async function checkForUpdates(
  options: CheckForUpdatesOptions = {},
): Promise<{
  updated: boolean;
  version?: string;
  notes?: string | null;
}> {
  // Don't run OTA logic in the browser.
  if (!Capacitor.isNativePlatform()) {
    return { updated: false };
  }

  // Mutex lock to prevent race conditions & duplicate downloads
  if (isCheckingForUpdates) {
    console.warn('[LiveUpdate] Update check already in progress');
    return { updated: false };
  }

  isCheckingForUpdates = true;

  try {
    // 1. Get the newest published bundle.
    const { data, error } = await supabase
      .schema('hr')
      .from('app_versions')
      .select('version, bundle_url, mandatory, release_notes')
      .order('created_at', { ascending: false })
      .limit(1)
      .single<AppVersionRecord>();

    if (error || !data) {
      console.warn(
        '[LiveUpdate] No version record found:',
        error?.message,
      );
      return { updated: false };
    }

    const version = (data.version || '').trim();
    const bundleUrl = (data.bundle_url || '').trim();

    // Validate version string format
    if (!version || !SEMVER_REGEX.test(version)) {
      console.warn('[LiveUpdate] Invalid semver version record:', data.version);
      return { updated: false };
    }

    // Validate HTTPS bundle URL
    if (!bundleUrl || !isValidBundleUrl(bundleUrl)) {
      console.warn('[LiveUpdate] Invalid or insecure bundle URL:', data.bundle_url);
      return { updated: false };
    }

    // 2. Check which bundle is actually active.
    const { bundleId: currentBundleId } = await LiveUpdate.getCurrentBundle();

    if (currentBundleId === data.version || (!currentBundleId && data.version === APP_VERSION)) {
      console.log(
        '[LiveUpdate] Already on latest version:',
        data.version,
      );

      return { updated: false };
    }

    const currentRunningVersion = currentBundleId || APP_VERSION;

    // Guard against downgrades if running a newer version
    if (compareSemver(version, currentRunningVersion) < 0) {
      console.log(
        '[LiveUpdate] Currently on newer version:',
        currentRunningVersion,
      );
      return { updated: false };
    }

    console.log(
      `[LiveUpdate] Update available: ${currentRunningVersion} → ${version}`,
    );

    // 3. Check whether this bundle has already been downloaded.
    const { bundleIds } = await LiveUpdate.getBundles();
    const alreadyDownloaded = (bundleIds || []).includes(version);

    // 4. Download only if necessary.
    if (!alreadyDownloaded) {
      console.log(`[LiveUpdate] Downloading bundle ${version}...`);
      await LiveUpdate.downloadBundle({
        bundleId: version,
        url: bundleUrl,
      });
    }

    // 5. Tell Capawesome to use this bundle after reload.
    await LiveUpdate.setNextBundle({
      bundleId: version,
    });

    console.log(`[LiveUpdate] Bundle ${version} set as next bundle`);

    const autoReload = options.autoReload ?? true;

    // 6. Reload the WebView so the new bundle becomes active if requested
    if (autoReload) {
      console.log('[LiveUpdate] Reloading WebView to apply new bundle...');
      await LiveUpdate.reload();
    }

    return {
      updated: true,
      version,
      notes: data.release_notes,
    };
  } catch (error) {
    console.warn('[LiveUpdate] Update check failed:', error);
    // Never prevent the employee from using the app
    // just because an OTA update failed.
    return { updated: false };
  } finally {
    isCheckingForUpdates = false;
  }
}

/**
 * Mark the current bundle as healthy.
 *
 * Capawesome uses this to confirm that the current bundle
 * successfully started and does not need rollback.
 */
export async function markLiveUpdateReady(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const result = await LiveUpdate.ready();
    console.log('[LiveUpdate] Ready:', result);
  } catch (error) {
    console.warn('[LiveUpdate] Ready check failed:', error);
  }
}

/**
 * Emergency rollback to the APK's built-in web bundle.
 */
export async function resetToBuiltInBundle(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await LiveUpdate.reset();
    await LiveUpdate.reload();
  } catch (error) {
    console.warn('[LiveUpdate] Reset failed:', error);
  }
}

/**
 * Get information about the currently active bundle.
 */
export async function getCurrentBundleInfo(): Promise<{
  currentVersion: string;
  activeBundleId: string | null;
}> {
  if (!Capacitor.isNativePlatform()) {
    return {
      currentVersion: APP_VERSION,
      activeBundleId: null,
    };
  }

  try {
    const { bundleId } = await LiveUpdate.getCurrentBundle();
    return {
      currentVersion: APP_VERSION,
      activeBundleId: bundleId ?? null,
    };
  } catch {
    return {
      currentVersion: APP_VERSION,
      activeBundleId: null,
    };
  }
}
