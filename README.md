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
├── docker-compose.yml              # Local development (with debug ports)
├── docker-compose.prod.yml         # Production deployment (secure, no debug ports)
├── .env.example                    # Template for environment variables (COMMIT THIS)
├── .gitignore                      # Excludes .env, secrets, node_modules
├── README.md
├── plans/                          # Technical specifications for future work
│   ├── plg_system_userconnect.md   # User sync plugin spec
│   └── web-socket-stream.md        # WebSocket streaming spec
├── plg_system_joomlageo/           # Joomla plugin for user provisioning
│   ├── joomlageo.php
│   ├── joomlageo.xml
│   └── plg_system_joomlageo.zip
├── postgres/
│   └── init.sql                    # DB init: schemas, users, extensions, grants
└── api/                            # NestJS API server
    ├── Dockerfile
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── main.ts
        ├── app.module.ts
        ├── database.service.ts
        ├── domains/
        │   ├── locations/          # Geo endpoints: /api/locations/*
        │   └── users/              # User provisioning: POST /api/v1/users/provision
        ├── health/                 # GET /api/health
        └── shared/
            ├── database/           # TypeORM config
            └── entities/           # Cross-schema entities (e.g., JoomlaUser)
```

---

## 🚀 Services

| Service | Container | Port (Prod) | Port (Dev) | Description |
|---|---|---|---|---|
| **Joomla** | `joomla-app` | `80`, `443` | `8080` | CMS frontend and admin panel |
| **PostgreSQL + PostGIS** | `joomla-pg` | internal only | `5432` (optional) | Single DB with two schemas: `joomla` (CMS) + `public` (app) |
| **NestJS API** | `joomla-api` | `3000` | `3000` | REST API, business logic, geo queries, WebSocket gateway |
| **Redis** | `joomla-redis` | internal | internal | Cache + async queue + Pub/Sub for real-time features |

> 🔐 **Security note**: In production, PostgreSQL port 5432 is **not exposed** to the internet. Access is only possible from within the Docker network (`app-net`) or via SSH tunnel.

---

## 🔌 API Endpoints

Swagger UI: http://localhost:3000/api/docs (local) or http://YOUR_SERVER_IP:3000/api/docs (prod)

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
Returns pre-calculated route distance, duration and price between two location IDs. Cached in Redis (1 hour TTL).

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

## 🌿 Branch Strategy: `main` vs `develop`

| Branch | Purpose | Deployment |
|--------|---------|-----------|
| **`develop`** | Active development, feature branches merge here | ❌ Not deployed automatically |
| **`main`** | Production-ready code, only merged from `develop` via PR | ✅ Auto-deployed via GitHub Actions |

### Workflow:
```
feature/new-feature → develop → [PR + review] → main → 🚀 Auto-deploy to production
```

### Rules:
- ✅ Direct pushes to `main` are discouraged; use Pull Requests
- ✅ `develop` can be force-pushed during active development
- ✅ Tag releases on `main`: `git tag -a v1.0.0 -m "Release 1.0.0"`

---

## 🔄 GitHub Actions Deployment

### File: `.github/workflows/deploy.yml`

```yaml
name: Build & Deploy

on:
  push:
    branches: [ main ]  # Only deploy when main is updated

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Hetzner via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.HETZNER_HOST }}
          username: ${{ secrets.HETZNER_USER }}
          key: ${{ secrets.HETZNER_SSH_KEY }}
          script: |
            set -e
            cd /opt/joomla-pg
            
            echo "🔄 Pulling latest code..."
            git fetch origin main
            git reset --hard origin/main
            
            echo "🔨 Building API image..."
            docker compose -f docker-compose.prod.yml build --no-cache api
            
            echo "🚀 Starting services..."
            docker compose -f docker-compose.prod.yml up -d --remove-orphans
            
            echo "⏳ Waiting for services..."
            sleep 20
            
            echo "🏥 Health check..."
            curl -f http://127.0.0.1:3000/api/health || { echo "❌ API Health check failed"; exit 1; }
            
            echo "🧹 Cleaning..."
            docker image prune -f --filter="until=24h"
            
            echo "✅ Deploy completed!"
```

### Required GitHub Secrets (Settings → Secrets and variables → Actions):

| Secret | Description | Example |
|--------|------------|---------|
| `HETZNER_HOST` | Server IP address | `91.99.58.149` |
| `HETZNER_USER` | SSH username | `root` |
| `HETZNER_SSH_KEY` | Private SSH key for deployment | `-----BEGIN OPENSSH PRIVATE KEY-----...` |

> 🔐 **SSH Key Setup**: Generate a dedicated deploy key without passphrase:
> ```bash
> ssh-keygen -t ed25519 -f ~/.ssh/github-deploy -C "github-actions@joomla-pg" -N ""
> ssh-copy-id -i ~/.ssh/github-deploy.pub root@YOUR_SERVER_IP
> # Then add the PRIVATE key (~/.ssh/github-deploy) to GitHub Secrets
> ```

---

## 🚀 Production Deployment Guide

### Prerequisites on Server
- Ubuntu 24.04 LTS
- Docker Engine ≥ 24.0
- Docker Compose ≥ v2.20
- Git

### Step 1: Prepare the Server

```bash
# Install Docker & Compose
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER && newgrp docker
apt install -y docker-compose-plugin git curl

# Basic security
ufw default deny incoming && ufw default allow outgoing
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
ufw --force enable
```

### Step 2: Clone Repository

```bash
mkdir -p /opt/joomla-pg && cd /opt/joomla-pg
git clone https://github.com/SeLub/joomla-pg.git .
```

### Step 3: Create `.env` File (DO NOT COMMIT)

```bash
# Create .env with real secrets
cat > .env << 'EOF'
# === Database ===
POSTGRES_USER=appuser
POSTGRES_PASSWORD=YourStrongPasswordHere
POSTGRES_DB=appdb

# === API ===
# 🔥 CRITICAL: Use service name 'postgres', NOT container_name 'joomla-pg'
DATABASE_URL=postgres://appuser:YourStrongPasswordHere@postgres:5432/appdb
REDIS_HOST=joomla-redis
NODE_ENV=production
PORT=3000
JWT_SHARED_SECRET=YourVeryLongAndRandomSecretKey2026

# === Joomla ===
JOOMLA_DB_PASSWORD=joomlasecret
EOF
chmod 600 .env
```

> ⚠️ **Critical**: `DATABASE_URL` must use `@postgres:5432` (service name), not `@joomla-pg:5432` (container_name). In custom Docker networks, DNS resolution uses service names.

### Step 4: Deploy with Production Config

```bash
# Start the stack with production config
docker compose -f docker-compose.prod.yml up -d --build

# Verify services
docker ps
# Expected: joomla-app (ports 80,443), joomla-api (port 3000), joomla-pg (no external port)

# Test API health
curl -I http://127.0.0.1:3000/api/health
# Expected: HTTP/1.1 200 OK

# Test Joomla installer
curl -I http://127.0.0.1/installation/
# Expected: HTTP/1.1 200 OK
```

### Step 5: Complete Joomla Installation

1. Open in browser: `http://YOUR_SERVER_IP/installation/`
2. Configure database:
   | Field | Value |
   |-------|-------|
   | Database Type | `PostgreSQL` |
   | Host | `postgres` (service name!) |
   | Port | `5432` |
   | Username | `joomlauser` |
   | Password | `joomlasecret` (or your `JOOMLA_DB_PASSWORD`) |
   | Database Name | `appdb` |
   | Table Prefix | `jos_` |
   | Create Database | ❌ **No** (already exists via `init.sql`) |
3. Complete setup, create admin account
4. **Delete `/installation` folder** when prompted

---

## 🗄️ docker-compose.prod.yml (Production Configuration)

```yaml
version: '3.8'

services:
  postgres:
    image: postgis/postgis:15-3.3-alpine
    container_name: joomla-pg
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-appuser}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-appdb}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-appuser} -d ${POSTGRES_DB:-appdb}"]
      interval: 10s
      retries: 5
      start_period: 30s
    networks:
      - app-net
    # 🔒 Port 5432 NOT exposed — access only via internal network

  redis:
    image: redis:7-alpine
    container_name: joomla-redis
    volumes:
      - redisdata:/data
    restart: unless-stopped
    networks:
      - app-net

  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    container_name: joomla-api
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_HOST: ${REDIS_HOST:-joomla-redis}
      NODE_ENV: ${NODE_ENV:-production}
      PORT: ${PORT:-3000}
      JWT_SHARED_SECRET: ${JWT_SHARED_SECRET}
    ports:
      - "0.0.0.0:3000:3000"  # ✅ Exposed for WebSocket & external API calls
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped
    networks:
      - app-net

  joomla:
    image: joomla:latest
    container_name: joomla-app
    ports:
      - "80:80"
      - "443:443"
    environment:
      JOOMLA_DB_TYPE: pgsql
      JOOMLA_DB_HOST: postgres      # ✅ CRITICAL: service name, NOT container_name
      JOOMLA_DB_USER: joomlauser
      JOOMLA_DB_PASSWORD: ${JOOMLA_DB_PASSWORD:-joomlasecret}
      JOOMLA_DB_NAME: ${POSTGRES_DB:-appdb}
      JOOMLA_DB_PREFIX: jos_
    volumes:
      - joomla_data:/var/www/html
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - app-net

volumes:
  pgdata:
  redisdata:
  joomla_data:

networks:
  app-net:
    driver: bridge
```

---

## ⚙️ Environment Variables Reference

### `.env.example` (Commit this template)

```env
# .env.example — Template for environment variables (SAFE TO COMMIT)
# Copy to .env and fill with real values. NEVER commit .env!

# === Database ===
POSTGRES_USER=appuser
POSTGRES_PASSWORD=changeme
POSTGRES_DB=appdb

# === API ===
# 🔥 CRITICAL: Use 'postgres' (service name), NOT 'joomla-pg' (container_name)
DATABASE_URL=postgres://appuser:changeme@postgres:5432/appdb
REDIS_HOST=joomla-redis
NODE_ENV=production
PORT=3000
JWT_SHARED_SECRET=changeme

# === Joomla ===
# Must match password in postgres/init.sql for joomlauser
JOOMLA_DB_PASSWORD=joomlasecret
```

### `.env` (DO NOT COMMIT — Add to .gitignore)

```bash
# .gitignore should contain:
.env
*.env
*.local
node_modules/
dist/
```

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `POSTGRES_USER` | ✅ | PostgreSQL admin user | `appuser` |
| `POSTGRES_PASSWORD` | ✅ | PostgreSQL password (strong!) | `Str0ng!P@ssw0rd#2026` |
| `POSTGRES_DB` | ✅ | Database name | `appdb` |
| `DATABASE_URL` | ✅ | Connection string for NestJS — **use `@postgres:`** | `postgres://appuser:pass@postgres:5432/appdb` |
| `REDIS_HOST` | | Redis hostname (default: `joomla-redis`) | `joomla-redis` |
| `NODE_ENV` | | Node environment (`production` recommended) | `production` |
| `PORT` | | API listen port | `3000` |
| `JWT_SHARED_SECRET` | ✅ | Secret for JWT signing (long & random) | `V3ryL0ngAndR4nd0mS3cr3tK3y2026` |
| `JOOMLA_DB_PASSWORD` | ✅ | Password for `joomlauser` — must match `init.sql` | `joomlasecret` |

> ⚠️ **Critical Notes**:
> 1. `DATABASE_URL` must use `@postgres:5432` (service name), not `@joomla-pg:5432` (container_name)
> 2. `JOOMLA_DB_PASSWORD` must match the password for `joomlauser` in `postgres/init.sql`
> 3. Use strong, unique passwords for `POSTGRES_PASSWORD` and `JWT_SHARED_SECRET`
> 4. Never commit `.env` — use `.env.example` as a template

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

# Automate with cron (on server):
0 2 * * * docker exec joomla-pg pg_dump -U appuser -d appdb -Fc > /backups/appdb_$(date +\%F).dump
```

---

## 🔐 Security Checklist for Production

- [ ] `.env` file is NOT committed to repository
- [ ] `DATABASE_URL` uses service name `postgres`, not container_name `joomla-pg`
- [ ] PostgreSQL port 5432 is NOT exposed to internet (only internal network)
- [ ] API port 3000 is exposed only if needed for WebSocket/external calls
- [ ] Strong passwords used for `POSTGRES_PASSWORD`, `JWT_SHARED_SECRET`
- [ ] `NODE_ENV=production` in production deployment
- [ ] UFW firewall allows only ports 22, 80, 443 (and 3000 if API is public)
- [ ] Hetzner Cloud Firewall configured to restrict access (optional but recommended)
- [ ] Joomla `/installation` folder deleted after setup
- [ ] Joomla admin account uses strong password + 2FA enabled

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
6. Use `develop` branch for features, `main` for production releases

---

## ❓ Troubleshooting

### Joomla cannot connect to database
```bash
# Check if joomlauser password matches .env and init.sql
docker exec joomla-pg psql -U appuser -d appdb -c "\du joomlauser"

# Test connection as joomlauser
docker exec joomla-pg psql -U joomlauser -d appdb -c "SELECT 1;"

# Check Joomla logs
docker logs joomla-app | grep -i "connection\|error"
```

### API cannot connect to database
```bash
# Verify DATABASE_URL uses correct host (postgres, not joomla-pg)
docker compose -f docker-compose.prod.yml config | grep DATABASE_URL

# Test connection from API container
docker exec joomla-api node -e "require('pg').connect(process.env.DATABASE_URL, (err) => console.log(err || 'Connected'))"
```

### Site not accessible on port 80
```bash
# Check if container is listening
docker ps | grep joomla-app

# Check UFW firewall
ufw status | grep "80/tcp"

# Test locally on server
curl -I http://127.0.0.1/installation/

# Check Hetzner Cloud Firewall rules (if used)
```

### WebSocket connections failing
```bash
# Verify API is listening on 0.0.0.0:3000, not 127.0.0.1:3000
docker ps | grep joomla-api

# Test API health from external machine
curl -I http://YOUR_SERVER_IP:3000/api/health
```

---

> 💡 **Remember**: The competitive value of this project is the geospatial routing logic and real-time user experience — not the CMS layer. Joomla solves the "website" problem so development effort focuses on the data product.

*Last updated: 2026-04-26*