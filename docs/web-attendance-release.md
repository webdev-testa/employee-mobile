# Web attendance release runbook

Implementation is staged locally. No SQL has been applied to production and no website has been published by this change.

## Verification on 2026-09-25

- `bun run test`: 149 tests passed across 16 files, including 13 isolated PostgreSQL/RLS tests.
- `bun run lint`: no errors; one existing attendance-page effect dependency warning remains.
- `bun run build`: passed; existing large-bundle advisory remains.
- `bunx cap sync android` followed by `android/gradlew.bat -p android assembleDebug`: passed. Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk` (requires the additive RPC migration before attendance works).
- Local production preview: root, `/employee/home`, manifest, and app icon return HTTP 200.
- Mandatory read-only Red-Team review completed; all verified findings fixed and covered by permanent regression tests. Findings included browser coordinate getters, stalled upload/refresh waits, storage exceptions, previous-day recovery, and late initial reads overwriting committed attendance.
- Baseline before implementation had three failing live-update fixtures and 46 lint errors. Updated stale version fixtures, typed existing test/payroll values, corrected the login effect declaration, excluded generated Android bridge files from lint, and documented narrowly scoped React refresh/effect exceptions.

## Database rollout

1. Review `supabase/migrations/202609250001_attendance_api.sql` against the target project. Its photo URL origin targets the linked Absensi project; change it when installing on another project. The deployed schema was inspected on 2026-09-25.
2. Apply the additive migration through the project's normal database release process. It creates the attendance RPC, stored request outcomes, location audit metadata, branch read policy, and a duplicate guard. Existing duplicate records are not deleted. The inspection found one duplicate group; an administrator must investigate it. Clock-out deliberately rejects ambiguous records.
3. Release the new web build and Android binary to the pilot employees. New builds require the RPC; they never silently fall back to direct writes.
4. After all active clients have upgraded, apply `supabase/rollout/attendance_enforcement.sql`. This separately closes employee direct-attendance writes, preserves leave inserts, blocks profile role/shift/payroll escalation, and removes unsafe table privileges. Until this step, legacy writes are still possible and server enforcement is incomplete.
5. Verify existing superadmin leave approvals and attendance flagging. Audit all other privileged RPCs/grants before declaring the entire HR database hardened; these scripts address the attendance path only.

Backend tests run isolated PostgreSQL through PGlite with real functions and RLS, using fixtures matching inspected table contracts. They do not replace staging tests of Supabase Storage, PostgREST, actual concurrent connections, or deployed authentication.

## Hosting

Use the existing host or select an HTTPS hostname. Build command: `bun run build`; publish directory: `dist`. Configure navigation fallbacks to `/index.html` for React Router paths such as `/employee/home` while preserving real asset responses. Revalidate HTML; cache content-hashed assets immutably. Allow camera/geolocation for the same origin if setting Permissions-Policy headers.

Configure only publishable Vite variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, optional `VITE_SUPABASE_SCHEMA`, and the existing Google Maps key/other existing app environment variables. Do not put service-role keys in frontend builds. Add the hostname to Maps referrer restrictions and any used Supabase auth redirect allowlist.

The app includes a Home Screen manifest and reuses the existing iOS application icon. It intentionally has no service worker: attendance requires connectivity and private API/photo/payroll data should not enter a new offline cache. Capacitor still packages local `dist` assets. Startup downloads native updates for the next launch instead of reloading an active attendance flow.

Run `bunx cap sync android` and rebuild the Android binary for the foreground-permission change. Do not rely on an OTA bundle to change the native manifest. Native iOS is not part of this release; its location/camera Info.plist privacy strings must be supplied before a future native iOS build.

## Employee instructions

1. Buka tautan aplikasi menggunakan Safari, bukan browser di dalam WhatsApp.
2. Masuk dengan akun karyawan. Izinkan kamera dan lokasi saat diminta. Aktifkan Lokasi Tepat/Precise Location untuk Safari bila tersedia di pengaturan perangkat.
3. Untuk ikon aplikasi: menu Bagikan → Tambahkan ke Layar Utama.
4. Ambil selfie, tunggu lokasi presisi, lalu Konfirmasi. Jika lokasi belum akurat, pindah ke area terbuka dan tekan Coba lokasi lagi.
5. Bila pengiriman belum pasti, tekan Periksa pengiriman. Jangan membuat permintaan baru di perangkat lain sebelum hasilnya jelas.

## Pilot and operational checks

- Test the two actual iPhones in Safari and Home Screen mode plus one Android binary at the branch. Include indoors, boundary, outside, denied/approximate permission, camera cancellation, Wi-Fi/cellular, slow upload, phone lock, and lost response after submission.
- Defaults: accuracy <=30 m, sample age <=15 s, 30 s acquisition deadline, and distance plus estimated accuracy <= branch radius. Tune only after measured on-site results. Browser/native readings remain client-reported, not tamper-proof location evidence.
- Keep the current calendar-day rule in Asia/Jakarta. Overnight shift support needs a separately agreed business rule.
- Verify an authorized supervisor correction procedure before rollout. The inspected admin hook supports leave approvals and flags, but a complete manual attendance correction workflow was not established. Do not offer an employee bypass.
- A failed/uncertain RPC never causes immediate photo deletion. For orphan maintenance, enumerate old objects through the Storage API, exclude every path referenced by attendance or retained attempts, use a generous age cutoff (at least 7 days), and delete only verified unreferenced files. Do not delete storage metadata directly in SQL. Scheduling this job requires the chosen backend operational mechanism.
- Pending request data is scoped by user and retained locally only until a definitive response; replay preserves the original attempt and payload. Keep the secure RPC contract when rolling back clients. Do not restore permissive writes as a rollback shortcut.

## Release blockers external to the local implementation

Production SQL rollout, HTTPS host selection/publication, real-device pilot, multi-connection race testing, duplicate-record review, and the supervisor exception process must be completed before calling this production-ready.
