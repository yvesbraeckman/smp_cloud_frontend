# Smart Parcel Wall — Cloud Frontend

Cloud management dashboard for the **Smart Parcel Wall** system — a network of smart locker walls installed in residential buildings. This frontend lets administrators monitor locker fleet occupancy, remotely control individual lockers, manage residents, review audit logs, and configure system settings. It serves as the control layer for a Digital Twin architecture and connects to the [Smart Parcel Wall Backend](https://github.com/yvesbraeckman/smp_cloud_backend).

## Key Features

- **Authentication** — Secure login, password reset, and route protection via Angular Guards and HTTP Interceptors (JWT Bearer tokens).
- **Fleet Overview** — Real-time dashboard showing KPIs (parcels today, active walls, offline locations, open errors) and a filterable list of all connected locker walls.
- **Wall Detail** — Dynamic grid view of a specific wall's lockers with remote control actions (force unlock, service mode toggle).
- **Resident Management** — Paginated list of residents linked to locker walls, with create, update, delete, and credential generation.
- **Audit Logs** — Filterable system log for tracing hardware alarms, deliveries, pickups, and admin actions, with CSV export.
- **Settings** — Admin profile and password management.

## Tech Stack

| Layer        | Technology                               |
| ------------ | ---------------------------------------- |
| Framework    | Angular 21 (Standalone Components)       |
| Language     | TypeScript 5.9 (strict mode)             |
| Styling      | SCSS                                     |
| State & Data | RxJS 7.8, Angular HttpClient             |
| Auth         | JWT + HTTP Interceptor + AuthGuard       |
| Testing      | Vitest + JSDOM                           |
| Formatting   | Prettier (single quotes, 100 char width) |
| Container    | Docker (Node 20 Alpine)                  |
| Package Mgr  | npm 10.9                                 |

## Project Structure

```
src/app/
├── app.config.ts & app.routes.ts   # Standalone bootstrap & routing
├── guards/
│   └── auth.guard.ts               # Protects routes from unauthenticated access
├── interceptors/
│   └── auth.interceptor.ts         # Attaches JWT token; auto-logout on 401
├── models/
│   └── fleet.model.ts              # Shared TypeScript interfaces
├── pages/                          # Smart components / pages
│   ├── fleet-overview/             # Main dashboard (KPIs & wall cards)
│   ├── login/                      # Login page
│   ├── logs-comp/                  # Audit log viewer & export
│   ├── not-found/                  # Custom 404
│   ├── reset-password/             # Password reset
│   ├── residents-comp/             # Resident management
│   ├── settings-comp/              # Admin settings
│   ├── sidebar/                    # Main navigation
│   └── wall-detail-comp/          # Per-wall locker grid & controls
└── services/
    ├── auth.ts                     # Auth state & session management
    └── fleet.ts                    # API communication with backend
```

## Prerequisites

- **Node.js** 20 or later
- **npm** 10.9 or later
- **Angular CLI** 21 (installed locally via `npm install`)

## Basic Usage

### Development

```bash
# Install dependencies
npm install

# Start the dev server (http://localhost:4200)
npm start

# Run unit tests
npm test

# Production build
npm run build
```

The dev server proxies all `/api` requests to `http://backend-api:8000` (configurable in `proxy.conf.json`).

### Docker

```bash
# Build and run with Docker
docker build -t smartwall-frontend .
docker run -p 4200:4200 smartwall-frontend
```

### Connecting to the Backend

This frontend expects the backend API to be available at `/api`. In development, requests are proxied via `proxy.conf.json`. In production, configure a reverse proxy (e.g., Nginx) to route `/api` to the FastAPI backend running on port 8000.
