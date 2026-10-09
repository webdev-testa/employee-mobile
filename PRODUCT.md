# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Primary users are employees and staff at Dr.Meow. They operate on mobile devices (smartphones) during daily work shifts, performing attendance check-ins, monitoring salary advances, and viewing monthly digital payslips.

## Product Purpose

Dr.Meow (AbsenEmployee) is an employee self-service mobile application designed to streamline daily workplace attendance verification, cash advance (kasbon) management, and digital payslip access into a seamless mobile interface.

## Positioning

An integrated employee self-service app combining real-time GPS geofencing and camera photo verification for tamper-proof attendance, paired with transparent salary advance requests and instant digital payslip distribution.

## Operating Context

- Mobile smartphones (iOS & Android via Capacitor wrapper, as well as mobile web).
- Daily clock-in / clock-out routines at physical clinic/office locations using device GPS location & camera capture.
- Financial self-service workflows (requesting kasbon, checking approval status, inspecting pay breakdown).

## Capabilities and Constraints

- **Verified Attendance (Absensi):** Real-time GPS location validation against office coordinates, selfie photo capture via device camera, and timestamped attendance logging.
- **Salary Advances (Kasbon):** Request submission, history tracking, and approval status updates.
- **Digital Payslips (Slip Gaji):** Detailed breakdown of earnings, deductions, net pay, and printable/downloadable slip views.
- **Profile & Auth (Profil & Login):** User authentication backed by Supabase, profile settings, and dark/light theme options.
- **Technical Constraints:** React 19 + TypeScript + Vite + Tailwind CSS v4 + Capacitor 8 + Supabase backend + Google Maps API.

## Brand Commitments

- **Name:** Dr.Meow (`absenemployee` / `com.absen.employee`).
- **Design Persona:** Clean, friendly, intuitive, high-utility employee companion with mobile-native interaction patterns.

## Evidence on Hand

- Runnable Vite codebase with complete route structure (`Absensi.tsx`, `Home.tsx`, `Kasbon.tsx`, `Profil.tsx`, `SlipGaji.tsx`, `login/`).
- Capacitor configuration for Android and iOS (`capacitor.config.ts`).
- Integrated Supabase client (`@supabase/supabase-js`) and Google Maps loader.

## Product Principles

1. **Frictionless Daily Routine:** Attendance clock-in must be completed in seconds with immediate visual feedback on GPS accuracy and camera readiness.
2. **Clarity Over Complexity:** Financial status (kasbon balances, payslip items) must be instantly readable at a glance without jargon.
3. **Mobile-First Ergonomics:** UI elements, action buttons, and touch targets must be optimized for one-handed mobile use.
4. **Reliability & Trust:** Clear state indicators for location lock, camera permissions, network sync, and submission status.

## Accessibility & Inclusion

- High contrast text and UI elements supporting light and dark modes (`next-themes`).
- Accessible touch targets (minimum 44x44px) and clear screen reader labels across all primary actions.
