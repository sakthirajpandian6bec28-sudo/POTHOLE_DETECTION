# Working rules (never break these)
1. Never hide, mask or work around an error. No empty catch blocks, silent fallbacks, swallowed exceptions, skipped tests, or mock data shown as real results.
2. If anything fails (install, build, test, model load, lint, runtime), STOP. Show me the exact error output, explain the likely cause in plain language, give 2-3 fix options, and ask which I prefer. Do not continue until I answer.
3. Never say something works unless you ran it and saw it work. State exactly what you verified and how.
4. In the app, errors must be visible to users as clear messages (what happened, what to do next). Technical details go to server logs. Never show a blank screen or a fake success.
5. Do not invent features, numbers or claims. If information is missing, ask me.
6. If something is ambiguous and low-risk, pick the most reasonable option, state it in one line, and continue.
7. Finish each task by listing: files created or changed, what you verified, anything unresolved.

# Product
[PRODUCT NAME] detects potholes in road images and video with a custom-trained YOLO model, records the GPS location of each detection, and shows damaged roads on a map. Users: road authorities, fleet operators, everyday drivers. The app has two pages: Detector (home) and Map.

# Model (already trained, do not retrain or modify)
- File: backend/models/best.pt (Ultralytics YOLO). If missing or failing to load, apply rule 2.
- Read class names from the loaded model (model.names). Never hard-code them.
- Real results at final epoch 150: precision 79.9%, recall 69.8%, mAP50 76.8%, mAP50-95 50.2%. The Detector page must show a short note under the results saying the model can miss some potholes (recall about 70%) and is decision support, not a replacement for inspection.
- Test photos are in test-images/ at the project root. Use them for all verification.

# Tech stack (exact)
- Frontend: React 18, Vite, TypeScript, Tailwind CSS, React Router, react-leaflet with OpenStreetMap tiles (no API key), Lucide icons.
- Backend: Python FastAPI, Ultralytics, Pydantic Settings.
- Database: SQLite via SQLAlchemy, PostgreSQL-ready by changing only the URL.
- Configuration through .env files with .env.example for both apps.

# Customization architecture (hard requirement)
- frontend/src/config/site.config.ts: product name, tagline, logo text, contact email, nav links, footer text, map default center and zoom.
- frontend/src/config/content/*.ts: ALL page text per page and section, typed. No user-facing text hard-coded in components.
- tailwind.config.ts + src/styles/tokens.css: every color, font size, line height, spacing and radius defined once.
- backend/app/core/settings.py (from .env): model path, confidence and IoU thresholds, max upload size, allowed file types, severity thresholds, CORS origins, database URL.
- Reusable components with documented props; pages are composed from them.
- CUSTOMIZING.md with a table: "I want to change X -> edit file Y, key Z".

# Design system (strict)
- Font: Inter only (Google Fonts, font-display: swap, system-ui fallback).
- Type scale, desktop size/line-height in px: H1 48/56 semibold, H2 36/44 semibold, H3 24/32 semibold, H4 20/28 medium, body 16/24, small 14/20, caption 12/16. Mobile: H1 36/44, H2 28/36. Nothing readable below 14px.
- Colors: use exactly this palette, defined once as tokens in tailwind.config.ts and tokens.css. Never use any other hex value in components.
  primary-600 #2563EB, primary-700 #1D4ED8, primary-50 #EFF6FF, primary-100 #DBEAFE, accent-400 #22D3EE, accent-700 #0E7490, ink-900 #0B1220, ink-800 #16264A, text-body #334155, text-muted #5B6B82, bg-page #F5F8FF, bg-surface #FFFFFF, border-default #DDE5F2, sev-low #15803D (soft #DCFCE7), sev-medium #D97706 (soft #FEF3C7), sev-high #DC2626 (soft #FEE2E2), danger #DC2626, success #15803D.
  Rules: primary is only for interactive elements (buttons, links, focus rings, active nav). Severity colors are only for severity. accent-400 is only for decorative details on dark backgrounds (small labels, underlines, icons). On light backgrounds use accent-700 for any accent text or icon. Never put white text on accent-400, and never put white text on severity-low, medium or soft colors; badges use the soft background with dark text. Maintain WCAG AA contrast (4.5:1 for text).
  Also add one gradient token, hero-gradient: linear-gradient(135deg, #0B1220 0%, #16264A 50%, #2563EB 100%). It is the only gradient allowed. The earlier ban on purple-pink gradients, glassmorphism and decorative blobs still applies.
- 8px radius, 1px borders, light shadows, buttons at least 44px high with hover, focus-visible and disabled states.
- Forbidden: emojis, purple-pink gradients, glassmorphism, decorative blobs, robot or "AI brain" imagery, everything-centered layouts, lorem ipsum, remote placeholder images.
- Imagery: inline SVG or CSS-built mockups only.
- Motion: subtle, 150-250ms ease-out, respect prefers-reduced-motion.

# Copy rules
Specific, human, short sentences. Sentence-case headings. No buzzwords (revolutionary, cutting-edge, seamless, leverage, unlock). Consistent terms: "pothole", "detection", "severity". Only claims I supplied or that appear in the Model section. Any other needed number is a visible {{placeholder}} listed in CUSTOMIZING.md.
