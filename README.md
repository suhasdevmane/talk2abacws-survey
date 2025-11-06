<div align="center">

# Abacws — Spatial IoT API + 3D Visualiser

Rich spatial exploration & live telemetry for building / campus devices.

</div>

Abacws is a two‑part platform:

| Component | Purpose |
|-----------|---------|
| API (Node.js/Express) | Device registry, latest + historical data, querying, rules, external timeseries mappings (PostgreSQL / MySQL / MongoDB) |
| Visualiser (React + three.js) | Interactive 3D building viewer: add / move / pin devices, inspect data, align coordinate systems, debug spatial issues |

Runs locally with Docker Compose. Production: place behind a reverse proxy (Traefik / Nginx). Minimal environment configuration flips storage between MongoDB, PostgreSQL, and MySQL without client changes.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Key Features](#key-features)
4. [Repository Layout](#repository-layout)
5. [Configuring Datastores (MongoDB / PostgreSQL / MySQL)](#configuring-datastores)
6. [Visualiser Usage Guide](#visualiser-usage-guide)
7. [Coordinate Alignment & Migration](#coordinate-alignment--migration)
8. [External Time‑Series Mappings (Experimental)](#external-time-series-mappings-experimental)
9. [Device Adjustment & Highlighting Workflow](#device-adjustment--highlighting-workflow)
10. [Scripts & Utilities](#scripts--utilities)
11. [Environment Variables Reference](#environment-variables-reference)
12. [Troubleshooting](#troubleshooting)
13. [Development (Local & Docker)](#development)
14. [Deployment Notes](#deployment-notes)
15. [License](#license)

---

## Quick Start

```pwsh
# From repo root
docker compose down -v
docker compose up -d --build
```

Open:
- Visualiser: http://localhost:8090/
- API health: http://localhost:5000/health  → `{ "status":"ok" }`
- Swagger UI: http://localhost:5000/api/

Switch to PostgreSQL (hot re‑provision):
```pwsh
docker compose down
setx DB_ENGINE postgres   # or edit docker-compose.yml env for api
docker compose up -d --build
```
> On Linux/macOS just export DB_ENGINE=postgres before `docker compose up`.

---

## Architecture Overview

```
┌──────────┐   REST / JSON   ┌──────────────────────┐
│ Visualiser│ ─────────────▶ │ API (Express)        │
│ (React +  │ ◀───────────── │ /api/... endpoints   │
│ three.js) │  WebSocket/SSE │ (Devices, Query,     │
└─────┬────┘   (future)      │  History, Latest,    │
  │                      │  Mappings, Rules)    │
  │                      └─────────┬────────────┘
  │                                 │
  │                                 │ Storage abstraction
  │                                 ▼
  │                     ┌─────────────────────┐
  │                     │ MongoDB OR PostgreSQL│
  │                     └─────────────────────┘
  │
  │ (Static GLB layers)
  ▼
 Building Model (GLB assets)
```

Datastore engines share a common interface so front‑end code never changes when switching.

---

## Key Features

### Spatial & Editing
* Replaceable building model (multi‑layer GLB manifest)
* Double‑click add device (name, type, floor)
* Live device movement with axis constraints & auto lock/unlock
* Lock / Pin management via sprite, HUD, or keyboard (P)
* Device highlight: selecting from list auto focuses camera, pulses emissive color, shows HUD

### Data & Telemetry
* Latest device data retrieval (storage agnostic)
* Historical queries / range filtering
* External time‑series mappings (Postgres table → virtual device feed) – experimental

### Coordinate System & Alignment
* Legacy offset support (force or heuristic)
* Auto center alignment (device cloud ↔ model floor)
* Scale factor suggestion (non‑destructive)
* Bounding box visual debug overlay
* Migration script to bake translation and optional scale

### UX & Debug Aids
* Orientation helpers (axes/grid toggles via X / G)
* Adjustable devices side panel with search-ready structure
* Floating settings panel (⚙) for alignment & debug toggles
* FPS / stats overlay (top-right, non‑blocking)

### API / Backend
* Pluggable datastore (MongoDB or PostgreSQL) via one env var
* Structured query endpoints & batch latest
* Rules and (optional) future SSE streaming foundation
* Admin DB disable/enable endpoints

### Tooling & Scripts
* Coordinate migration (scale + translation)
* Device bulk export/import (see routers/devicesBulk)
* Telemetry demo script (`demo.py`) for rapid live testing

---

## Repository Layout

```
.
├─ docker-compose.yml            # Compose file for mongo, api, visualiser
├─ LICENSE                       # MIT License
├─ README.md                     # This doc
├─ api/                          # Express API
│  ├─ Dockerfile
│  ├─ openapi.yaml               # Swagger spec served by the API
│  ├─ package.json
│  └─ src/
│     ├─ app.js                  # Express app entry
│     ├─ generate.js             # Seed/generate helpers
│     └─ api/
│        ├─ routers/             # Devices & data routes
│        ├─ middleware/
│        ├─ data/
│        │  └─ devices.json      # Mirrored device data (for convenience)
│        └─ ...
└─ visualiser/                   # React + three.js app
   ├─ Dockerfile
   ├─ package.json
   ├─ public/
   │  ├─ index.html
   │  └─ assets/
   │     ├─ manifest.json        # Which GLB layers to load
   │     └─ *.glb                # Your building layers
   └─ src/
      ├─ three/Graphics.js       # Scene, devices, HUD, interactions
      ├─ components/
      ├─ hooks/
      └─ views/
```

---

## Configuring Datastores

You can switch storage with a single environment variable: `DB_ENGINE`.

| Value | Engine | Notes |
|-------|--------|-------|
| `mongo` (default) | MongoDB | Device history collections per device |
| `postgres` | PostgreSQL  | Unified tables (`devices`, `device_data`, + advanced mappings & rules) |
| `mysql` | MySQL 8+ | Parity with Postgres feature set (JSON columns, mappings, rules) |
| `disabled` | In‑memory   | Read‑only (returns 503 for mutating data endpoints) |

Minimal change to use PostgreSQL or MySQL (both included in compose):
1. Set env: `DB_ENGINE=postgres` or `DB_ENGINE=mysql` (compose file or shell export).
2. Rebuild: `docker compose up -d --build`.
3. API auto creates tables if absent.

No front‑end changes required. JSON shapes are consistent across engines.

To revert: change to `mongo` and rebuild.

### When to choose which engine

| Scenario | Recommended Engine | Reason |
|----------|--------------------|--------|
| Quick local prototyping | `mongo` | Zero config, per‑device collections simple to inspect |
| Time‑series mappings + rules @ scale | `postgres` | Mature window functions & indexing strategy already tuned |
| MySQL ecosystem / existing infra | `mysql` | Full parity with Postgres features using JSON + window functions |

Performance characteristics:
* Postgres & MySQL use a single `device_data` table with composite index for fast latest + bounded history queries.
* Mongo uses one capped-like pattern per device (separate collection) — simple horizontal separation.
* External mappings and rules are available for both Postgres and MySQL; Mongo mode skips those tables.
* MySQL service port is not exposed by default in compose to avoid host port conflicts (e.g. an existing local MySQL on 3306). Uncomment and map to an alternate host port if you need direct CLI access (e.g. `3307:3306`).

---

## Visualiser Usage Guide

- Add a device: double-click on the floor to create a device at that spot; you’ll be prompted for name, type, and floor.
- Select a device: click its icon. A floating HUD shows the name and actions.
- Move a device: use the HUD buttons (↕ Move or ↔ Move) to constrain axes; the app will auto-unlock and re-lock if needed. Live position updates are PATCHed during move and a final save happens on release.
- Pin/unpin: click the lock sprite above the icon, use the HUD “Lock/Unlock” button, right-click the lock, or press P while hovering/selected.
- Deselect: click empty space, click the ✕ in the HUD, or press Escape.
- Camera: mouse wheel to zoom; right mouse button to orbit.

Occlusion & scaling: device icon & lock are sprites that scale with distance and occlude naturally behind geometry.

### Device Adjustment & Highlighting Workflow
* Open Adjust Devices panel (bottom-left handle) – lists all devices.
* Click a device in the list → scene auto focuses, mesh pulses, HUD appears.
* Edit X / Y / Z fields – live updates mesh before saving.
* Save or Cancel changes (cancel reverts to original position this session).
* Panel state can be toggled without losing drafts until save.

### Coordinate Alignment & Debug Tools

Goal: Bring legacy device coordinate clouds into the same origin & scale as the building model without permanently corrupting raw data until you choose to migrate.

Flags / Runtime Controls:
```
VITE_FORCE_LEGACY_OFFSET=true      # Always apply legacy translation (160,0,-120)
VITE_COORDS_NORMALIZED=true        # Mark device coords already normalized; disables heuristic legacy check
VITE_AUTO_ALIGN_DEVICES=true       # Compute & apply center alignment delta (cached in localStorage)
```
Or set at runtime before the app loads (DevTools early):
```
window.__ABACWS_FORCE_LEGACY_OFFSET__ = true;
window.__ABACWS_COORDS_NORMALIZED__ = true;
window.__ABACWS_AUTO_ALIGN__ = true;
```

Settings Panel (⚙ top‑right) lets you:
 - Toggle Auto Align (reload applies)
 - View Suggested Uniform Scale (ratio of model planar span to device cloud span)
 - Show Bounding Boxes (teal = devices, orange = model floor) for visual inspection

Scale Suggestion: Only calculated; NOT auto-applied. Use migration script if you want to bake scale + translation.

Migration Script (with scale + translation):
```
ALIGN_DELTA="dx,dy,dz" SCALE_FACTOR=1.234 \
  node visualiser/scripts/migrateDeviceCoords.js devices.json > devices-aligned.json
```

If you previously relied on auto alignment, grab cached delta from:
```
localStorage.getItem('__abacws_device_alignment_v1')
```
Then apply with SCALE_FACTOR (if desired) and import updated JSON into backend storage.

Bounding Boxes: Helpers can be toggled on/off; they do not persist and are ignored in interaction picking.

Debug Logging:
```
localStorage.setItem('__abacws_debug','1'); location.reload();
```
You will see `[ALIGN]` and scale suggestion events in console.

---

## Swapping / Managing the Building Model (GLB)

- Put your GLB files in `visualiser/public/assets/`.
- Edit `visualiser/public/assets/manifest.json` to list layer filenames in load order, for example:

```
{
  "layers": [
    "floors.glb",
    "exterior-walls.glb",
    "windows.glb",
    "stairs.glb",
    "glass.glb"
  ]
}
```

Tip: If your repo uses Git LFS for assets and you see tiny text files instead of real models, run:

```
git lfs install
git lfs pull
```

---

## API Overview

- Base URL (local): http://localhost:5000/api
- Swagger UI: http://localhost:5000/api/

Key endpoints (see full `api/openapi.yaml`):
- GET /devices — list all devices
- POST /devices — create a device
- GET /devices/{deviceName} — get one device
- PATCH /devices/{deviceName} — update type, floor, position, pinned
- GET /devices/{deviceName}/data — latest data for a device
- PUT /devices/{deviceName}/data — add data (optionally with units)
- GET /devices/{deviceName}/history — historical data
- DELETE /devices/{deviceName}/history — clear historical data
- GET /query — filter devices
- GET /query/data — filter devices and last data
- GET /query/history — filter devices and their history

Persistence engines:
* MongoDB (container `abacws-mongo`). Historical data per device is stored in per-device collections.
* PostgreSQL (container `abacws-postgres`). Tables:
  * `devices(name PRIMARY KEY, type, floor, pos_x, pos_y, pos_z, pinned, created_at, updated_at)`
  * `device_data(id bigserial PK, device_name FK→devices, timestamp bigint, payload jsonb)`
  * `data_sources`, `device_timeseries_mappings`, `device_rules` (advanced features)
* MySQL (container `abacws-mysql`). Schema mirrors Postgres using appropriate MySQL types (DOUBLE, JSON, ENUM). Uses window functions (MySQL 8+) for batch latest mapping aggregation.
* Disabled: `DB_ENGINE=disabled` serves devices from `devices.json` and keeps transient in‑memory history only (no persistence, write endpoints 503).

Runtime switching:
```
DB_ENGINE=postgres docker compose up -d --build
DB_ENGINE=mysql docker compose up -d --build
```
Or edit the `api` service environment in `docker-compose.yml`.

Data parity:
* All three engines expose identical JSON shapes to clients.
* `devices.json` remains a convenience mirror and is updated on creates/updates in any persistent mode.

Migration examples:
* Mongo → Postgres/MySQL: iterate each device collection and bulk insert into target `device_data` table (script not yet included).
* Postgres ↔ MySQL: dump / restore (schema is analogous; adjust auto‑increment & enum differences). JSON payloads portable.

Notes:
* Unique device name enforcement: Mongo index vs Postgres/MySQL primary key.
* Latest data lookup: Mongo sort/findOne vs Postgres/MySQL ORDER BY + LIMIT 1.
* History limits: capped at 10k per request (configurable).
* Disabled mode returns HTTP 503 for mutating endpoints while still allowing GET /devices.
* MySQL requires version 8+ (window functions used for mapping aggregation); earlier versions unsupported.

### External Time‑Series Mappings (Experimental)

You can map existing tables in the same Postgres cluster (e.g. a large time‑series fact table) to Abacws devices without ingesting or duplicating data.

Concepts:
- Data Source: connection + schema metadata (currently reuses main DB connection; future: separate host/credentials).
- Device Mapping: links a device name to a (table, device_id_column, device_identifier_value, timestamp_column, value_columns[]). Optionally pick a primary_value_column for sphere color scaling.

Endpoints (all under `/api` and documented in `openapi.yaml`):
- `GET /datasources` / `POST /datasources` / `PATCH /datasources/{id}` / `DELETE /datasources/{id}`
- `GET /datasources/{id}/tables` — list tables in schema
- `GET /datasources/{id}/columns?table=...` — list columns
- `GET /mappings` / `POST /mappings` / `PATCH /mappings/{id}` / `DELETE /mappings/{id}`
- `GET /mappings/device/{deviceName}/timeseries?from=..&to=..&limit=..`
- `GET /latest` — batch latest primary + value columns for all mapped devices (drives sphere coloration)

Example mapping payload (POST /mappings):
```json
{
  "device_name": "sensor_west_01",
  "data_source_id": 1,
  "table_name": "env_readings",
  "device_id_column": "sensor_id",
  "device_identifier_value": "west-01",
  "timestamp_column": "recorded_at",
  "value_columns": ["temperature_c", "humidity_pct"],
  "primary_value_column": "temperature_c"
}
```

UI Usage:
- Select a device → Data panel → External Time‑Series → Create/Edit Mapping.
- API key (x-api-key) for writes is read from `localStorage.abacws_api_key` (set manually via DevTools or future settings UI).
- After saving, page reload ensures hooks refetch; future enhancement: event-driven refresh.

Color Scaling:
- The `primary_value_column` is normalized across current latest values → gradient Blue (low) → Emerald (mid) → Red (high).
- Hover/Selection colors override the gradient temporarily.

Performance Notes:
- `/latest` groups mappings by (table, cols signature) to reduce queries.
- Per-device timeseries queries use indexed timestamp + device id predicates; ensure your source table has an index: `(sensor_id, recorded_at DESC)`.

Security & Credentials:
- Data source password is write-only (never returned).
- Avoid embedding production credentials in compose files; use environment variables / secrets.
- Future: separate pool per data source; currently assumes same DB for simplicity.

Limitations / Roadmap:
-- Only Postgres/MySQL engines implement external mappings & rules (Mongo omitted by design).
- No aggregation (avg, min/max) or resampling—client fetches raw rows up to a limit (default 2000).
- No transformation expressions; consider adding computed columns or views server-side.
- Manual reload after save; planned improvement: in-memory cache invalidation and hook refresh.

---

### Health endpoints

Top-level (implemented in `app.js`):
- `GET /health` → `{ status: 'ok', db: { engine, status, error? } }`
- `GET /health/db` → direct DB/engine status only

Legacy (router-level):
- `GET /api/health` → basic process status (points you to the top-level endpoint for DB detail)

### Admin DB toggle endpoints

Guarded by `x-api-key` header (value from `API_KEY` env, default placeholder):
- `POST /api/admin/db/disable` → Force a 503 on state-changing datastore operations (simulated offline)
- `POST /api/admin/db/enable` → Re-enable datastore operations
- `GET /api/admin/db/status` → `{ engine, forcedDisabled }`

UI: The visualiser shows a small status panel (top-left) with API status, DB engine, DB status, and a toggle button (needs API key to modify).

---

## Scripts & Utilities

| Script | Location | Purpose |
|--------|----------|---------|
| `migrateDeviceCoords.js` | `visualiser/scripts/` | Bake alignment (translation + optional scale) into device JSON |
| `check-assets.js` | `visualiser/scripts/` | Validate presence / size of GLB assets (avoid LFS pointer issues) |
| `demo.py` | project root | Continuously sends dummy telemetry to a device (default `node_5.20`) |

### demo.py Quick Use
```
pip install requests
python demo.py             # Sends every 5s
INTERVAL_SEC=2 python demo.py
```
Inspect latest device data via: `GET /api/devices/node_5.20/data`.

## Environment Variables Reference

### API / Backend
| Variable | Purpose | Default |
|----------|---------|---------|
| `DB_ENGINE` | `mongo` / `postgres` / `disabled` | `mongo` |
| `API_KEY` | Protect admin & (optionally) write ops | none |
| `PORT` | API listen port | 5000 |

### Visualiser (Vite build or runtime window overrides)
| Variable | Purpose |
|----------|---------|
| `VITE_FORCE_LEGACY_OFFSET` | Force legacy translation (160,0,-120) |
| `VITE_COORDS_NORMALIZED` | Assert coordinates already normalized |
| `VITE_AUTO_ALIGN_DEVICES` | Enable center alignment pass |
| `VITE_SHOW_FPS` (future) | Force show stats overlay |

Runtime (before bundle loads) equivalents: `window.__ABACWS_FORCE_LEGACY_OFFSET__`, `__ABACWS_COORDS_NORMALIZED__`, `__ABACWS_AUTO_ALIGN__`.

### External Mapping (future expansion)
| Variable | Purpose |
|----------|---------|
| `X_API_KEY` | Provided via `x-api-key` header for write operations | 

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Blank visualiser | Missing /assets GLBs or 404 to API | Check Network tab; pull LFS assets (`git lfs pull`) |
| GLB files ~130 bytes | Git LFS pointer files | Run `git lfs install && git lfs pull` |
| Devices misaligned | Legacy offset or origin mismatch | Use Settings (⚙) → Auto Align + bounding boxes; migrate when stable |
| No latest data updates | Polling disabled or datastore offline | Check API `/health`; ensure not `DB_ENGINE=disabled` |
| 503 errors on writes | Forced disabled via admin | POST `/api/admin/db/enable` with API key |
| Device create 409 | Duplicate name | Choose unique name or delete existing device |
| Postgres slow latest queries | Missing index | Ensure `(device_name, timestamp DESC)` index exists (auto created) |
| Mapping not returning data | Wrong identifier value / column case | Verify table + column names with `/datasources/{id}/columns` |

Enable debug logs in visualiser console:
```
localStorage.setItem('__abacws_debug','1'); location.reload();
```
Look for `[ALIGN]`, selection, and mapping batching logs.

## Development

Without Docker (optional):
- API: `cd api && npm install && npm run dev` (listens on 5000)
- Visualiser: `cd visualiser && npm install && npm start` (dev server with proxy to :5000)

With Docker:
- Compose handles builds and runs. Edit code and rebuild with `docker compose up -d --build`.

---

## Deployment Notes

- Reverse proxy (Traefik labels included in docker-compose.yml by default). Nginx/Apache are fine too.
- Visualiser container serves the production build (NGINX) on port 80; compose maps it to 8090 locally.
- Health checks:
  - API: GET /health → { status: "ok" }
  - Visualiser: GET /health (NGINX static 200)

---
  ## Start From Scratch: Build and Run Everything

  Use these commands to cleanly rebuild all images from source, run the stack, verify locally, and optionally expose via ngrok. Commands assume you run them from the repo root on Linux/macOS shell (sh/bash): `/home/suhas/Survey`.

  Notes:
  - Replace placeholders like <YOUR_JWT_SECRET> and <YOUR_NGROK_AUTHTOKEN>.
  - Always visit the visualiser via a trailing slash: `/visualiser/` so its relative assets resolve correctly.

  ### 0) Optional: Clean previous containers

  ```sh
  # Stop containers if present (ignore errors)
  docker stop rasa-frontend-bldg1 abacws-visualiser abacws-api abacws-survey-mongo abacws-survey-ngrok 2>/dev/null || true

  # Remove containers (ignore errors)
  docker rm rasa-frontend-bldg1 abacws-visualiser abacws-api abacws-survey-mongo abacws-survey-ngrok 2>/dev/null || true
  ```

  ### 1) Create Docker network and Mongo volume

  ```sh
  # Create app network if it does not exist
  docker network inspect survey-network >/dev/null 2>&1 || docker network create survey-network

  # Create Mongo volume if it does not exist
  docker volume ls | grep -q "mongo-data" || docker volume create mongo-data
  ```

  ### 2) Start MongoDB

  ```sh
  docker run -d --name abacws-survey-mongo \
    --network survey-network \
    -p 27017:27017 \
    -v mongo-data:/data/db \
    mongo:4.4
  ```

  Verify:
  ```sh
  docker ps | grep abacws-survey-mongo
  ```

  ### 3) Build images (API, Visualiser, Frontend)

  ```sh
  # Build API
  docker build -t abacws-api-img ./api

  # Build Visualiser
  docker build -t abacws-visualiser-img ./visualiser

  # Build Frontend
  docker build -t rasa-frontend-img ./rasa-frontend
  ```

  To force clean builds, add `--no-cache` to each build command above.

  ### 4) Run the API

  ```sh
  docker run -d --name abacws-api \
    --network survey-network \
    -p 5000:5000 \
    -e MONGODB_URI="mongodb://abacws-survey-mongo:27017/abacws-survey" \
    -e JWT_SECRET="<YOUR_JWT_SECRET>" \
    abacws-api-img
  ```

  Verify:
  ```sh
  curl -s http://localhost:5000/api/health
  ```

  ### 5) Run the Visualiser

  ```sh
  docker run -d --name abacws-visualiser \
    --network survey-network \
    -p 8090:80 \
    -e WEB_PORT=80 \
    -e API_HOST=http://abacws-api:5000 \
    abacws-visualiser-img
  ```

  Verify:
  ```sh
  # HTML shell
  curl -I http://localhost:8090/
  # Assets
  curl -I http://localhost:8090/static/js/main.931f4780.js
  curl -I http://localhost:8090/assets/manifest.json
  ```

  ### 6) Run the Frontend (proxies /api and /visualiser)

  ```sh
  docker run -d --name rasa-frontend-bldg1 \
    --network survey-network \
    -p 3000:3000 \
    -e PORT=3000 \
    rasa-frontend-img
  ```

  Verify:
  ```sh
  # Survey page
  curl -I http://localhost:3000/survey
  # Visualiser through the frontend proxy (note trailing slash)
  curl -I http://localhost:3000/visualiser/
  # Visualiser assets via proxy
  curl -I http://localhost:3000/visualiser/static/js/main.931f4780.js
  ```

  Open in browser:
  - http://localhost:3000 (Login/Register, then go to Survey)
  - http://localhost:3000/visualiser/ (standalone visualiser)

  ### 7) (Optional) Expose via ngrok

  If you have a reserved ngrok domain:

  ```sh
  docker run -d --name abacws-survey-ngrok \
    --network survey-network \
    -p 4046:4040 \
    -e NGROK_AUTHTOKEN=<YOUR_NGROK_AUTHTOKEN> \
    ngrok/ngrok:latest http rasa-frontend-bldg1:3000 --domain=<YOUR_RESERVED_DOMAIN>.ngrok-free.dev
  ```

  Check the tunnel:
  ```sh
  curl -I https://<YOUR_RESERVED_DOMAIN>.ngrok-free.dev/visualiser/
  ```

  Without a reserved domain (auto-generated URL):
  ```sh
  docker run -d --name abacws-survey-ngrok \
    --network survey-network \
    -p 4046:4040 \
    -e NGROK_AUTHTOKEN=<YOUR_NGROK_AUTHTOKEN> \
    ngrok/ngrok:latest http rasa-frontend-bldg1:3000
  # Open the ngrok inspector in your browser:
  # http://localhost:4046
  ```

  ### 8) Troubleshooting quick checks

  - Visualiser loads but is blank:
    - Ensure you visit `/visualiser/` (with trailing slash) so relative assets resolve.
    - Hard refresh the browser (Ctrl+Shift+R / Cmd+Shift+R).
    - Check that CSS class `.model-container` is present in the visualiser build.
  - Assets failing:
    - Check `/visualiser/static/js/main.*.js` and `/visualiser/assets/manifest.json` return 200 via curl.
  - API data not present:
    - Check `http://localhost:5000/api/health` returns `{ "status": "ok" }`.
  - iframe blocked:
    - Everything is served same-origin via the frontend proxy; keep using `/visualiser/`.

  ### 9) Stop & clean up

  ```sh
  # Stop
  docker stop rasa-frontend-bldg1 abacws-visualiser abacws-api abacws-survey-ngrok abacws-survey-mongo

  # Remove
  docker rm rasa-frontend-bldg1 abacws-visualiser abacws-api abacws-survey-ngrok abacws-survey-mongo

  # Optional: remove images
  # docker rmi rasa-frontend-img abacws-visualiser-img abacws-api-img

  # Optional: keep or remove Mongo data volume
  # docker volume rm mongo-data
  ```

  ---

  ## Helper Script: REBUILD_FROM_SCRATCH.sh

  If you prefer a single command, copy this into a file named `REBUILD_FROM_SCRATCH.sh` and run with `sh REBUILD_FROM_SCRATCH.sh`.

  ```sh
  #!/bin/sh
  # ============================================================================
  # COMPLETE REBUILD FROM SCRATCH (Local + Optional ngrok)
  # Run these commands one by one, or execute this script as-is.
  # ============================================================================

  set -e

  # 0) Ensure network and volume
  echo "[0/10] Ensuring network and volume exist"
  docker network inspect survey-network >/dev/null 2>&1 || docker network create survey-network
  (docker volume ls | grep -q "mongo-data") || docker volume create mongo-data

  # 1) Stop containers (ignore failures)
  echo "[1/10] Stopping containers (if any)"
  docker stop rasa-frontend-bldg1 abacws-visualiser abacws-api abacws-survey-mongo abacws-survey-ngrok 2>/dev/null || true

  # 2) Remove containers (ignore failures)
  echo "[2/10] Removing containers"
  docker rm rasa-frontend-bldg1 abacws-visualiser abacws-api abacws-survey-mongo abacws-survey-ngrok 2>/dev/null || true

  # 3) Start MongoDB (persistent volume)
  echo "[3/10] Starting MongoDB"
  docker run -d --name abacws-survey-mongo \
    --network survey-network \
    -p 27017:27017 \
    -v mongo-data:/data/db \
    mongo:4.4

  # 4) Build API (no cache)
  echo "[4/10] Building API image (no cache)"
  docker build --no-cache -t abacws-api-img ./api

  # 5) Build Visualiser (no cache)
  echo "[5/10] Building Visualiser image (no cache)"
  docker build --no-cache -t abacws-visualiser-img ./visualiser

  # 6) Build Frontend (no cache)
  echo "[6/10] Building Frontend image (no cache)"
  docker build --no-cache -t rasa-frontend-img ./rasa-frontend

  # 7) Start API
  echo "[7/10] Starting API"
  docker run -d --name abacws-api \
    --network survey-network \
    -p 5000:5000 \
    -e MONGODB_URI="mongodb://abacws-survey-mongo:27017/abacws-survey" \
    -e JWT_SECRET="your-secret-key-here" \
    abacws-api-img

  # 8) Start Visualiser
  echo "[8/10] Starting Visualiser"
  docker run -d --name abacws-visualiser \
    --network survey-network \
    -p 8090:80 \
    -e WEB_PORT=80 \
    -e API_HOST=http://abacws-api:5000 \
    abacws-visualiser-img

  # 9) Start Frontend
  echo "[9/10] Starting Frontend"
  docker run -d --name rasa-frontend-bldg1 \
    --network survey-network \
    -p 3000:3000 \
    -e PORT=3000 \
    rasa-frontend-img

  # 10) Verify endpoints
  echo "[10/10] Verifying endpoints"
  (echo -n "/api/health => "; curl -sI http://localhost:5000/api/health | head -n1) || true
  (echo -n "/visualiser/ (via frontend) => "; curl -sI http://localhost:3000/visualiser/ | head -n1) || true
  (echo -n "visualiser JS via proxy => "; curl -sI http://localhost:3000/visualiser/static/js/main.931f4780.js | head -n1) || true

  cat << 'MSG'

  ✅ Deployment complete (local)
  - Frontend:   http://localhost:3000
  - Visualiser: http://localhost:3000/visualiser/
  - API health: http://localhost:5000/api/health

  Optional: start ngrok (replace placeholders):
    docker run -d --name abacws-survey-ngrok \
      --network survey-network \
      -p 4046:4040 \
      -e NGROK_AUTHTOKEN=YOUR_TOKEN \
      ngrok/ngrok:latest http rasa-frontend-bldg1:3000 --domain=YOUR_DOMAIN.ngrok-free.dev

  MSG
  ```

  ---
## Running with Docker commands (without docker-compose)

**Prerequisites**: Run these commands from the project root: `C:\Users\suhas\Documents\GitHub\User Survey Abacws`

```pwsh
# 1. Create network (required for inter-container communication)
docker network create survey-network

# 2. Create named volume for MongoDB (persistent storage)
docker volume create mongo-data

# 3. Start MongoDB with named volume
docker run -d --name abacws-mongo --network survey-network -p 27017:27017 -v mongo-data:/data/db --restart always mongo

# 4. Build and run API (depends on mongo)
docker build -t abacws-api-img ./api
docker run -d --name abacws-api --network survey-network --hostname apihost -p 5000:5000 -e API_PORT=5000 -e MONGO_URL=mongodb://abacws-mongo:27017 -e JWT_SECRET=change-this-jwt-secret-in-production-use-strong-random-string -e SESSION_SECRET=change-this-secret-in-production -e API_KEY=V3rySecur3Pas3word -v "${PWD}/api/src/api/data:/api/src/api/data" --restart always abacws-api-img

# 5. Build and run Visualiser (depends on api)
docker build -t abacws-visualiser-img ./visualiser
docker run -d --name abacws-visualiser --network survey-network --hostname visualiserhost -p 8090:80 -e WEB_PORT=80 -e API_HOST=abacws-api:5000 --restart always abacws-visualiser-img

# 6. Build and run Rasa Frontend (depends on api)
docker build -t rasa-frontend-img ./rasa-frontend
docker run -d --name rasa-frontend-bldg1 --network survey-network --hostname rasa-frontend-host-bldg1 -p 3000:3000 -e NODE_ENV=development -e REACT_APP_API_URL=http://localhost:5000/api -e REACT_APP_VISUALIZER_URL=http://localhost:8090 -v "${PWD}/rasa-frontend:/app" -v /app/node_modules --restart unless-stopped rasa-frontend-img npm start

# 7. Build and run Sender/Telemetry service (depends on api and visualiser)
docker build -t abacws-sender-img -f telemetry/Dockerfile .
docker run -d --name abacws-sender --network survey-network -p 8088:8088 -e API_BASE=http://abacws-api:5000/api -e INTERVAL_SECONDS=10 -e API_HEALTH=http://abacws-api:5000/health -e VIS_HEALTH=http://abacws-visualiser:80/health --restart always abacws-sender-img

# 8. Expose Frontend via ngrok (connects to container on survey-network)
# Uses reserved domain (requires paid plan), US region, connects directly to frontend container

docker run -d -it --name abacws-survey-ngrok --network survey-network -e NGROK_AUTHTOKEN=351mX4l1QmwIH9QNq3TatjyErTf_3os4QyqSDSX614JkForyL -e NGROK_REGION=Global -p 4046:4040 ngrok/ngrok:latest http rasa-frontend-bldg1:3000 --domain=wimpishly-premonarchical-keyla.ngrok-free.dev


# View ngrok logs and get public URL
docker logs -f abacws-ngrok



# Public URLs:
# - Reserved domain: https://wimpishly-premonarchical-keyla.ngrok-free.dev
# - TinyURL redirect: https://tinyurl.com/talk2abacws-survey
```

**To restore MongoDB from local mongo/ folder** (if you have existing data):
```pwsh
# Stop mongo container
docker stop abacws-mongo

# Copy local mongo/ files into the named volume
docker run --rm -v mongo-data:/data/db -v "${PWD}/mongo:/backup" mongo cp -r /backup/. /data/db/

# Start mongo again
docker start abacws-mongo
```

**Verify all services are running**:
```pwsh
docker ps --filter "name=abacws-"
```

**View logs**:
```pwsh
docker logs -f abacws-api         # API logs
docker logs -f abacws-mongo       # MongoDB logs
docker logs -f abacws-visualiser  # Visualiser logs
docker logs -f rasa-frontend-bldg1  # Frontend logs
docker logs -f abacws-sender      # Sender logs
```

**Stop and remove all containers**:
```pwsh
docker stop abacws-mongo abacws-api abacws-visualiser rasa-frontend-bldg1 abacws-sender abacws-ngrok
docker rm abacws-mongo abacws-api abacws-visualiser rasa-frontend-bldg1 abacws-sender abacws-ngrok
```

**Remove network and volume** (WARNING: deletes all MongoDB data):
```pwsh
docker network rm survey-network
docker volume rm mongo-data
```

### Survey data export via curl (users, questions, chat)

You can retrieve survey users and inputs through the Survey router. Admin endpoints are currently open (no auth), while per-user endpoints require a login cookie.

- All survey questions grouped by user (admin, no auth):

```sh
curl -s http://localhost:5000/api/survey/admin/questions | jq '.'
# via API ngrok (if enabled):
curl -s https://swayable-katia-nondevelopmentally.ngrok-free.dev/api/survey/admin/questions | jq '.'
```

- Survey stats (totals and top contributors) (admin, no auth):

```sh
curl -s http://localhost:5000/api/survey/admin/stats | jq '.'
# via API ngrok:
curl -s https://swayable-katia-nondevelopmentally.ngrok-free.dev/api/survey/admin/stats | jq '.'
```

- Per-user flows (login, then fetch that user’s data):

```sh
# 1) Login and capture auth cookie
curl -s -c cookies.txt -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"test123456"}' \
  http://localhost:5000/api/survey/login | jq '.'

# 2) Get this user’s submitted questions (requires cookie)
curl -s -b cookies.txt http://localhost:5000/api/survey/questions | jq '.'

# 3) Get this user’s chat history (requires cookie)
curl -s -b cookies.txt http://localhost:5000/api/survey/get_history | jq '.'
```

Notes about “all Mongo users”:
- A direct "list all registered users" endpoint isn’t exposed yet. Today, you can approximate the active user list from `/api/survey/admin/questions` keys (users who submitted questions).
- If you need a complete list of registered users (including those with no questions), either:
  - Query Mongo directly (e.g. `mongosh` against DB `survey_db`, collection `users`), or
  - Add a small endpoint (e.g. `GET /api/survey/admin/users`) that returns `users` collection (we can implement this on request).


## Contributing

PRs and issues welcome. Please run builds locally and sanity-check Docker compose before submitting.

---

## License

This project is licensed under the MIT License. See `LICENSE` for details.

Copyright (c) 2022–2025, the Abacws authors. All rights reserved.
