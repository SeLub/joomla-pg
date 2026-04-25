# Joomla + PostgreSQL/PostGIS + NestJS Stack

A production-ready stack combining Joomla as a content/promo website with a high-performance geospatial API backend.

> ⚠️ **Work in Progress**: This project is under active development. Future enhancements are planned according to technical specifications in [`plans/`](./plans/):
> - [`plg_system_userconnect.md`](./plans/plg_system_userconnect.md) — User synchronization plugin (Joomla ↔ NestJS)
> - [`web-socket-stream.md`](./plans/web-socket-stream.md) — Real-time WebSocket streaming for charging progress

---

## 🏗 Architecture

```
Browser
  ↓
Joomla (PHP) — file cache for static content (articles, pages)
  ↓
NestJS API — Redis cache for routes, prices, geo queries + WebSocket broadcast
  ↓
PostgreSQL 15 + PostGIS — single database, two schemas:
  ├─ joomla.*  — Joomla CMS tables (jos_users, jos_content, etc.)
  └─ public.*  — App tables (app_users, locations, routes, charging_sessions)
  ↓
Redis — shared cache layer + async queue for resilient sync
```

### 🔑 Key Design Decisions

| Layer | Technology | Reason |
|---|---|---|
| **CMS** | Joomla 6 | Ready-made blog, SEO, user management, non-technical editor friendly |
| **Database** | PostgreSQL 15 + PostGIS | Single DB, two schemas: `joomla` (CMS) + `public` (app). Simplifies backups, transactions, and cross-schema queries |
| **API Server** | NestJS (Node.js + PNPM) | Fast, typed, modular — handles business logic, geo queries, WebSocket streaming |
| **Cache/Queue** | Redis 7 | Shared cache + async queue for resilient user provisioning and real-time broadcasts |

### Why a Single PostgreSQL with Two Schemas?

- ✅ **Simplified operations**: One database to backup, monitor, and scale
- ✅ **Cross-schema queries**: Efficient joins between `joomla.jos_users` and `public.app_users` without external API calls
- ✅ **Transactional integrity**: Optional foreign keys between schemas when strict consistency is needed
- ✅ **Clear ownership**: `joomlauser` owns `joomla.*`, `appuser` owns `public.*` — enforced via PostgreSQL roles

### What Each Layer Caches

| Layer | Data | TTL | Purpose |
|---|---|---|---|
| **Joomla file cache** | Articles, pages, modules | Long (hours) | Static content delivery |
| **Redis (NestJS)** | Nearest locations, pre-calculated routes | 2 min – 1 hour | Dynamic geo queries |
| **Redis (Queue)** | Failed user provisioning events | Until processed | Resilient sync fallback |
| **Redis (Pub/Sub)** | Real-time charging progress | Ephemeral | WebSocket broadcast |

---

## 📁 Project Structure

```
.
├── docker-compose.yml          # Full stack orchestration
├── README.md
├── plans/                      # Technical specifications for future work
│   ├── plg_system_userconnect.md   # User sync plugin spec
│   └── web-socket-stream.md        # WebSocket streaming spec
├── plg_system_joomlageo/       # Joomla plugin for user provisioning
│   ├── joomlageo.php
│   ├── joomlageo.xml
│   └── plg_system_joomlageo.zip
├── postgres/
│   └── init.sql                # DB init: schemas, users, extensions, grants
└── api/                        # NestJS API server
    ├── Dockerfile
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── main.ts
        ├── app.module.ts
        ├── database.service.ts
        ├── domains/
        │   ├── locations/      # Geo endpoints: /api/locations/*
        │   └── users/          # User provisioning: POST /api/v1/users/provision
        ├── health/             # GET /api/health
        └── shared/
            ├── database/       # TypeORM config
            └── entities/       # Cross-schema entities (e.g., JoomlaUser)
```

---

## 🚀 Services

| Service | Container | Port | Description |
|---|---|---|---|
| **Joomla** | `joomla-app` | `8080` | CMS frontend and admin panel |
| **PostgreSQL + PostGIS** | `joomla-pg` | internal | Single DB with two schemas: `joomla` (CMS) + `public` (app) |
| **NestJS API** | `joomla-api` | `3000` | REST API, business logic, geo queries, WebSocket gateway |
| **Redis** | `joomla-redis` | internal | Cache + async queue + Pub/Sub for real-time features |

---

## 🔌 API Endpoints

Swagger UI: http://localhost:3000/api/docs

### Health
```http
GET /api/health
```
Returns service status and timestamp.

### Nearest Locations
```http
GET /api/locations/nearest?lat=50.45&lon=30.52&limit=10
```
Returns nearest locations using PostGIS KNN (`<->`). Cached in Redis (2 min TTL).

### Route & Price
```http
GET /api/locations/route?from=1&to=5
```
Returns pre-calculated route metrics. Cached in Redis (1 hour TTL).

### User Provisioning (Idempotent)
```http
POST /api/v1/users/provision
Content-Type: application/json

{
  "joomlaUserId": 123,
  "email": "user@example.com",
  "username": "alice"
}
```
Creates or updates `public.app_users` entry. Idempotent via `ON CONFLICT DO UPDATE`.

---

## 🔄 User Registration Flow (Idempotent Provisioning)

```mermaid
sequenceDiagram
    participant U as User/Browser
    participant J as Joomla (PHP)
    participant P as Plugin: plg_system_joomlageo
    participant N as NestJS API
    participant DB as PostgreSQL

    Note over U,J: 1. Registration
    U->>J: POST /registration
    J->>DB: INSERT INTO joomla.jos_users
    J->>P: onUserAfterSave(isNew=true)
    P->>N: POST /api/v1/users/provision {joomlaUserId, email, username}
    N->>DB: UPSERT INTO public.app_users (ON CONFLICT DO UPDATE)
    N-->>P: 200/201 OK
    P-->>J: Continue (never block UX)
    J-->>U: Registration complete
```

> 📌 **Key principle**: Plugin failures never block user registration. Errors are logged and queued for retry.

---

## 🔗 Ensuring Joomla Independence (Loose Coupling)

| Principle | Implementation |
|-----------|---------------|
| **API Contract** | Versioned endpoints (`/api/v1/...`), OpenAPI docs, contract tests |
| **Async Resilience** | Failed HTTP calls → Redis queue → background retry with exponential backoff |
| **Idempotency** | All mutations use `ON CONFLICT DO UPDATE` / UPSERT patterns |
| **Feature Flags** | Enable/disable integration via plugin config, no code deploys |
| **Schema Isolation** | `joomlauser` cannot write to `public.*`; `appuser` has read-only access to `joomla.*` |

---

## 🛠 Getting Started

### Prerequisites
- Docker Engine ≥ 24.0
- Docker Compose ≥ v2.20
- (Optional) `psql` client for manual DB inspection

### Installation

1. **Clone and configure**
   ```bash
   git clone <repo>
   cd joomla-pg
   cp .env.example .env  # Edit if needed (secrets, ports)
   ```

2. **Start the stack**
   ```bash
   docker compose up -d
   ```

3. **Complete Joomla setup** (first run only)
   - Visit http://localhost:8080
   - In installer:
     - **Database Type**: `PostgreSQL`
     - **Host**: `joomla-pg`
     - **Database**: `appdb`
     - **User**: `joomlauser`
     - **Password**: `joomlasecret`
     - **Table Prefix**: `jos_`
   - ⚠️ Ensure "Create database" is **unchecked** (DB already exists via `init.sql`)

4. **Install the sync plugin**
   ```bash
   # Via Joomla Admin:
   # Extensions → Manage → Install → Upload Package
   # Select: plg_system_joomlageo/plg_system_joomlageo.zip
   
   # Then enable:
   # Extensions → Plugins → System - JoomlaGeo → Enable
   ```

5. **Verify connectivity**
   ```bash
   # Test API health
   curl http://localhost:3000/api/health

   # Test provisioning endpoint
   curl -X POST http://localhost:3000/api/v1/users/provision \
     -H 'Content-Type: application/json' \
     -d '{"joomlaUserId":999,"email":"test@example.com","username":"test"}'

   # Check DB: cross-schema query
   docker exec -it joomla-pg psql -U appuser -d appdb -c "
     SELECT u.username, a.email 
     FROM joomla.jos_users u 
     LEFT JOIN public.app_users a ON a.joomla_id = u.id 
     WHERE u.id = 999;
   "
   ```

### Access Points
- Joomla frontend: http://localhost:8080
- Joomla admin: http://localhost:8080/administrator
- NestJS API: http://localhost:3000/api/health
- Swagger UI: http://localhost:3000/api/docs

---

## 🗄️ PostgreSQL Schema Overview

```sql
-- postgres/init.sql (excerpt)

-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Joomla schema (owned by joomlauser)
CREATE SCHEMA IF NOT EXISTS joomla;
-- Joomla tables are created by Joomla installer into joomla.*

-- App schema (public, owned by appuser)
CREATE TABLE public.app_users (
  joomla_id INTEGER PRIMARY KEY REFERENCES joomla.jos_users(id),
  email VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}'
);

-- Geo tables
CREATE TABLE public.locations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  coords GEOMETRY(Point, 4326) NOT NULL
);
CREATE INDEX idx_locations_coords ON public.locations USING GIST (coords);

-- Grants (enforce isolation)
GRANT USAGE ON SCHEMA joomla TO appuser;
GRANT SELECT ON ALL TABLES IN SCHEMA joomla TO appuser;
GRANT ALL ON SCHEMA public TO appuser;
```

---

## ⚙️ Environment Variables

### NestJS API (`api` service)
| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | `postgres://appuser:appsecret@joomla-pg:5432/appdb` |
| `REDIS_HOST` | `redis` | Redis hostname for cache/queue |
| `PORT` | `3000` | API listen port |
| `NODE_ENV` | `development` | `development` or `production` |
| `JWT_SHARED_SECRET` | — | Secret for internal JWT signing (WebSocket auth) |

### Joomla Plugin (via admin UI)
| Setting | Default | Description |
|---|---|---|
| API Endpoint | `http://joomla-api:3000/api/v1/users` | Provisioning URL (Docker internal) |
| Timeout | `3` seconds | Max wait for HTTP call (low to avoid blocking UX) |
| Queue Backend | `redis` | `redis` or `database` fallback |
| Log Level | `warning` | `debug`, `info`, `warning`, `error` |

---

## 📈 Scaling & Production Readiness

### Horizontal Scaling
- **NestJS**: Run multiple instances; share Redis for cache coherence and Pub/Sub
- **Joomla**: Scale behind load balancer with shared `joomla_data` volume or S3-backed media
- **PostgreSQL**: Read replicas for geo queries; logical replication for analytics

### Monitoring Hooks
- Prometheus metrics endpoint (planned): `/metrics`
- Structured JSON logs (NestJS): parseable by Loki/ELK
- Health checks: `/api/health` (NestJS), `pg_isready` (PostgreSQL), `redis-cli ping`

### Backup Strategy
```bash
# Single-command backup (both schemas)
docker exec joomla-pg pg_dump -U appuser -d appdb --schema=joomla --schema=public -Fc > backup.dump

# Restore
docker exec -i joomla-pg pg_restore -U appuser -d appdb -c < backup.dump
```

---

## 🧭 Roadmap (Planned Enhancements)

See [`plans/`](./plans/) for detailed specifications:

### ✅ Phase 1: User Sync Plugin (`plg_system_userconnect`)
- [x] Basic provisioning on registration (MVP)
- [ ] Retry logic with exponential backoff
- [ ] Redis queue fallback for resilient sync
- [ ] Admin UI for monitoring sync status
- [ ] Migration path: `joomlageo` → `userconnect`

### 🔄 Phase 2: Real-Time Streaming (`web-socket-stream`)
- [ ] WebSocket gateway for charging progress broadcast
- [ ] JWT token service for secure frontend auth
- [ ] JS widget for Joomla templates (progress bar + metrics)
- [ ] Integration with charging station simulator / OCPP backend

### 🔮 Phase 3: Production Hardening
- [ ] HTTPS/WSS termination (Traefik or Nginx proxy)
- [ ] Rate limiting and DDoS protection
- [ ] Automated contract tests (Joomla plugin ↔ NestJS API)
- [ ] Multi-region deployment guide

---

## 🤝 Contributing

1. Follow the architecture: Joomla = content layer, NestJS = business logic layer
2. Keep schemas isolated: never let Joomla write to `public.*` directly
3. Make integrations async and idempotent by default
4. Document new endpoints in OpenAPI (Swagger decorators)
5. Add contract tests for cross-service interactions

---

> 💡 **Remember**: The competitive value of this project is the geospatial routing logic and real-time user experience — not the CMS layer. Joomla solves the "website" problem so development effort focuses on the data product.

*Last updated: 2026-04-25*# deploy test Sat Apr 25 03:42:41 PM +03 2026
# ci-test Sat Apr 25 04:16:02 PM +03 2026
