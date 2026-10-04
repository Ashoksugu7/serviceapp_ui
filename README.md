# ServiceOps360 UI (Next.js)

Next.js 16 App Router + Tailwind CSS v4 frontend. It replaces the Vite UI in
`../ui/` screen by screen; the visual language follows `../computer-services.html`
(slate neutrals, teal brand, Inter, Lucide icons).

## Run locally

Start the Go API on `http://127.0.0.1:8080`, then:

```sh
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. `/styleguide` (development only, no sign-in)
shows every shared component.

## Docker

Build and start the production UI container:

```sh
docker compose up -d --build
```

It is available at `http://localhost:3000` by default. Set `API_BASE_URL` to
the reachable Go API origin (default: `http://host.docker.internal:8080`) and
`UI_PORT` to change the exposed port.

## How it talks to the API

- `POST /api/auth/login` exchanges credentials with the Go API and stores the
  access token in the httpOnly `so360_session` cookie. Browser code never sees it.
- `/api/v1/*` is proxied to the Go API with `Authorization: Bearer` added.
  Use `api()` from `lib/api-client.ts` in client components.
- Server components use `requireIdentity()` / `requireRole()` from `lib/session.ts`.
- `proxy.ts` redirects signed-out visitors to `/login`; a 401 or
  `403 COMPANY_SUSPENDED` clears the cookie via `/api/auth/expired`. Other 403s
  stay on the page as permission errors.

## Structure

| Path | Purpose |
| --- | --- |
| `app/(auth)/login` | Sign-in |
| `app/(app)/…` | Signed-in screens inside the sidebar shell |
| `components/ui` | Design system (Button, Field, Input, Card, PageHeader, SegmentedTabs, Chip, Badge, Table, Alert, EmptyState, StatTile…) |
| `components/shell` | Sidebar, mobile drawer, identity context |
| `lib/nav.ts` | Sidebar sections and role/Out-Store visibility |

## Migration status

Done: scaffold, design system, sign-in/out, session handling, role-aware shell, Dashboard,
Companies (list, onboarding, detail with users, suspend/reactivate), Users, and all masters
(Customers, Staff and roles, Products & Services, Out-Store Shops, Stand-by Items), and the
Service Profiles builder (fields with per-type settings, built-in labels, statuses, Out-Store
mapping, archive). Platform admins reach it from a company page. Service Entry renders each
profile's form (all eight field types, live calculated fields, quick-pick/toggle dates, customer
search with quick add, optional inline Out-Store dispatch, Copy to new). Records has server-side
search/filters/paging and a detail page with readable values, in-place editing (only changed
keys are sent), status changes with closed/reopen rules, and a history timeline.

The company, user and master list endpoints currently ignore `q`, `status`, `profile_id`
and paging, so those screens filter and page in the browser (`useLocalList` in
`lib/queries.ts`). Switch them to `useList` once the API applies the documented parameters.
Out-Store Entry (at shops / received back, send, edit, receive back, overdue flags; also on each
record page) and Stand-by (issue with linked record and Product Received, return, history) complete
the screen migration. Every sidebar screen now runs in this app.

API gaps worked around in the UI:
- Out-Store entries return only IDs, so each row loads its record (cached) for number/customer.
- `GET /standby-items/{id}/issues` is served but missing from the OpenAPI contract; Stand-by uses it
  to find the open issue for Return and to show history.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
```
