# Smart Assistive Mechanism For Vehicular Network

Automated road pothole detection and geospatial quality monitoring system. Connects to vehicular cameras, mobile dashcams, or hardware IP video streams to perform real-time pothole identification, severity scoring, and GPS location mapping.

---

## Overview

Road hazards like potholes present safety and maintenance challenges for drivers and municipal infrastructure teams. This application provides real-time decision support by running a custom-trained YOLO object detection model on road footage, logging geographic coordinates, and presenting hazard distribution on an interactive GIS map.

### Key Features

- **Live Camera Detection**: Stream and analyze road video in real time from USB webcams, phone dashcams, or networked IP cameras.
- **Severity Scoring**: Categorizes road damage into semantic severity tiers (Low, Medium, High) based on detected surface area and model confidence.
- **Vehicle GPS Telemetry**: Captures spatial coordinates via the Geolocation API or hardware sensor inputs, automatically associating each hazard with exact coordinates.
- **Interactive GIS Map**: Inspect detected potholes on an OpenStreetMap interface with severity-coded markers, popups, and inventory controls.
- **WCAG AA Accessible**: Clean design system with high-contrast tokens, accessible focus indicators, and mobile-responsive layouts.

---

## Model Benchmarks

The detection engine uses a custom YOLO model trained specifically on road pavement distress imagery (`backend/models/best.pt`):

| Metric | Score (Epoch 150) |
| :--- | :--- |
| **Precision** | 79.9% |
| **Recall** | 69.8% |
| **mAP@50** | 76.8% |
| **mAP@50-95** | 50.2% |

> **Note**: This model serves as decision support and does not replace formal engineering road inspections.

---

## Tech Stack

- **Frontend**:
  - React 18 with TypeScript
  - Vite build tool
  - Tailwind CSS with centralized design tokens
  - React Router
  - react-leaflet & OpenStreetMap (no external API keys required)
  - Lucide React icons
- **Backend**:
  - Python 3.10+ & FastAPI
  - Ultralytics YOLO
  - SQLAlchemy & SQLite (PostgreSQL-ready)
  - Pydantic Settings
- **Configuration**:
  - Environment variables via `.env` files (`.env.example` templates provided)
  - Centralized site configuration (`frontend/src/config/site.config.ts`)

---

## Project Structure

```
POT_HOLE/
├── PROJECT_RULES.md          # Architectural constraints and specifications
├── CUSTOMIZING.md            # Configuration and theming guide
├── README.md                 # Project documentation
├── test-images/              # Verified test road imagery
├── backend/
│   ├── app/
│   │   ├── core/             # Settings, database, errors, middleware
│   │   ├── models/           # SQLAlchemy & Pydantic schemas
│   │   ├── routers/          # API endpoints (detect, potholes, health)
│   │   └── services/         # Model management & severity estimation
│   ├── models/
│   │   └── best.pt           # Custom-trained YOLO model checkpoint (6.2 MB)
│   ├── tests/                # Automated API test suite
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Backend environment template
└── frontend/
    ├── src/
    │   ├── components/       # Accessible UI components (Button, Badge, etc.)
    │   ├── config/           # Site metadata and typed page copy
    │   ├── pages/            # DetectorPage, MapPage, DevComponentsPage
    │   └── styles/           # Design tokens (tokens.css, index.css)
    ├── package.json          # Node dependencies
    ├── tailwind.config.ts    # Design token wiring
    └── .env.example          # Frontend environment template
```

---

## Getting Started

### Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher (with npm)

### 1. Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend API documentation is available at `http://localhost:8000/docs`.

### 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Verification & Testing

- **Backend tests**:
  ```bash
  cd backend
  pytest
  ```
- **Frontend build & typecheck**:
  ```bash
  cd frontend
  npm run build
  ```

---

## Customization

To modify product names, copy, colors, or model thresholds, refer to [`CUSTOMIZING.md`](./CUSTOMIZING.md) for the complete reference table.
