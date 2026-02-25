# Blimp — Production Readiness Review & Project Plan

**Date:** 2026-02-25
**Application:** Blimp IT Asset Management (ITAM) Platform
**Stack:** React 19 + Vite 7 (frontend) | Express 5 + PostgreSQL 16 + Prisma 7 (backend) | Python 3.7+ (agent)

---

## Executive Summary

Blimp is a well-architected IT Asset Management platform with strong code quality (strict TypeScript, Zod validation, Prisma ORM). However, **several critical gaps must be addressed before production deployment**. The most urgent are: unencrypted integration credentials in the database, an unprotected user registration endpoint, missing SSL/TLS configuration, no monitoring/observability, and incomplete test coverage.

This document identifies **42 action items** organized into 4 phases, prioritized by risk and effort.

---

## Part 1: Findings by Category

### 1. Security — CRITICAL ISSUES

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| S1 | **Integration credentials stored as plaintext JSON** in `configEncrypted` DB column (TODO comment says "encrypt with AES-256") | CRITICAL | `server/src/routes/integrations.ts:94,105,244,255` |
| S2 | **`POST /auth/register` is completely unprotected** — anyone can create accounts including Admin role | CRITICAL | `server/src/routes/auth.ts:88` |
| S3 | **Demo credentials hardcoded in frontend** (`admin@blimp.io`/`admin123`, etc.) — visible in JS bundle | HIGH | `src/auth/AuthContext.tsx:43-47` |
| S4 | **Docker containers run as root** — no `USER` directive in either Dockerfile | HIGH | `Dockerfile`, `server/Dockerfile` |
| S5 | **No SSL/TLS termination** — Nginx listens on port 80 only, no HTTPS redirect | HIGH | `nginx.conf` |
| S6 | **No HSTS header** configured | MEDIUM | `nginx.conf` |
| S7 | **No `helmet` middleware** for Express security headers | MEDIUM | `server/src/app.ts` |
| S8 | **CSP uses `unsafe-inline`** in HTML meta tag | MEDIUM | `index.html:14-16` |
| S9 | **No agent token rotation mechanism** — if a token leaks, only option is deleting the device | MEDIUM | `server/src/routes/agent.ts` |
| S10 | **CORS_ORIGIN not validated** — could be set to `*` in production | MEDIUM | `server/src/config.ts` |

### 2. API & Data Layer

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| A1 | **N+1 queries in integration sync** — loops query DB per device (1000 devices = 3000+ queries) | HIGH | `server/src/routes/integrations.ts:135-180` |
| A2 | **Missing DELETE endpoints** for Apps and People | HIGH | `server/src/routes/apps.ts`, `people.ts` |
| A3 | **Asset `tag` field not unique** — no DB constraint despite being used as identifier | HIGH | `server/prisma/schema.prisma` |
| A4 | **No file upload routes** — Document model exists but no implementation | MEDIUM | `server/src/routes/` |
| A5 | **Missing database indexes** on `tag`, `detectionSource`, `renewalDate` | MEDIUM | `server/prisma/schema.prisma` |
| A6 | **No date range filtering** on activity log endpoint | LOW | `server/src/routes/activity.ts` |
| A7 | **No circular relationship validation** for asset parent-child links | LOW | `server/src/routes/assets.ts` |
| A8 | **Response format inconsistencies** — sync/agent endpoints return different shapes | LOW | Various routes |

### 3. Testing

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| T1 | **No end-to-end tests** — no Cypress, Playwright, or similar | HIGH | — |
| T2 | **No backend integration tests** for assets, apps, people, integrations routes | HIGH | `server/src/__tests__/` |
| T3 | **No API contract tests** — frontend-backend integration untested | MEDIUM | — |
| T4 | **Missing test coverage** for detail pages, bulk operations, export, sync workflows | MEDIUM | `src/pages/__tests__/` |
| T5 | **Backend CI tests may fail** — no DB setup step in GitHub Actions for server tests | MEDIUM | `.github/workflows/ci.yml` |

### 4. Infrastructure & Deployment

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| I1 | **No monitoring or error tracking** — no Sentry, no structured logging, no alerting | HIGH | — |
| I2 | **No graceful shutdown handlers** — no SIGTERM handling, no connection draining | HIGH | `server/src/index.ts` |
| I3 | **Health check doesn't verify DB connectivity** | MEDIUM | `server/src/routes/` (health) |
| I4 | **No Docker resource limits** (CPU/memory) in compose | MEDIUM | `docker-compose.yml` |
| I5 | **No deployment pipeline** — CI builds but doesn't deploy to staging/prod | MEDIUM | `.github/workflows/ci.yml` |
| I6 | **No security scanning** in CI (no Dependabot, no SAST) | MEDIUM | `.github/workflows/ci.yml` |
| I7 | **No database backup strategy** documented | MEDIUM | — |
| I8 | **No log rotation** configured | LOW | `docker-compose.yml` |

### 5. Frontend & UX

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| F1 | **No 404 page** — unknown routes silently redirect to home | MEDIUM | `src/App.tsx` |
| F2 | **No API retry logic or timeouts** in fetch client | MEDIUM | `src/services/api.ts` |
| F3 | **No frontend env var validation** | LOW | `src/` |
| F4 | **Incomplete accessibility** — missing ARIA live regions for toasts, no focus indicators, sortable table headers not announced | MEDIUM | Various components |
| F5 | **No virtual scrolling** for large lists — could lag with 1000+ assets | LOW | `src/components/common/DataTable.tsx` |
| F6 | **localStorage bottleneck** — Zustand persist writes on every action, degrades with large datasets | LOW | `src/store/useStore.ts` |

### 6. Documentation

| # | Finding | Severity | Location |
|---|---------|----------|----------|
| D1 | **No API documentation** — no OpenAPI/Swagger spec | MEDIUM | — |
| D2 | **No deployment/operations guide** | MEDIUM | — |
| D3 | **No runbook** for incident response | LOW | — |

---

## Part 2: What's Already Good

The codebase has many production-quality patterns already in place:

- **Type safety**: Strict TypeScript on both frontend and backend
- **Input validation**: Zod schemas on every API endpoint
- **SQL injection protection**: Prisma ORM with parameterized queries throughout
- **XSS protection**: React auto-escaping, no `dangerouslySetInnerHTML`
- **Auth architecture**: JWT + bcrypt (12 rounds) + role-based access control
- **Rate limiting**: Login (10/15min) and agent report (30/min) endpoints
- **Code splitting**: Lazy-loaded pages with Suspense boundaries
- **Error boundaries**: React ErrorBoundary wraps the entire app
- **CI pipeline**: Lint, type-check, test (frontend + backend), build
- **Docker**: Multi-stage builds, proper nginx config with security headers, gzip, caching
- **Config validation**: Server fails fast on misconfigured env vars in production
- **Clean code**: No dead code, consistent patterns, proper separation of concerns

---

## Part 3: Project Plan

### Phase 1: Security Hardening (CRITICAL — Before Any Production Traffic)

**Goal:** Eliminate all critical and high-severity security vulnerabilities.

| Task | Ref | Effort | Description |
|------|-----|--------|-------------|
| 1.1 Encrypt integration credentials | S1 | 1-2 days | Implement AES-256-GCM encryption for the `configEncrypted` field. Use a `ENCRYPTION_KEY` env var (32-byte key). Encrypt on write, decrypt on read. Add migration to encrypt existing plaintext values. |
| 1.2 Protect registration endpoint | S2 | 0.5 day | Add `authenticate` + `requireRole('Admin')` middleware to `POST /auth/register`. Only admins should create new users. Alternatively, add an invite-token flow. |
| 1.3 Remove hardcoded demo credentials | S3 | 0.5 day | Remove demo credential validation from `AuthContext.tsx`. All auth should go through the backend JWT flow in production. Add a `VITE_DEMO_MODE` flag to conditionally enable demo login. |
| 1.4 Add non-root Docker user | S4 | 0.5 day | Add `USER node` (backend) and `USER nginx` (frontend) directives to Dockerfiles. Adjust file permissions accordingly. |
| 1.5 Configure SSL/TLS | S5, S6 | 1 day | Option A: Add an nginx reverse proxy container with Let's Encrypt (certbot). Option B: Document deployment behind AWS ALB/Cloudflare with TLS termination. Add HSTS header. |
| 1.6 Add helmet middleware | S7 | 0.5 day | `npm install helmet` in server, add `app.use(helmet())` with appropriate CSP policy. Remove CSP meta tag from `index.html`. |
| 1.7 Add token rotation for agent devices | S9 | 0.5 day | Add `POST /agent/devices/:id/rotate` endpoint that generates a new token and invalidates the old one. |
| 1.8 Validate CORS_ORIGIN format | S10 | 0.5 day | Add Zod validation that `CORS_ORIGIN` must be a valid URL (not `*`) in production mode. |

**Phase 1 Total: ~5-6 days**

---

### Phase 2: Stability & Reliability (HIGH — Before GA Launch)

**Goal:** Ensure the application is resilient, observable, and properly tested.

| Task | Ref | Effort | Description |
|------|-----|--------|-------------|
| 2.1 Add structured logging | I1 | 1 day | Install `pino` (fast JSON logger). Replace all `console.log/error` calls. Add request logging middleware with correlation IDs. Sanitize sensitive fields. |
| 2.2 Add error tracking | I1 | 0.5 day | Integrate Sentry (or similar) in both frontend (`ErrorBoundary`) and backend (`errorHandler`). Configure source maps upload for production builds. |
| 2.3 Add graceful shutdown | I2 | 0.5 day | Handle SIGTERM/SIGINT in `index.ts`: stop accepting new connections, drain existing requests (30s timeout), close DB pool, then exit. |
| 2.4 Enhance health check | I3 | 0.5 day | Add DB connectivity check to `/health` endpoint. Return `{ status, db: 'ok'|'error', timestamp }`. Add a separate `/ready` endpoint for Kubernetes-style readiness probes. |
| 2.5 Fix N+1 sync queries | A1 | 1 day | Pre-load all persons and existing assets in batch before the sync loop. Use `Map<email, Person>` and `Map<serial, Asset>` for O(1) lookups. |
| 2.6 Add missing DELETE endpoints | A2 | 0.5 day | Add `DELETE /apps/:id` and `DELETE /people/:id` with proper cascade handling and activity logging. |
| 2.7 Add unique constraint on asset tag | A3 | 0.5 day | Create a Prisma migration adding `@@unique([tag])` to the Asset model. Handle conflict errors in create/update routes. |
| 2.8 Add missing database indexes | A5 | 0.5 day | Add indexes on `Asset.tag`, `Asset.detectionSource`, `App.renewalDate` via Prisma migration. |
| 2.9 Add backend integration tests | T2 | 2-3 days | Write Vitest + Supertest tests for all CRUD routes: assets, apps, people, integrations, activity. Test auth, validation, pagination, and error cases. |
| 2.10 Fix CI for backend tests | T5 | 0.5 day | Add a PostgreSQL service container to the GitHub Actions workflow for backend test jobs. Set `DATABASE_URL` env var. |
| 2.11 Add Docker resource limits | I4 | 0.5 day | Add `deploy.resources.limits` (CPU, memory) to each service in `docker-compose.yml`. Example: backend 512MB/0.5 CPU, DB 1GB/1 CPU. |
| 2.12 Add 404 page | F1 | 0.5 day | Create a `NotFound.tsx` page component. Add a catch-all `<Route path="*">` in `App.tsx`. |
| 2.13 Add API client retry & timeout | F2 | 0.5 day | Add exponential backoff retry (3 attempts) and 30-second timeout to `src/services/api.ts`. |
| 2.14 Add database backup strategy | I7 | 0.5 day | Add `pg_dump` cron job to Docker Compose (or document cloud-managed backup for RDS/Cloud SQL). |

**Phase 2 Total: ~9-11 days**

---

### Phase 3: Quality & Compliance (MEDIUM — First 30 Days Post-Launch)

**Goal:** Improve test coverage, accessibility, documentation, and operational maturity.

| Task | Ref | Effort | Description |
|------|-----|--------|-------------|
| 3.1 Add E2E test suite | T1 | 3-4 days | Set up Playwright. Write tests for critical flows: login, asset CRUD, app management, integration connect/sync, agent device registration, export/reports. |
| 3.2 Add API documentation | D1 | 1-2 days | Generate OpenAPI 3.0 spec from Zod schemas (use `zod-to-openapi`). Serve Swagger UI at `/api/docs` in non-production environments. |
| 3.3 Improve accessibility | F4 | 2-3 days | Add ARIA live regions to Toast/notifications. Add visible focus indicators (Tailwind `ring`). Make DataTable headers announce sort state. Add skip-to-content link. Test with screen reader. |
| 3.4 Add security scanning to CI | I6 | 0.5 day | Enable GitHub Dependabot for dependency alerts. Add `npm audit` step to CI. Consider adding CodeQL or Snyk for SAST. |
| 3.5 Write deployment guide | D2 | 1 day | Document: environment setup, Docker Compose production config, SSL certificate management, DNS configuration, database migration workflow, backup/restore procedures. |
| 3.6 Add date range filtering to activity log | A6 | 0.5 day | Add `from` and `to` query parameters to `GET /activity`. |
| 3.7 Add file upload routes | A4 | 2 days | Implement `POST /assets/:id/documents`, `POST /apps/:id/documents`, `POST /people/:id/documents`. Use multer for file handling. Store in S3/MinIO or local volume. Add file type validation and size limits. |
| 3.8 Implement deployment pipeline | I5 | 1-2 days | Add CD steps to GitHub Actions: build Docker images, push to registry (ECR/GHCR), deploy to staging on merge to `main`. |

**Phase 3 Total: ~11-15 days**

---

### Phase 4: Scale & Polish (LOW — 60-90 Days Post-Launch)

**Goal:** Optimize for growth and improve developer/operator experience.

| Task | Ref | Effort | Description |
|------|-----|--------|-------------|
| 4.1 Add virtual scrolling for large lists | F5 | 1-2 days | Integrate `@tanstack/react-virtual` in DataTable for lists > 100 items. |
| 4.2 Optimize Zustand persistence | F6 | 1 day | Debounce localStorage writes. Consider IndexedDB for large datasets. Add data size monitoring. |
| 4.3 Add cursor-based pagination | — | 1 day | Replace offset pagination with cursor-based for better performance on large tables. |
| 4.4 Add Brotli compression | — | 0.5 day | Add `ngx_brotli` module to nginx for ~15-20% better compression than gzip. |
| 4.5 Add bundle analysis | — | 0.5 day | Add `rollup-plugin-visualizer` to Vite config. Monitor bundle size in CI. |
| 4.6 Write operational runbook | D3 | 1 day | Document common incidents, debugging procedures, escalation paths, and recovery steps. |
| 4.7 Add performance monitoring (RUM) | — | 1 day | Add Core Web Vitals tracking. Monitor page load times, API latencies, and error rates in production. |
| 4.8 Add env var validation in frontend | F3 | 0.5 day | Validate `VITE_*` env vars at build time. Warn if `VITE_API_BASE_URL` is not set. |

**Phase 4 Total: ~6-8 days**

---

## Part 4: Timeline Summary

```
Phase 1: Security Hardening          ████████████  ~5-6 days   ← BLOCKER for production
Phase 2: Stability & Reliability     ██████████████████████  ~9-11 days  ← Before GA
Phase 3: Quality & Compliance        ██████████████████████████████  ~11-15 days  ← First 30 days
Phase 4: Scale & Polish              ████████████████  ~6-8 days   ← 60-90 days
                                     ─────────────────────────────────
                                     Total: ~31-40 days of engineering work
```

---

## Part 5: Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Integration credential leak via DB breach | Medium | CRITICAL | Phase 1.1 — AES-256 encryption |
| Unauthorized account creation (privilege escalation) | High | CRITICAL | Phase 1.2 — Protect registration |
| Production errors go undetected | High | HIGH | Phase 2.1, 2.2 — Logging + Sentry |
| Data loss (no backups) | Low | CRITICAL | Phase 2.14 — Backup strategy |
| Sync performance degrades with scale | Medium | HIGH | Phase 2.5 — Fix N+1 queries |
| Accessibility lawsuit / compliance failure | Low | HIGH | Phase 3.3 — a11y improvements |
| Supply chain vulnerability in dependencies | Medium | MEDIUM | Phase 3.4 — Dependabot + npm audit |

---

## Part 6: Definition of "Production Ready"

The application can be considered production-ready when:

- [ ] All Phase 1 (Security) tasks are complete
- [ ] All Phase 2 (Stability) tasks are complete
- [ ] SSL/TLS is enforced on all endpoints
- [ ] Error tracking is active and alerting
- [ ] Database backups are automated and tested
- [ ] Health checks verify all dependencies
- [ ] CI pipeline passes with backend integration tests
- [ ] At minimum, login, asset CRUD, and integration sync have E2E test coverage
- [ ] Demo credentials are removed or gated behind a feature flag
- [ ] All `TODO` comments related to security are resolved
