# iPhone web attendance and shared GPS validation

Date: 2026-09-25. Status: local implementation and automated verification completed; production database rollout, hosting and physical-device pilot remain pending. See `web-attendance-release.md` for release steps and limitations.

## Outcome and scope

Ship the existing React application over HTTPS for iPhone Safari and Home Screen use, alongside the Android Capacitor app. Keep one frontend and the existing Supabase backend. Share attendance validation and use the appropriate location provider for each platform.

Success means an employee can log in, take a selfie, obtain a sufficiently accurate location, and clock in/out from either platform. Poor or stale readings produce a clear retry path. The server enforces attendance rules independently of the interface. Physical tests establish achievable accuracy; neither browser nor native GPS guarantees it or proves physical presence.

Initial scope includes location acquisition, attendance submission, browser camera behavior, install metadata, deployment configuration, regression coverage, and a two-iPhone pilot. Native iOS distribution, background tracking, web push, and offline attendance submission are outside this release. Other employee pages remain shared and receive web smoke testing.

## Repository findings

| Current implementation | Consequence |
| --- | --- |
| `src/hooks/useAbsensi.ts` calls browser `getCurrentPosition`, requests high accuracy, and returns only `pos.coords`. | The Android attendance flow also uses browser geolocation. Accuracy is available but unused; the acquisition timestamp is lost. |
| `@capacitor/geolocation` is installed; `android/` and `ios/` exist. | Reuse the dependency for native acquisition; a second frontend is unnecessary. |
| `src/pages/Home.tsx` stores coordinates through the confirmation screen and directly calls the save hooks. | A reading can become stale before confirmation. Acquisition needs cancellation and submission needs renewed validation. |
| `src/lib/geofence.ts` checks the nearest active branch only, coercing inputs with `Number(...)`. | Validate missing/invalid inputs explicitly and check every eligible branch, including different-radius overlaps. |
| Home loads branches with a local/default fallback. | Cached/default branches may help display; they cannot authorize attendance. An empty authoritative branch list must stay empty. |
| `useAbsensi.ts` inserts/updates attendance directly and calculates time, date, and late status on the device. | Introduce an authoritative database transaction and close direct attendance-write bypasses. |
| `LeaveApplicationForm.tsx` inserts leave rows into the same `hr.attendance` table. | New permissions must preserve leave applications and admin operations. |
| Selfies use a file input with `capture='user'`; all uploaded blobs are labelled JPEG. | Capture is not a reliable camera-only guarantee. Real browser capture and actual image encoding need verification. |
| `index.html` and `vite.config.ts` have no web-app manifest/service-worker integration. | Add install metadata and deployment behavior deliberately. |
| `src/main.tsx` invokes native live updates; `src/lib/live-update.ts` already guards browser calls. | Keep native update behavior isolated from web releases. |
| Checked-in database types omit branch definitions and new location metadata; no SQL migrations were found in the inspected repositories. | Inspect the deployed schema and migration ownership before writing SQL; existing types do not prove current database constraints or policies. |

## Proposed initial policy

These are pilot defaults, adjustable centrally after on-site measurements, with the same rules on Android and web.

| Setting | Initial value |
| --- | --- |
| Branch radius | Existing active branch radius; validate positive finite values |
| Maximum reported horizontal error | 30 metres |
| Maximum location age at submission | 15 seconds |
| Acquisition attempt deadline | 30 seconds, then explicit retry |
| Acceptance | At least one eligible branch satisfies `distance + accuracy <= radius` |
| Attendance date/time | Server time, business timezone `Asia/Jakarta`, subject to confirmation of existing shift rules |
| Offline attendance | Block submission and explain that connection is required |

The accuracy value is an estimate, not a hard boundary or a fraud signal. An overlapping uncertainty circle means “location inconclusive,” not “employee definitely outside.” Do not expand office radii automatically or select a sample because it happens to fall inside. Use the newest valid reading, with a documented deterministic policy for equal timestamps; never keep an older inside reading after a newer outside reading.

## Phase 1 — Establish backend contracts and baseline

- Run `bun run test`, `bun run lint`, and `bun run build`; record existing failures separately before changing code.
- Read the deployed definitions of `hr.attendance`, `hr.branches`, user/shift records, grants, RLS policies, triggers, storage policies, and existing RPCs. Obtain a schema-only baseline through the established Supabase workflow; do not infer it from TypeScript types.
- Inspect attendance/leave consumers in the employee app and `pos_absensi`, including admin edits and supervisor corrections. Confirm whether all active branches are eligible or employees have branch assignments.
- Check existing duplicates before adding a unique attendance constraint. Do not silently delete or merge historical records. Resolve migration ownership; use `supabase/migrations/` here if there is no established authoritative location.
- Confirm overnight-shift handling before changing the current calendar-day behavior. Retain established payroll semantics.
- Select the production web hostname and existing hosting pipeline before creating provider-specific configuration. Implementation can proceed against an HTTPS staging origin meanwhile.

Completion: an explicit schema/RLS migration plan, branch eligibility rule, time rule, and list of affected clients.

## Phase 2 — Shared location acquisition and geofence rules

Create `src/services/locationService.ts` and `src/types/location.ts`. Keep the interface small: acquire/watch a normalized fix, report progress/errors, and cancel the operation. A fix contains latitude, longitude, accuracy in metres, acquisition timestamp, and provider label (`web` or `native`, diagnostic only).

- Native: call the installed Capacitor Geolocation plugin and its native permission APIs. Web: call `navigator.geolocation.watchPosition`; let the actual request obtain permission. A Permissions API probe is optional, never a prerequisite.
- Request high accuracy and no cached reading. Implement an application deadline independently of provider timeout behavior. Native provider options must match the installed plugin version.
- Validate finite numbers, latitude/longitude ranges, nonnegative accuracy, and sensible timestamps. Explicitly reject null/empty/coerced coordinates. Treat `(0, 0)` as outside these Indonesian branches rather than declaring it universally invalid.
- Distinguish denied permission, disabled/unavailable location, insecure context, timeout, insufficient accuracy, and cancellation. Do not fall back to IP geolocation or last-session coordinates.
- Clear watches and timers on success, error, timeout, retry, cancellation, logout, and unmount. Handle cancellation before Capacitor's asynchronous watch ID resolves; late callbacks must not revive a cancelled flow.
- Stop location use when the attendance flow is hidden/backgrounded; invalidate its fix and reacquire when the employee returns. Use browser visibility events and test native WebView lifecycle behavior before adding a native lifecycle dependency.
- Update `src/lib/geofence.ts` with a pure evaluation result: accepted, inaccurate, stale, outside, uncertain boundary, invalid data, or no eligible branch. Check every eligible branch; report the nearest for guidance only when none qualifies. Share numeric fixtures with database tests so both implementations agree.
- Audit Android manifest permissions; this foreground-only feature does not need `ACCESS_BACKGROUND_LOCATION`. Removing it requires a native rebuild. Native iOS privacy strings remain a prerequisite for any future iOS binary, not for Safari.

Completion: platform adapters return consistent readings and have automated cancellation, timeout, validation, and branch-boundary coverage.

## Phase 3 — Authoritative, retry-safe attendance API

Prefer a transactional Supabase database RPC for each attendance action; an Edge Function is unnecessary unless schema or storage requirements establish a need. Keep implementation details dependent on the verified schema.

- Add nullable historical-compatible metadata for clock-in/out: accuracy, sample time, matched branch, evaluated distance, and policy version. Store server event time separately from client-reported sample time. Add an idempotency key scoped to authenticated user and action, with a request fingerprint and a retrievable outcome.
- Derive identity from `auth.uid()`, validate employee role and eligibility, read branch coordinates/radius and shift data from the database, and calculate date/late status on the server. Never accept an authoritative user ID, branch configuration, status, or payroll timestamp from the client.
- Validate coordinates, accuracy, and sample age again. Reject stale or materially future timestamps with a documented small clock-skew allowance. Device sample time remains untrusted and is not proof of freshness against a malicious client.
- Atomically prevent duplicate clock-ins and clock-outs, reject clock-out without an open attendance row, and preserve leave conflicts. Repeated identical idempotency keys return the original result; altered payloads with a reused key fail.
- Enforce uniqueness according to the verified attendance/shift model. Concurrent requests and concurrent leave submissions must be handled by database constraints/transactions, not a client pre-check alone.
- Close employee direct-write bypasses for attendance timestamps, coordinates, status, and metadata. Preserve leave submission through a narrowly validated leave RPC or a demonstrably restrictive leave-only insert policy. Explicitly constrain all protected columns; a status-only policy is insufficient. Preserve authorized admin corrections with an audit trail.
- Restrict RPC execution to intended roles. If `SECURITY DEFINER` is needed, use a fixed safe search path, fully qualified objects, and explicit authorization checks. Test permissions using actual anonymous, employee, and admin database roles.
- Keep storage keys under the authenticated user's prefix. Validate object ownership/existence and image limits; do not accept arbitrary external photo URLs. Keep existing readers compatible with the chosen path/URL representation.
- Upload the selfie, obtain/revalidate a fresh fix after any slow upload, then invoke the RPC. Retain the same attempt key for an identical uncertain retry; after a confirmed rejection and a changed fix, start a new attempt.
- A network timeout can hide a successful commit. Query the attempt outcome before deleting its photo or retrying with changed data. Clean up only confirmed unreferenced uploads; retain uncertain uploads for reconciliation and schedule bounded orphan cleanup through the backend's established mechanism.
- Return typed business error codes and the saved record so UI state does not depend on a second successful fetch. Regenerate `src/types/database.ts` from the resulting schema.

Completion: integration tests prove authorization, geofence enforcement, concurrency, leave compatibility, and ambiguous-network-result recovery. Mocked Supabase tests alone cannot establish these properties.

## Phase 4 — Attendance interaction and selfie capture

Update `src/hooks/useAbsensi.ts` to use the location service and RPCs. Update `src/pages/Home.tsx`; extract `src/components/absensi/LocationStatus.tsx` and a focused camera component where needed.

- Use explicit stages: idle, capturing, locating, confirm, submitting, success/error. Keep one attempt ID and synchronous ref guard across start, retake, refresh, and submit. Disable conflicting actions during submission.
- Show measured accuracy, branch distance, and a readable reason when confirmation is unavailable. Example: “Akurasi lokasi ±65 m. Tunggu sebentar atau pindah ke area terbuka.” Provide “Coba lokasi lagi” without requiring a new selfie unnecessarily.
- Invalidate confirmation after its reading expires, on background/resume, or when permissions change. Before the final RPC, recheck/reacquire if needed and ensure the final fix still meets branch rules. Avoid showing success before the server confirms.
- Keep the map optional: loading failure must not prevent otherwise valid attendance. Guard asynchronous map initialization after cancellation/unmount.
- Web selfie: use `getUserMedia({ video: { facingMode: 'user' }, audio: false })` from an explicit user action, an inline video preview, and canvas capture to a real JPEG blob. Handle missing camera, denied permission, decode/capture failure, cancellation, rotation, and retake. Stop every media track on completion/cancellation/unmount and revoke old preview URLs.
- Native selfie: use the installed Capacitor Camera plugin with camera source, or retain the existing path only after confirming it meets the intended capture policy. Normalize the actual bytes/MIME type and enforce upload size limits. A camera UI still is not liveness detection.
- Keep attendance outside the existing offline queue; a network indicator is guidance, while the actual request determines success. Preserve recoverable attempt state for uncertain submissions, scoped to the signed-in user.
- Verify the existing supervisor correction mechanism. If present, document it for the pilot and require approver/reason/time audit data. If absent, a minimal authorized correction path in the admin repository is a prerequisite for rollout; employee self-approval is never a fallback.

Completion: users can recover from GPS/camera/network errors without duplicate records, leaked resources, or stale confirmation.

## Phase 5 — Web delivery and Home Screen setup

- Add `public/manifest.webmanifest`, existing-brand icons (including an Apple touch icon), and metadata in `index.html`. Use the existing routes with a stable app ID, start URL, scope, standalone display, theme color, and appropriate safe-area layout support.
- Deploy Vite's `dist/` over HTTPS with SPA rewrites so direct visits and refreshes at `/employee/home` work. Keep Capacitor's local bundle configuration intact; do not replace it with a remote web URL.
- Configure the web origin for any used Supabase auth redirects and Google Maps API referrer restrictions. Only publishable frontend environment values belong in the build; verify the existing environment contract without exposing secrets.
- Begin with online web delivery and Home Screen metadata. Add a service worker only if needed for the agreed installation/offline-shell experience. If added, cache static application assets only, register on web only, and exclude auth, API responses, location samples, payroll, photos, and attendance mutations. Existing authenticated data caches require logout/account-switch smoke tests.
- Serve HTML with revalidation and hashed assets with appropriate immutable caching. Avoid activating an update/reloading during capture or submission. Native live updates must also respect an active attendance attempt.
- Provide concise Indonesian instructions for Safari, site camera/location permissions, Precise Location where offered, and Add to Home Screen. Direct users out of embedded messaging browsers to Safari when permission behavior fails.

Completion: HTTPS staging works as a Safari tab and Home Screen app, including deep links, login/password-change guards, logout, and core employee pages.

## Phase 6 — Verification and mandatory Red-Team review

Proposed test locations:

| Area | Tests |
| --- | --- |
| Location provider | `src/services/__tests__/locationService.test.ts`: inaccurate-to-accurate updates, newer outside readings, out-of-order callbacks, future/stale timestamps, permission errors, deadlines, aborted async watch registration, cleanup |
| Geofence | Extend `src/lib/geofence.test.ts`: range/null errors, invalid radii, exact thresholds, uncertainty overlap, empty/inactive branches, and nearest-small/farther-large branch case |
| Attendance interaction | `src/pages/__tests__/Home.attendance.test.tsx`: double start/submit, cancel/retake, expired confirmation, background/resume, map failure, logout, camera-track/URL cleanup |
| Submission | Extend `src/services/__tests__/absensi_kasbon.redteam.test.ts`: saved-record result, upload failures, rejection cleanup, lost response after commit, idempotent recovery |
| Database | Migration integration tests against local/staging Supabase: real grants/RLS, user impersonation attempts, direct writes, parallel submissions, leave conflicts, reused keys, server time, branch changes |

At implementation completion, follow `AGENTS.md`: spawn a strictly read-only Red-Team subagent using the available collaboration tool and the prescribed prompt structure. Review in order: races; state transitions; security; error/boundary paths; durability. Independently verify findings, fix confirmed defects, add permanent regressions, and rerun review as needed. This plan is not a completed feature review.

Required repository checks: `bun run test`, `bun run lint`, `bun run build`. Also build/install the updated Android binary when native settings/plugins change. Real-device tests supplement automated checks; desktop browser emulation cannot establish iPhone GPS quality.

Pilot matrix: both employees' actual iPhones in Safari and Home Screen mode, plus at least one existing Android device. Test inside the branch, near the boundary, clearly outside, weak indoor signal, Wi-Fi/cellular, approximate/denied permission, camera cancellation, phone lock/resume, slow upload, lost response, and repeated taps. Record device/OS, time to usable fix, reported accuracy, result, and failure reason using minimal diagnostic data.

Exit criteria: required automated checks pass; database bypass tests fail as intended; no duplicate records or hanging flows; both iPhones can complete ordinary on-site attendance; Android remains functional; exceptions have an operational owner. Adjust the proposed thresholds only through an explicit policy change informed by pilot results.

## Release order and rollback

1. Prepare schema additions, RPCs, and tests in staging; retain compatibility while clients migrate. Do not describe this temporary stage as fully enforced while old direct writes remain possible.
2. Ship the updated Android client and HTTPS staging web build, then run the on-site pilot. Confirm whether existing binaries contain the required plugin code; native changes require a new binary, not just an OTA JavaScript bundle.
3. Verify all active employee clients have the new submission path. Establish a maintenance/update window for older versions before restricting direct writes; do not trust a client-supplied version header as an authorization rule.
4. Enable authoritative write restrictions, verify leave/admin workflows again, then publish the employee web URL and installation instructions.
5. Monitor pilot acceptance, timeout, permission, and duplicate-conflict rates. Expand only after the pilot exit criteria are met.

Rollback keeps additive columns and the secure RPC contract. Revert to a compatible frontend build or temporarily disable attendance and use audited supervisor corrections. Do not restore permissive direct writes as the routine rollback. Version policy changes so records retain the rule that was applied.

## Dependencies to resolve during implementation

- Live schema/RLS access and the authoritative migration repository.
- Hosting hostname/pipeline and configuration access for redirects/map keys.
- Existing shift/day and branch eligibility rules.
- Supervisor correction workflow and administrative owner.
- Physical access to the two iPhones and an Android device for the on-site pilot.

## References

- [Capacitor Geolocation v8](https://capacitorjs.com/docs/apis/geolocation): native/watch APIs and platform permission differences.
- [Browser geolocation](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition): secure context, high-accuracy request, timeout and cache controls.
- [Reported location accuracy](https://developer.mozilla.org/en-US/docs/Web/API/GeolocationCoordinates/accuracy): estimated horizontal error semantics.
- [Browser camera capture](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia): camera access and permission behavior.
- [Supabase database functions](https://supabase.com/docs/guides/database/functions): RPCs, security modes and execution permissions.
- [iPhone Home Screen web apps](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios): installation instructions.
