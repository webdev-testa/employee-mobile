---
version: 1.0.0
name: DrMeow-Figma-Wise-Hybrid-Design-System
description: "A friendly, high-utility mobile design system for Dr.Meow combining the approachable pastel color-block identity of Figma with the razor-sharp financial clarity, tabular numeric typography, and robust semantic status hierarchy of Wise. Built for fast 1-tap daily attendance, transparent salary advance (Kasbon) tracking, and clear digital payslip distribution with mobile-native ergonomics."

colors:
  # Base System Canvas & Ink
  primary: "#0c1d2a"
  on-primary: "#faf8f5"
  ink: "#0c1d2a"
  ink-muted: "#556575"
  body: "#374756"
  canvas: "#faf8f5"
  canvas-soft: "#f2efe9"
  surface-card: "#ffffff"
  surface-card-hover: "#f7f9fa"
  surface-muted: "#edeae4"
  hairline: "#e5e2da"
  hairline-soft: "#edeae3"

  # Dark Mode Surfaces
  dark-canvas: "#0c1d2a"
  dark-surface-card: "#142533"
  dark-surface-elevated: "#1c2f40"
  dark-ink: "#faf8f5"
  dark-ink-muted: "#94a3b8"
  dark-hairline: "rgba(255, 255, 255, 0.10)"

  # Figma-Inspired Pastel Color-Block Surfaces
  block-lime: "#dceeb1"
  block-lime-text: "#203a11"
  block-mint: "#c8e6cd"
  block-mint-text: "#123b1c"
  block-cream: "#f4ecd6"
  block-cream-text: "#3d3215"
  block-lilac: "#c5b0f4"
  block-lilac-text: "#2c1c4f"
  block-pink: "#efd4d4"
  block-pink-text: "#4d1d1d"
  block-coral: "#f3c9b6"
  block-coral-text: "#4a2312"
  block-navy: "#1f1d3d"
  block-navy-text: "#faf8f5"

  # Wise-Inspired Financial & Brand Highlights
  brand-lime: "#9fe870"
  brand-lime-hover: "#8cd95c"
  brand-lime-text: "#0c1d2a"
  brand-forest: "#163300"
  accent-magenta: "#ff3d8b"

  # Wise-Inspired Semantic Status Tokens (Kasbon & Attendance)
  status-success: "#2ead4b"
  status-success-bg: "#e2f6d5"
  status-success-text: "#124720"

  status-warning: "#e89e3a"
  status-warning-bg: "#faf0e1"
  status-warning-text: "#6b430e"

  status-danger: "#d03238"
  status-danger-bg: "#fde8e8"
  status-danger-text: "#611619"

  status-info: "#254fad"
  status-info-bg: "#f0f7ff"
  status-info-border: "#c8e8f5"
  status-info-text: "#153370"

  status-neutral: "#707a8a"
  status-neutral-bg: "#edeae4"
  status-neutral-text: "#38414e"

typography:
  time-display-mega:
    fontFamily: "Geist Variable, Inter, sans-serif"
    fontSize: "36px"
    fontWeight: "700"
    lineHeight: "1.1"
    letterSpacing: "-1px"
    fontFeature: "tnum"
  financial-display:
    fontFamily: "Geist Variable, Inter, sans-serif"
    fontSize: "28px"
    fontWeight: "800"
    lineHeight: "1.15"
    letterSpacing: "-0.5px"
    fontFeature: "tnum"
  financial-metric-md:
    fontFamily: "Geist Variable, Inter, sans-serif"
    fontSize: "20px"
    fontWeight: "700"
    lineHeight: "1.25"
    fontFeature: "tnum"
  display-lg:
    fontFamily: "Geist Variable, Inter, sans-serif"
    fontSize: "24px"
    fontWeight: "700"
    lineHeight: "1.25"
    letterSpacing: "-0.4px"
  headline:
    fontFamily: "Geist Variable, Inter, sans-serif"
    fontSize: "20px"
    fontWeight: "700"
    lineHeight: "1.3"
    letterSpacing: "-0.2px"
  title-md:
    fontFamily: "Geist Variable, Inter, sans-serif"
    fontSize: "16px"
    fontWeight: "600"
    lineHeight: "1.35"
  title-sm:
    fontFamily: "Geist Variable, Inter, sans-serif"
    fontSize: "14px"
    fontWeight: "600"
    lineHeight: "1.4"
  body-md:
    fontFamily: "Geist Variable, Inter, sans-serif"
    fontSize: "15px"
    fontWeight: "400"
    lineHeight: "1.5"
  body-sm:
    fontFamily: "Geist Variable, Inter, sans-serif"
    fontSize: "13px"
    fontWeight: "400"
    lineHeight: "1.45"
  label-mono:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: "600"
    lineHeight: "1.3"
    letterSpacing: "0.5px"
    textTransform: "uppercase"
  button:
    fontFamily: "Geist Variable, Inter, sans-serif"
    fontSize: "15px"
    fontWeight: "600"
    lineHeight: "1.0"

rounded:
  none: "0px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  "2xl": "24px"
  "3xl": "32px"
  pill: "9999px"
  full: "9999px"

spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  "2xl": "32px"
  "3xl": "48px"

components:
  button-primary-pill:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    height: "50px"
    padding: "14px 24px"

  button-wise-lime:
    backgroundColor: "{colors.brand-lime}"
    textColor: "{colors.brand-lime-text}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    height: "50px"
    padding: "14px 24px"

  button-secondary-pill:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    border: "1px solid {colors.hairline}"
    height: "46px"
    padding: "12px 20px"

  color-block-card-lime:
    backgroundColor: "{colors.block-lime}"
    textColor: "{colors.block-lime-text}"
    rounded: "{rounded.2xl}"
    padding: "20px"

  color-block-card-mint:
    backgroundColor: "{colors.block-mint}"
    textColor: "{colors.block-mint-text}"
    rounded: "{rounded.2xl}"
    padding: "20px"

  color-block-card-cream:
    backgroundColor: "{colors.block-cream}"
    textColor: "{colors.block-cream-text}"
    rounded: "{rounded.2xl}"
    padding: "20px"

  color-block-card-lilac:
    backgroundColor: "{colors.block-lilac}"
    textColor: "{colors.block-lilac-text}"
    rounded: "{rounded.2xl}"
    padding: "20px"

  color-block-card-coral:
    backgroundColor: "{colors.block-coral}"
    textColor: "{colors.block-coral-text}"
    rounded: "{rounded.2xl}"
    padding: "20px"

  kasbon-metric-card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.2xl}"
    padding: "20px"
    border: "1px solid {colors.hairline}"

  status-badge-positive:
    backgroundColor: "{colors.status-success-bg}"
    textColor: "{colors.status-success-text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"

  status-badge-warning:
    backgroundColor: "{colors.status-warning-bg}"
    textColor: "{colors.status-warning-text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"

  status-badge-danger:
    backgroundColor: "{colors.status-danger-bg}"
    textColor: "{colors.status-danger-text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"

  status-badge-info:
    backgroundColor: "{colors.status-info-bg}"
    textColor: "{colors.status-info-text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"

  mobile-bottom-nav:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink-muted}"
    height: "64px"
    borderTop: "1px solid {colors.hairline}"
---

# Dr.Meow — Figma + Wise Hybrid Design System

## 1. System Overview & Philosophy

**Dr.Meow (AbsenEmployee)** is an everyday companion for clinic & office employees. Its design combines two distinct strengths into a harmonious, mobile-optimized experience:

1. **Figma's Friendly Pastel Color-Block Canvas:**
   - Gives the app a warm, humane, and cheerful personality without sacrificing modern precision.
   - Distinctive pastel surface panels (`mint` for verified attendance, `lime` for active status & CTA readiness, `lilac` for profile/payslips, `cream` for quick notes, `coral` for alerts/clock-out).
   - Generous border radii (`rounded-2xl`, `rounded-3xl`, and `rounded-pill`).

2. **Wise's Financial Clarity & Scannability:**
   - Crystal-clear tabular numeric typography (`font-feature: 'tnum'`) ensuring financial figures (Kasbon balance, limits, deductions, net salary) are immediately readable without layout shifts.
   - High-contrast, unambiguous semantic status indicators (*Positive / Warning / Danger / Info / Neutral*) providing trust during money operations and attendance logs.
   - Compact metric cards with progress meters and quick-select transaction chips.

---

## 2. Color Palette & Semantics

### Base Surfaces & Ink
* **Canvas (`--background`):** Light `#faf8f5` (warm paper) / Dark `#0c1d2a` (deep navy ink).
* **Card (`--card`):** Light `#ffffff` / Dark `#142533` with subtle border `rgba(255,255,255,0.08)`.
* **Primary Ink (`--foreground`):** Deep navy-charcoal `#0c1d2a` in light mode, `#faf8f5` in dark mode.

### Signature Figma Pastel Blocks
* **Block Lime (`#dceeb1` / Text `#203a11`):** Daily attendance status, quick action prompts, and highlight cards.
* **Block Mint (`#c8e6cd` / Text `#123b1c`):** Successful clock-in, geofence verified, on-time arrival.
* **Block Cream (`#f4ecd6` / Text `#3d3215`):** Explanatory callouts, policy guidelines, and neutral banners.
* **Block Lilac (`#c5b0f4` / Text `#2c1c4f`):** Payslip summary header, profile highlights, and badges.
* **Block Coral (`#f3c9b6` / Text `#4a2312`):** Clock-out action cards, urgent alerts, and pending requests.
* **Block Navy (`#1f1d3d` / Text `#faf8f5`):** Evening shift check-ins and high-emphasis focal tiles.

### Wise Financial & Semantic Status Tokens
* **Brand Lime (`#9fe870` / Text `#0c1d2a`):** Primary financial highlight for available Kasbon balance.
* **Positive (`#2ead4b` / Bg `#e2f6d5` / Text `#124720`):** `Disetujui`, `Tepat Waktu`, `Paid`.
* **Warning (`#e89e3a` / Bg `#faf0e1` / Text `#6b430e`):** `Menunggu Approval`, `Terlambat`, `Pending`.
* **Danger (`#d03238` / Bg `#fde8e8` / Text `#611619`):** `Ditolak`, `Tidak Hadir`, `Over Limit`.
* **Info (`#254fad` / Bg `#f0f7ff` / Text `#153370`):** `Cuti`, `Izin`, `Sakit`, `Dipotong`.
* **Neutral (`#707a8a` / Bg `#edeae4` / Text `#38414e`):** `Weekend`, `Draft`, `Selesai`.

---

## 3. Typography & Tabular Numerics

### Font Stack
* **Primary Sans:** `Geist Variable`, `Inter`, `-apple-system`, `sans-serif`
* **Monospace / Taxonomy:** `JetBrains Mono`, `ui-monospace`, `monospace`

### Tabular Numbers (`font-feature: "tnum"`)
All numbers relating to currency, clock timers, percentages, and dates MUST use tabular figures (`tabular-nums`) to maintain vertical alignment and prevent jitter during live updates.

```css
.financial-num {
  font-family: var(--font-sans);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
```

### Typographic Scale

| Role | Size | Weight | Line Height | Features | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `time-display-mega` | 36px | 700 | 1.1 | `tabular-nums` | Live clock timer on Home & Absensi |
| `financial-display` | 28px | 800 | 1.15 | `tabular-nums` | Total Net Salary, Sisa Limit Kasbon |
| `financial-metric-md`| 20px | 700 | 1.25 | `tabular-nums` | Card metric headers, line deductions |
| `display-lg` | 24px | 700 | 1.25 | `-0.4px` | Page title banners |
| `headline` | 20px | 700 | 1.3 | `-0.2px` | Section titles |
| `title-md` | 16px | 600 | 1.35 | normal | Card titles, modal headers |
| `body-md` | 15px | 400 | 1.5 | normal | Primary text, descriptions |
| `body-sm` | 13px | 400 | 1.45 | normal | Metadata, captions, secondary info |
| `label-mono` | 11px | 600 | 1.3 | `+0.5px`, uppercase | Eyebrows, status tags, badges |
| `button` | 15px | 600 | 1.0 | normal | Pill action buttons |

---

## 4. Mobile Ergonomics & Layout

### One-Handed Reachability
* **Thumb Zone Priority:** Primary actions (Clock-In button, Kasbon submission CTA, Filter pills) are positioned within comfortable reach at the middle-to-bottom of the mobile screen.
* **Touch Target Size:** Minimum **44x44px** (primary pills: **48px - 54px** height) for effortless one-handed tapping during morning commutes.

### Corner Radius System
* **Pill (`rounded-full` / `9999px`):** All action buttons, filter tags, and status badges.
* **`rounded-2xl` (20-24px):** Primary content cards, color-block sections, and modal sheets.
* **`rounded-xl` (14-16px):** Form inputs, quick-amount selection tiles, and camera preview viewport.
* **`rounded-md` (8-10px):** Mini status dots, small chips, and table line accents.

---

## 5. Core Feature Specifications

### 5.1 Verified Attendance (Absensi)
* **Status Card:** Uses `block-mint` when within office geofence ($\le$ 100m) and `block-coral` when out of range.
* **Live GPS Indicator:** Pulsing dot with clear distance meter in meters (`12m dari klinik Dr.Meow`).
* **Camera Capture:** 4:3 rounded viewfinder with quick selfie retake trigger.
* **Clock Action:** Full-width pill button (`54px` height) with loading spinner on submission.

### 5.2 Salary Advances (Kasbon)
* **Balance Progress Bar:** Wise-inspired limit meter showing *Used this month* vs *Remaining Limit*.
* **Quick Amount Selector:** Pill-shaped selector chips (`Rp 100k`, `Rp 250k`, `Rp 500k`, `Rp 1jt`).
* **Status Badges:** Explicit Wise status badges (`⏳ Menunggu`, `✓ Disetujui`, `✗ Ditolak`, `Dipotong`).

### 5.3 Digital Payslips (Slip Gaji)
* **Hero Net Pay Card:** Lilac-tinted or clean white card with `financial-display` bold net earnings.
* **Itemized Table:** Clear separation between **Penghasilan (Earnings)** with green `+` prefixes and **Potongan (Deductions)** with red `-` prefixes.
* **Print / Export:** Single-tap clean view optimized for screen captures and mobile sharing.

---

## 6. Do's and Don'ts

### Do
* **Use tabular figures (`tabular-nums`)** for all currency and time values.
* **Maintain 44px+ minimum tap heights** for buttons and interactive rows.
* **Leverage pastel color blocks** as contextual backgrounds (e.g. mint for success, lime for active actions).
* **Provide clear, human feedback** (e.g., "Dalam radius kantor (24m)" instead of raw lat/lng coordinates).
* **Support seamless dark mode** with muted navy/slate background alternatives.

### Don't
* **Don't use harsh red/black alerts** for minor attendance or kasbon updates; use soft warning/danger tones.
* **Don't use square, sharp-cornered buttons**; keep the friendly pill signature.
* **Don't mix non-tabular fonts** inside financial tables or payslip line items.
* **Don't hide critical status info** behind deep navigation trees.
