# Customization Guide

Use this guide to update site configuration, copy, styling, and backend parameters without changing core business logic.

## Configuration Reference

| I want to change | Edit file | Key / Section |
| :--- | :--- | :--- |
| Product name | `frontend/src/config/site.config.ts` | `siteConfig.name` |
| Tagline | `frontend/src/config/site.config.ts` | `siteConfig.tagline` |
| Logo text | `frontend/src/config/site.config.ts` | `siteConfig.logoText` |
| Contact email | `frontend/src/config/site.config.ts` | `siteConfig.contactEmail` |
| Navigation links | `frontend/src/config/site.config.ts` | `siteConfig.navLinks` |
| Footer text | `frontend/src/config/site.config.ts` | `siteConfig.footerText` |
| Map default center and zoom | `frontend/src/config/site.config.ts` | `siteConfig.mapDefault` |
| Page text (Detector / Home) | `frontend/src/config/content/detector.ts` | Section copy keys |
| Page text (Map view) | `frontend/src/config/content/map.ts` | Section copy keys |
| Global color tokens & variables | `frontend/src/styles/tokens.css` | `:root` CSS variables |
| Tailwind theme color tokens | `frontend/tailwind.config.ts` | `theme.extend.colors` |
| Global typography & scale | `frontend/src/styles/tokens.css` | `--font-*` CSS variables |
| YOLO model path | `backend/.env` / `backend/app/core/settings.py` | `MODEL_PATH` |
| Confidence & IoU thresholds | `backend/.env` / `backend/app/core/settings.py` | `CONFIDENCE_THRESHOLD`, `IOU_THRESHOLD` |
| Max upload size & allowed types | `backend/.env` / `backend/app/core/settings.py` | `MAX_UPLOAD_SIZE_MB`, `ALLOWED_FILE_TYPES` |
| Severity categorization thresholds | `backend/.env` / `backend/app/core/settings.py` | `SEVERITY_LOW_MAX`, `SEVERITY_MEDIUM_MAX` |
| Allowed CORS origins | `backend/.env` / `backend/app/core/settings.py` | `CORS_ORIGINS` |
| Database connection URL | `backend/.env` / `backend/app/core/settings.py` | `DATABASE_URL` |

## Color Palette Tokens & Usage Rules

All colors in the system are defined strictly as design tokens. No hardcoded hex or default arbitrary color classes are permitted in components.

| Token | Hex Value | CSS Variable | Usage Rules |
| :--- | :--- | :--- | :--- |
| `primary-600` | `#2563EB` | `--color-primary-600` | Interactive elements only (buttons, links, focus rings, active nav) |
| `primary-700` | `#1D4ED8` | `--color-primary-700` | Hover states for primary interactive elements |
| `primary-50` | `#EFF6FF` | `--color-primary-50` | Subtle interactive backgrounds, card icon backgrounds, dropzone bg |
| `primary-100` | `#DBEAFE` | `--color-primary-100` | Dropzone drag-over state, active/pressed interactive tints |
| `accent-400` | `#22D3EE` | `--color-accent-400` | Decorative details on **dark backgrounds only** (labels, underlines, icons). Never use with white text. |
| `accent-700` | `#0E7490` | `--color-accent-700` | Accent text or decorative icons on **light backgrounds** |
| `ink-900` | `#0B1220` | `--color-ink-900` | Primary headings, dark badges text, footer background |
| `ink-800` | `#16264A` | `--color-ink-800` | Form labels, dark contrast surfaces, hero gradient mid-point |
| `text-body` | `#334155` | `--color-text-body` | Standard body paragraphs and readable text |
| `text-muted` | `#5B6B82` | `--color-text-muted` | Secondary captions, timestamps, helper descriptions |
| `bg-page` | `#F5F8FF` | `--color-bg-page` | Overall page background |
| `bg-surface` | `#FFFFFF` | `--color-bg-surface` | Card surfaces, modals, popups, navbar background |
| `border-default` | `#DDE5F2` | `--color-border-default` | Card borders, dividers, table borders, input borders |
| `sev-low` | `#15803D` | `--color-sev-low` | Low severity indicator dot and marker border |
| `sev-low-soft` | `#DCFCE7` | `--color-sev-low-soft` | Low severity badge background (used with `ink-900` text) |
| `sev-medium` | `#D97706` | `--color-sev-medium` | Medium severity indicator dot and marker border |
| `sev-medium-soft` | `#FEF3C7` | `--color-sev-medium-soft` | Medium severity badge background (used with `ink-900` text) |
| `sev-high` | `#DC2626` | `--color-sev-high` | High severity indicator dot and marker border |
| `sev-high-soft` | `#FEE2E2` | `--color-sev-high-soft` | High severity badge background (used with `ink-900` text) |
| `danger` | `#DC2626` | `--color-danger` | Action feedback: error states, hazard notifications, destructive triggers |
| `success` | `#15803D` | `--color-success` | Action feedback: confirmation states, successful operation |
| `hero-gradient` | `linear-gradient(135deg, #0B1220 0%, #16264A 50%, #2563EB 100%)` | `--gradient-hero` | Full-width detector header band (the only gradient allowed) |

## How to Change the Primary Color in One Place

To change the primary theme color across the entire application:
1. Open `frontend/src/styles/tokens.css`.
2. Update the four primary variables in `:root`:
   - `--color-primary-600`: The base interactive color (e.g. `#2563EB`). Ensure WCAG AA contrast against white ($\ge 4.5:1$).
   - `--color-primary-700`: The hover state color (e.g. `#1D4ED8`).
   - `--color-primary-50`: The light tint for card icon containers and dropzone backgrounds (e.g. `#EFF6FF`).
   - `--color-primary-100`: The tint for drag-over active state (e.g. `#DBEAFE`).
3. If changing the gradient end-point, also update `--gradient-hero` in `tokens.css`.
4. Because `tailwind.config.ts` references these CSS variables (`var(--color-primary-600)`, etc.), all components (buttons, links, active navigation underlines, dropzones, card icons, focus rings) will automatically update everywhere with zero component-level edits.

## Visible Placeholders

The following placeholders represent values that require operational verification or user-specific configuration before production release:

| Placeholder | Context | Intended Value |
| :--- | :--- | :--- |
| `{{SUPPORT_PHONE}}` | Contact / support sections | Support phone number |
| `{{MAP_API_TILES}}` | Map provider custom tile URL (optional fallback) | Custom tile URL if replacing OSM |
