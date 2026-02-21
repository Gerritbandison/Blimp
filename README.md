# Blimp — IT Asset Management Platform

Blimp is a browser-based ITAM (IT Asset Management) application built with React, TypeScript, Vite, Zustand, and Tailwind CSS. It lets IT teams track hardware assets, software licences, and the people they're assigned to, with role-based access control and integration hooks for MDM providers (Intune, NinjaOne).

---

## Tech stack

| Layer | Library |
|---|---|
| UI framework | React 19 (Strict Mode) |
| Language | TypeScript 5 (`strict`, `noUnusedLocals`) |
| Build tool | Vite 7 |
| Routing | React Router v7 |
| State / persistence | Zustand 5 + `persist` middleware (localStorage) |
| Styling | Tailwind CSS 3 + `clsx` |
| Charts | Recharts 3 |
| Icons | Lucide React |
| Date handling | date-fns 4 |

---

## Getting started

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10

### Installation

```bash
git clone <repo-url>
cd Blimp
npm install
```

### Environment variables

Copy the example file and fill in values for your environment:

```bash
cp .env.example .env.local
```

See [`.env.example`](.env.example) for every supported variable with descriptions.

### Development

```bash
npm run dev
```

The app starts at `http://localhost:5173` by default.

### Build

```bash
npm run build       # type-check + Vite production build → dist/
npm run preview     # serve the production build locally
```

### Lint

```bash
npm run lint
```

---

## Demo credentials

| Email | Password | Role |
|---|---|---|
| `admin@blimp.io` | `admin123` | Admin (full access) |
| `finance@blimp.io` | `finance123` | Finance (read + reports, no integrations) |
| `viewer@blimp.io` | `viewer123` | Read Only (read-only, no settings / integrations) |

---

## Project structure

```
src/
├── auth/               # AuthContext — login / logout / session
├── components/
│   ├── common/         # Reusable UI (DataTable, Modal, EmptyState, ErrorBoundary …)
│   ├── integrations/   # Integration-specific modals (Intune, NinjaOne, Blimp Agent)
│   └── layout/         # Sidebar, TopBar, Layout wrapper
├── data/               # Mock seed data (development / demo only)
├── pages/              # Route-level page components
├── store/              # Zustand store (useStore.ts)
├── types/              # Shared TypeScript types
└── utils/              # Integration helpers (intune.ts, ninjaone.ts)

agent/                  # Blimp Agent Python script + OS-specific installers
public/                 # Static assets served at root
```

---

## Environment variables reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_APP_NAME` | No | `Blimp` | Display name shown in the browser tab |
| `VITE_AGENT_PORT` | No | `51723` | Port the local Blimp Agent listens on |
| `VITE_API_BASE_URL` | No | _(empty)_ | Base URL for backend API (future use) |

All Vite env vars must be prefixed with `VITE_` to be exposed to client-side code. Do **not** put secrets in these files — they are bundled into the public build output.

---

## Architecture notes

### State & persistence

All application state lives in a single Zustand store (`src/store/useStore.ts`), persisted to `localStorage` under the key `blimp-itam-store`. This means:

- Data survives page refreshes but is **browser-local** — different browsers / devices do not share state.
- There is currently no backend synchronisation layer.

### Authentication

Authentication is handled by `src/auth/AuthContext.tsx`. Session state is stored in `localStorage`. Demo credentials (see table above) are validated client-side; a real deployment should replace the credential check with an API call and use short-lived JWTs.

### Integration syncs

`src/utils/intune.ts` and `src/utils/ninjaone.ts` contain the integration logic. Both currently simulate network calls with `setTimeout`. In production these would call the Microsoft Graph API and NinjaOne v2 API respectively, using credentials stored securely on a backend — never in the browser.

### Blimp Agent

The Blimp Agent (`agent/blimp_agent.py`) is a small Python script installed on managed machines. It exposes a local HTTP server (default port `51723`) that the browser queries to collect hardware inventory. The port is configurable via `VITE_AGENT_PORT`.

---

## Known gaps (production roadmap)

- No backend / database — all data is `localStorage`-only
- Integration syncs are simulated (`setTimeout`)
- Activity log attributes all actions to `'Current User'`; real identity requires server-side auth
- No end-to-end or unit tests
- Accessibility: ongoing improvements (aria attributes, keyboard navigation)
