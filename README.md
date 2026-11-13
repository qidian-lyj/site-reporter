# Site Reporter — Reporting App for Large Outdoor Sites

An **offline-first React PWA** for recording and reporting field observations on large
outdoor sites — countryside, city, airport, campus, parks, road/rail/utility networks
or large industrial sites. Use it to record wildlife sightings, fly-tipping, faults &
fault resolution, maintenance tasks, geological features, archaeology finds or even
recorded delivery.

- **Front end:** React 18 + Vite (PWA: manifest + service worker), Dexie (IndexedDB),
  Leaflet (map), HTML5 device APIs (Geolocation, Camera, Compass, Accelerometer,
  Contacts, Connection/Network Information)
- **Back end:** Node.js + Express with a plain JSON file store (the "simple dumb
  storage" demo)

---

## Feature checklist (mapped to the brief)

| Brief requirement | Where it lives |
| --- | --- |
| Geolocation API (GPS for large outdoor site) | `app/src/services/geolocation.js` — "Capture GPS position" on the report form |
| Datetime stamp | `createdAt` / `updatedAt` set on create & edit (`app/src/components/ReportForm.jsx`) |
| Camera API — photo + photo album | `app/src/services/camera.js` — live rear-camera capture + album picker, resized for storage capacity |
| Text input from user | Title & description fields on the report form |
| Category menu (species, fault type, maintenance status…) | `app/src/services/categories.js` — wildlife / fault / fly-tipping / maintenance / geological / archaeology / delivery |
| Report categories to different recipients (Contacts API) | `app/src/services/contacts.js` — Contact Picker + per-category recipient hints (manual fallback on desktop) |
| Compass API — camera orientation as well as location | `app/src/services/sensors.js` + `useSensors` hook — device heading captured with the GPS position |
| Accelerometer API — pointing vertically up / down | `app/src/services/sensors.js` — tilt angle + `up` / `down` / `side` classification |
| In-app CRUD (C & R essential) | Dexie (IndexedDB) live queries: `app/src/services/db.js` + list / detail / form views |
| Upload to server — simple dumb storage/retrieval, JSON | `app/src/services/sync.js` (`uploadAll` / `downloadAll`) + `server/store.js` (JSON file) |
| Synchronise with server (upload/download + CRUD) | `app/src/services/sync.js` — `syncNow()`: push local changes, pull server changes, last-write-wins merge |
| Connection API — turn on/off internet connection | `app/src/hooks/useConnection.js` — online/offline badge in the header gates every sync action |
| Extra: map of all reports | `app/src/components/MapView.jsx` — Leaflet + OpenStreetMap tiles |
| Extra: device storage quota display | `app/src/hooks/useStorageEstimate.js` — `navigator.storage.estimate()` shown in the Sync tab |

## Project structure

```
Reporting App for large outdoor site/
├── package.json                 Root scripts (npm start / run server / run app / run build)
├── server/
│   ├── server.js                Express: serves app/dist + /api routes (port fallback, CORS)
│   ├── store.js                 "Dumb" JSON file storage (load/save/CRUD)
│   ├── routes/
│   │   └── reports.js           REST API + /api/sync endpoint
│   └── data/
│       └── reports.json         The JSON "database" (seeded with 2 demo reports)
└── app/                         React PWA (Vite)
    ├── index.html               SPA shell
    ├── vite.config.js           Dev server + /api proxy to the Express backend
    ├── package.json             Front-end dependencies
    ├── public/
    │   ├── manifest.webmanifest PWA manifest (installable)
    │   ├── sw.js                Service worker (offline app shell, never caches /api)
    │   └── icons/icon.svg       App icon
    └── src/
        ├── main.jsx             Entry point (renders <App/>, registers the SW)
        ├── App.jsx              Tab navigation + current view (plain state routing)
        ├── styles.css           Mobile-first dark theme
        ├── hooks/               React hooks (rubric: hooks + state management)
        │   ├── useConnection.js Live online/offline state (Connection API)
        │   ├── useSensors.js    Live compass heading + accelerometer tilt
        │   └── useStorageEstimate.js  navigator.storage.estimate()
        ├── components/
        │   ├── TabBar.jsx       Bottom tabs (+ live unsynced badge)
        │   ├── ConnectionBadge.jsx
        │   ├── ReportList.jsx   Read + category filter (Dexie live query)
        │   ├── ReportDetail.jsx Read / Update / Delete entry point
        │   ├── ReportForm.jsx   Create/Update: GPS + camera + sensors + contacts
        │   ├── MapView.jsx      Leaflet map of all located reports
        │   ├── SyncPanel.jsx    Upload/download/sync + storage quota display
        │   └── AboutPage.jsx
        └── services/            Framework-agnostic logic (portable, testable)
            ├── db.js            Dexie/IndexedDB wrapper (in-app CRUD, offline)
            ├── api.js           Fetch wrapper for the REST API
            ├── sync.js          Upload / download / two-way sync engine
            ├── geolocation.js   Geolocation API
            ├── camera.js        Camera API + album file input
            ├── sensors.js       Compass (deviceorientation) + Accelerometer (devicemotion)
            ├── contacts.js      Contact Picker API
            ├── connection.js    Connection API / online-offline detection
            └── categories.js    Category menu definitions + recipient hints
```

## Getting started

**Prerequisite:** Node.js 18+.

```bash
npm run install:all    # installs root (express/cors) + app (react/vite/...) deps
```

### Option A — production mode (single server, closest to the real deployment)

```bash
npm run build          # vite build -> app/dist
npm start              # Express serves the built PWA + API on one port
```

Open the URL printed in the terminal — by default `http://localhost:3000`. If Windows
has reserved that port (Hyper-V/winNAT often does) or it is already in use, the server
automatically falls back to 3100 → 4000 → 5000 → 8080 → 5500, so just use whichever
URL it prints. **Note:** in dev, the Vite proxy targets 3100 by default
(`vite.config.js`, override with the `API_PROXY` env var).

### Option B — dev mode with hot reload (two terminals)

```bash
npm run server         # terminal 1: Express API (prints its port)
npm run app            # terminal 2: Vite dev server (http://localhost:5173)
```

Vite proxies `/api` to the backend, so the app code always uses relative API URLs.

Two demo reports are pre-loaded on the server — open the **🔄 Sync** tab and press
**⬇️ Download all** to pull them onto the device, or create a report and press
**⬆️ Upload all**.

### Testing the device APIs

Device APIs need a **secure context** (`localhost` counts; plain HTTP over Wi-Fi does not):

- **Desktop** — everything except real GPS/camera/sensors works; you can still create/
  read/update/delete reports, pick album photos and run the full sync demo.
- **Phone on the same Wi-Fi** — expose localhost over HTTPS with a tunnel, e.g.
  `npx ngrok http 3100`, then open the forwarded HTTPS URL on the phone.
- **iOS Safari** — tap **Enable sensors (iOS)** once before the compass/tilt fields
  start updating (Apple requires a user gesture for motion sensors).
- **Camera** — the first capture asks for permission; the album path works everywhere,
  including desktop.

## Deployment (for the video demo / public URL)

**Live deployment:**

- **Front end (PWA):** <https://site-reporter-seven.vercel.app> — Vercel, root
  directory `app`, `VITE_API_BASE` injected at build time.
- **Back end (API):** <https://site-reporter-api.onrender.com> — Render free tier.
  Sleeps after ~15 min idle; the first request wakes it (~30–60 s), so hit
  `/api/health` before starting a demo.

**How it was deployed:**

- **Front end → Vercel:** import the repo, set Root Directory to `app`, framework
  preset Vite, and add the environment variable
  `VITE_API_BASE=https://site-reporter-api.onrender.com/api` before deploying.
- **Back end → Render/Railway/fly.io:** deploy this repo as a Node app
  (`npm install && npm start`). Set `CORS_ORIGIN=https://<your-app-host>` so only your
  front end may call the API, and `PORT` as provided by the host.
- Local hosting is also acceptable for the demo; the code must be 24/7 on a git repo.

## Report data model

One JSON object per report (identical shape on device and server):

```json
{
  "id": "demo-0001",
  "title": "Roe deer seen limping on service road",
  "category": "wildlife",
  "description": "Young roe deer limping…",
  "recipient": "ranger@site.example",
  "photos": ["data:image/jpeg;base64,…"],
  "location": {
    "latitude": 55.860916,
    "longitude": -4.251421,
    "accuracy": 11.5,
    "altitude": null,
    "heading": 128,
    "tilt": { "angle": 4, "direction": "up" },
    "timestamp": "2026-03-14T09:12:00.000Z"
  },
  "createdAt": "2026-03-14T09:12:00.000Z",
  "updatedAt": "2026-03-14T09:12:00.000Z",
  "syncStatus": "synced"
}
```

`syncStatus` is a **client-only** field: `new` → created offline, `modified` → edited
since the last sync, `synced` → identical on device and server.

## Server API

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/reports` | List all reports (optional `?since=<ISO date>`) |
| GET | `/api/reports/:id` | Read one report |
| POST | `/api/reports` | Create a report |
| PUT | `/api/reports/:id` | Update or create (upsert — used by "Upload all") |
| DELETE | `/api/reports/:id` | Delete a report |
| POST | `/api/sync` | Bulk push/pull: `{ changes: [...], since }` → `{ accepted, serverChanges, serverTime }` |
| GET | `/api/health` | Health check `{ ok, time, reports }` |

Server data lives in `server/data/reports.json` — open it after an upload to show the
"dumb storage" in action during a demo.

## Sync strategy

1. Every create/update/delete stays **local first** (IndexedDB via Dexie) and flags the
   report `new`/`modified`, so the app is fully usable offline.
2. **Upload all / Download all** are the naive one-way demos requested by the brief.
3. **Sync now** pushes flagged reports via `POST /api/sync` and pulls anything changed
   on the server since the last sync, merging with **last-write-wins** on `updatedAt`.
4. The Sync tab badge shows how many reports are still waiting to be pushed.

## Ideas for next steps

- Per-user accounts (login) and per-user data isolation on the server
- Delete propagation in the sync engine (server-side delete on pull)
- Search/filter by text; export/import reports as a JSON file
- Field-level conflict merge instead of last-write-wins
- Automated tests (Vitest for services/hooks, Supertest for the API) + GitHub Actions CI
- "Email recipient" hand-off (mailto: link or server-side mailer)
