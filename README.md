# Compliance Admin UI

Internal ops console for the cloud compliance platform. **Not** customer-facing — use [cloud-compliance-ui](../cloud-compliance-ui) for tenant dashboards.

| Talks to | Port | Purpose |
|----------|------|---------|
| [steampipe](../steampipe) | 8000 | Auth, tenants, accounts, scan trigger, schedules |
| [cloud-compliance-engine](../cloud-compliance-engine) | 8001 | Health check (results viewed in client UI) |

Runs on **http://localhost:5174** (client UI uses 5173).

---

## Prerequisites

1. Stage 1 API + workers running (`steampipe` Docker)
2. Compliance API running (`cloud-compliance-engine` Docker) — optional for admin v1 except health
3. A **`super_admin`** user in Postgres

### Platform tenant (env AWS creds, no assume-role)

One tenant for your own AWS account — workers use `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` from `.env`:

```bash
cd steampipe
python scripts/setup_platform_tenant.py
```

Creates `drantiq_platform` tenant, discovers AWS account via STS, and users:
- `ops@drantiq.local` — `super_admin` (admin UI)
- `admin@drantiq.local` — `tenant_admin` (client UI)

Do **not** set `role_arn` on this account unless you need cross-account assume.

### Create super_admin user (manual)

```bash
cd steampipe
python scripts/create_tenant_user.py \
  --tenant-id 5b12b902-d1fc-4aec-b0fb-f2d7e8af4b47 \
  --email ops@drantiq.local \
  --password password123 \
  --role super_admin
```

Restart Stage 1 API after auth code changes: `docker compose -f docker-compose.remote.yml up -d --build api`

---

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:5174/login

### `.env.local`

```env
VITE_STAGE1_URL=http://localhost:8000
VITE_COMPLIANCE_URL=http://localhost:8001
VITE_AUTH_REQUIRED=true
VITE_APP_TITLE=Compliance Admin
VITE_ALLOWED_ROLES=super_admin
```

**JWT:** Same `JWT_SECRET_KEY` in steampipe `.env`. Set `API_AUTH_REQUIRED=true` on Stage 1 when ready for prod.

---

## v1 scope

| In | Out |
|----|-----|
| Login (`super_admin` only) | User CRUD UI (use `create_tenant_user.py` for now) |
| Platform health overview | Queue monitoring (T-035) |
| Tenant list + create | Cognito / SSO |
| Tenant detail: accounts + **Run CIS scan** | Multi-framework picker |
| Schedule list (read-only) | Schedule create form |

**Client UI:** [cloud-compliance-ui](../cloud-compliance-ui) — scan results, controls matrix, evidence.

---

## Routes

| Route | Page |
|-------|------|
| `/login` | Sign in |
| `/` | Overview — API health, tenant count |
| `/tenants` | Tenant list + create |
| `/tenants/:tenantId` | Accounts + trigger scan |
| `/schedules` | Cron schedules (read-only) |

---

## Related docs

- [T034_CLIENT_UI_PROMPT.md](../infra-state-docs/platform/T034_CLIENT_UI_PROMPT.md) — client dashboard spec
- [TASK_TRACKER.md](../infra-state-docs/platform/TASK_TRACKER.md)
