# Joomla + PostgreSQL/PostGIS + NestJS Stack

A production-ready stack combining Joomla as a content/promo website with a high-performance geospatial API backend.

## Architecture

```
Browser
  ↓
Joomla (PHP) — file cache for static content (articles, pages)
  ↓
NestJS API — Redis cache for routes, prices, geo queries
  ↓
PostgreSQL + PostGIS — single database for both Joomla CMS and geospatial data
  ↓
Redis — shared fast cache layer
```

### Why This Stack

| Layer | Technology | Reason |
|---|---|---|
| CMS | Joomla 6 | Ready-made blog, SEO, user management, payment extensions, non-technical editor friendly |
| CMS Database | MySQL 8.0 | Joomla owns it entirely — CMS tables, sessions, users, content |
| App Database | PostgreSQL 15 + PostGIS | Owned entirely by NestJS — geo data, routes, business logic tables |
| API Server | NestJS (Node.js + PNPM) | Fast, typed, modular — handles all business logic between Joomla and PostgreSQL |
| Cache | Redis 7 | Shared cache for pre-calculated routes, prices, and real-time geo queries across scaled NestJS instances |

### What Each Layer Caches

- **Joomla file cache** — static content: articles, blog posts, pages (long TTL)
- **Redis via NestJS** — dynamic data: nearest locations (2 min TTL), pre-calculated routes and prices (1 hour TTL)

## Project Structure

```
.
├── docker-compose.yml
├── README.md
└── api/                          # NestJS API server
    ├── Dockerfile
    ├── nest-cli.json
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── main.ts
        ├── app.module.ts
        ├── database.service.ts   # pg Pool wrapper
        ├── health/               # GET /api/health
        │   ├── health.module.ts
        │   └── health.controller.ts
        └── locations/            # GET /api/locations/*
            ├── locations.module.ts
            ├── locations.controller.ts
            └── locations.service.ts
```

## Services

| Service | Container | Port | Description |
|---|---|---|---|
| Joomla | `joomla-app` | `8080` | CMS frontend and admin panel |
| MySQL | `joomla-db` | internal | Joomla CMS database — owned entirely by Joomla |
| PostgreSQL + PostGIS | `joomla-pg` | internal | App database — owned entirely by NestJS |
| NestJS API | `joomla-api` | `3000` | REST API, business logic, geo queries |
| Redis | `joomla-redis` | internal | Cache for API responses |

## API Endpoints

Swagger UI is available at http://localhost:3000/api/docs when the stack is running.

### Health
```
GET /api/health
```
Returns service status and timestamp.

### Nearest Locations
```
GET /api/locations/nearest?lat=50.45&lon=30.52&limit=10
```
Returns nearest locations to given coordinates using PostGIS KNN index (`<->` operator). Results cached in Redis for 2 minutes.

### Route & Price
```
GET /api/locations/route?from=1&to=5
```
Returns pre-calculated route distance, duration and price between two location IDs. Cached in Redis for 1 hour.

## Getting Started

### Prerequisites
- Docker
- Docker Compose v2

### Run

```bash
docker compose down -v   # clean up old volumes if switching from MySQL
docker compose up
```

- Joomla admin: http://localhost:8080/administrator
- NestJS API: http://localhost:3000/api/health
- Swagger UI: http://localhost:3000/api/docs

### First Run — Joomla Setup

On first run, visit http://localhost:8080 and complete the Joomla web installer:

- **Database Type:** `MySQLi`
- **Database Host:** `mysql`
- **Database Name:** `joomladb`
- **Database User:** `joomlauser`
- **Database Password:** `secretpassword`

### PostgreSQL Schema Example

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE locations (
  id      SERIAL PRIMARY KEY,
  name    TEXT NOT NULL,
  address TEXT,
  coords  GEOMETRY(Point, 4326) NOT NULL
);

CREATE INDEX locations_coords_gist ON locations USING GIST (coords);

CREATE TABLE routes (
  id           SERIAL PRIMARY KEY,
  from_id      INT REFERENCES locations(id),
  to_id        INT REFERENCES locations(id),
  distance_km  NUMERIC(8,2),
  duration_min INT,
  price        NUMERIC(10,2)
);
```

## Environment Variables

### NestJS API (`api` service)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `REDIS_HOST` | `redis` | Redis hostname |
| `PORT` | `3000` | API listen port |
| `NODE_ENV` | `development` | Node environment |

## Scaling

The stack is designed for horizontal scaling:

- Multiple NestJS instances share the same Redis cache — no stale data between instances
- PostgreSQL handles concurrent reads efficiently with GiST indexes
- Joomla can be scaled behind a load balancer with shared `joomla_data` volume or S3-backed media

## Tech Decisions

**Why separate databases?**
Joomla treats its database as fully owned — it runs migrations, creates and drops tables, and assumes full control. Mixing business data into the same database risks accidental data loss on Joomla reinstall, schema conflicts, and unclear ownership. MySQL handles Joomla's simple OLTP patterns well. PostgreSQL + PostGIS is tuned exclusively for geospatial workloads. Each database is independently scalable, backupable, and replaceable.

**Why Redis over Joomla cache for geo data?**
Joomla's file cache is not suitable for real-time or frequently updated data. Redis provides fine-grained TTL control per query type, is shared across scaled instances, and can be invalidated programmatically from NestJS when underlying data changes.

**Why Joomla over a custom frontend (Next.js/Astro)?**
Joomla provides a production-ready blog, SEO tooling, user management, payment extensions, and a non-technical editor interface out of the box. The competitive value of this project is the geospatial routing logic — not the CMS layer. Joomla handles the "website" problem so development effort focuses on the data product.
