# HostIQ Full Audit Report

Date: 2026-02-15  
Auditor: Cursor coding agent (automated + code review)  
Environment tested: Railway production

- Web: `https://web-production-d832b.up.railway.app`
- API: `https://api-production-0a1e.up.railway.app`

## Executive Summary

This audit combined:
- End-to-end browser testing with Puppeteer against production
- Authenticated API smoke testing against production
- Build/lint/type-check pipeline validation in the monorepo
- Source-level risk review for security and runtime correctness

Overall status:
- Production app is online and core flows are usable.
- A critical security issue exists (`/seed` endpoint exposed in production).
- A high-severity runtime issue exists on Marketing page (`undefined.length` crash path).
- Quality gates are degraded (`type-check` and `lint` are failing in repo CI workflows).

## Scope

### UI route coverage (production)

Public/Auth routes tested:
- `/`
- `/login`
- `/register`
- `/forgot-password`

Portal routes tested (authenticated):
- `/dashboard`
- `/reservations`
- `/messages`
- `/cleaners`
- `/pricing`
- `/revenue`
- `/marketing`
- `/reviews`
- `/issues`
- `/settings`
- `/admin`
- `/tickets`

### API coverage (production, authenticated)

Endpoints tested:
- `GET /health`
- `GET /api`
- `GET /api/auth/me`
- `GET /api/dashboard/stats`
- `GET /api/dashboard/activity`
- `GET /api/properties`
- `GET /api/reservations`
- `GET /api/messages` (returned 404)
- `GET /api/issues`
- `GET /api/cleaning`
- `GET /api/notifications`
- `GET /api/reports/owner-summary`
- `GET /api/admin/integrations/health`
- `GET /api/admin/users`

## Methodology

1. Ran a full browser crawl with scripted login and page navigation.
2. Ran per-page button scan and interaction attempts.
3. Collected:
   - JS runtime errors
   - network failures
   - screenshots
   - interaction outcomes
4. Ran monorepo checks:
   - `pnpm --filter @hostiq/api test`
   - `pnpm --filter @hostiq/web build`
   - `pnpm --filter @hostiq/api build`
   - `pnpm lint`
   - `pnpm type-check`
5. Performed targeted source review for failing areas.

## Automated Test Results

### Puppeteer E2E summary

Source: `audit-output/puppeteer-audit-report.json`

- Route loads executed: 16 (all target pages)
- Button scan passes: 12
- Clicks executed: 32
- Login: success
- JS runtime errors: 1
- Network failures: 2 (SSE abort during navigation)
- Unhandled click attempts: 323 (`Node is detached from document` during dynamic re-renders)

Notes:
- The large "detached node" count came mostly from repeated `Run Audit` clicks on Marketing and dynamic DOM updates. This indicates harness instability on dynamic nodes, not 323 distinct product defects.
- Screenshots exist for each visited page and each button scan.

### API smoke summary

- 13/14 checked endpoints returned expected `200`.
- `GET /api/messages` returned `404` (API exposes `/api/messages/threads`, not `/api/messages` root list endpoint).

### Build and test summary

- `@hostiq/api` tests: passed (`11 passed`, `19 skipped`)
- `@hostiq/web` build: passed
- `@hostiq/api` build: passed
- Monorepo lint: failed
- Monorepo type-check: failed (many API typing/schema mismatches)

## Findings

## 1) Critical - Production seeding endpoint exposed

Severity: **Critical**  
Area: API security  
File: `apps/api/src/server.ts`

### Evidence
- Public endpoint `POST /seed` is defined in server root (outside authenticated API route tree).
- Endpoint accepts a shared secret and creates admin/owner/cleaner users with known passwords.
- This is active in production.

### Risk
- If secret leaks or is mishandled, attacker can create/overwrite privileged credentials.
- Blast radius is full account compromise (admin creation/reset).

### Recommendation
- Remove the endpoint from production entirely.
- If operational seeding is needed, use one-time migration jobs, Railway admin task, or internal CLI behind infrastructure access.
- Rotate affected secrets and any seeded default credentials.

---

## 2) High - Marketing page runtime crash path

Severity: **High**  
Area: Frontend runtime stability  
File: `apps/web/src/app/(portal)/marketing/page.tsx`

### Evidence
- Production browser run captured:
  - `TypeError: Cannot read properties of undefined (reading 'length')`
  - Occurred in Marketing chunk when processing audit response.
- Code dereferences nested fields without validating `res.data` shape:
  - `result.titleSuggestions.length`
  - `result.descriptionScore`

### Risk
- User-triggered runtime crash on a core page.
- Broken UX and potential data loss for in-progress actions.

### Recommendation
- Validate response before usage (zod or runtime guard).
- Add safe defaults for optional/missing fields.
- Show recoverable error state when audit payload is malformed.

---

## 3) High - Type safety gate is currently broken

Severity: **High**  
Area: Build quality / regression risk  
Command: `pnpm type-check`

### Evidence
- Type-check fails in API with many errors:
  - Prisma JSON typing mismatches
  - route/schema field mismatches (`totalPayout`, `confirmedAt`)
  - enum incompatibilities in sync workers
  - rootDir/path setup issues

### Risk
- Regressions can ship unnoticed if production build bypasses strict type checks.
- Increases defect probability in sync, reporting, and webhook paths.

### Recommendation
- Restore green `type-check` in CI as release gate.
- Resolve Prisma model/type drifts first (`reports`, webhook payload types, enum mappings).
- Align `tsconfig` rootDir/path strategy for workspace imports.

---

## 4) Medium - Lint pipeline misconfigured

Severity: **Medium**  
Area: CI hygiene  
Command: `pnpm lint`

### Evidence
- `@hostiq/shared` runs `eslint src/`
- No ESLint config file exists for ESLint v9 (`eslint.config.*` missing)
- Lint job fails immediately.

### Risk
- Static quality checks are not enforceable.
- Code style/bug-prevention rules are effectively disabled.

### Recommendation
- Add root `eslint.config.js` (flat config) and workspace overrides.
- Make lint pass in all packages and enforce in CI.

---

## 5) Low - Messages API route shape inconsistency for consumers

Severity: **Low**  
Area: API usability  

### Evidence
- `GET /api/messages` returns 404.
- Thread listing lives at `GET /api/messages/threads`.

### Risk
- External integrators or maintainers may assume REST root collection endpoint exists.
- Minor developer friction.

### Recommendation
- Either add `GET /api/messages` alias to thread list or document route contract clearly.

## Non-Issue Observations

- SSE `net::ERR_ABORTED` events occurred during page transitions; expected behavior when navigation interrupts stream connections.
- No committed secret values detected in tracked files from quick pattern scan (`.env.example` contains placeholders only).

## Artifacts

- Primary JSON report: `audit-output/puppeteer-audit-report.json`
- Screenshots: `audit-output/screenshots/`
- Audit runner script: `audit-puppeteer.mjs`

## Remediation Priority Plan

1. **Immediate (same day)**
   - Remove/disable `/seed` in production.
   - Rotate `NEXTAUTH_SECRET` and force credential reset for seeded defaults.

2. **Short term (1-2 days)**
   - Harden Marketing audit response handling with validation/defaults.
   - Add test for malformed `/ai/listing-audit` response.

3. **Stabilization (2-4 days)**
   - Fix all `pnpm type-check` failures.
   - Restore ESLint config and make `pnpm lint` pass.

4. **Hardening (ongoing)**
   - Add CI gates: lint + type-check + smoke E2E.
   - Add monitoring alerts for frontend runtime exceptions and API 5xx spikes.

## Exit Criteria for "Audit Complete"

Audit is considered fully closed when:
- `/seed` is removed or environment-gated off production and secrets rotated.
- Marketing page no longer crashes with malformed or partial audit data.
- `pnpm lint` and `pnpm type-check` both pass in CI.
- E2E rerun shows zero unhandled runtime exceptions on tested routes.
