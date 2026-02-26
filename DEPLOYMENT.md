# Blimp — Deployment Guide

## Prerequisites

- Docker 24+ and Docker Compose v2
- PostgreSQL 16 (or use the included Docker container)
- Node.js 22+ (for local development only)
- A domain name with DNS pointing to your server
- SSL certificate (Let's Encrypt recommended)

## Quick Start (Docker Compose)

```bash
# 1. Clone the repository
git clone https://github.com/Gerritbandison/Blimp.git
cd Blimp

# 2. Create environment file
cp server/.env.example .env.docker

# 3. Generate required secrets
#    Edit .env.docker and set:
export POSTGRES_PASSWORD=$(openssl rand -base64 32)
export JWT_SECRET=$(openssl rand -hex 32)
export ENCRYPTION_KEY=$(openssl rand -hex 32)

# 4. Start all services
docker compose --env-file .env.docker up -d

# 5. Create the first admin user (one-time setup)
docker compose exec server node -e "
  const bcrypt = require('bcrypt');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  (async () => {
    const hash = await bcrypt.hash('CHANGE_ME_PASSWORD', 12);
    await prisma.user.create({
      data: { email: 'admin@yourcompany.com', name: 'Admin', passwordHash: hash, role: 'Admin' }
    });
    console.log('Admin user created');
    await prisma.\$disconnect();
  })();
"
```

## Environment Variables

### Required (Production)

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_PASSWORD` | Database password | Random 32+ chars |
| `JWT_SECRET` | JWT signing key (64+ hex chars) | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | AES-256 key for credential encryption (64 hex chars) | `openssl rand -hex 32` |
| `CORS_ORIGIN` | Frontend URL for CORS | `https://blimp.yourcompany.com` |
| `NODE_ENV` | Must be `production` | `production` |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_EXPIRES_IN` | `8h` | JWT token lifetime |
| `PORT` | `3001` | Backend server port |
| `UPLOAD_DIR` | `./uploads` | File upload storage path |
| `VITE_APP_NAME` | `Blimp` | Application display name |
| `VITE_API_BASE_URL` | *(empty)* | Backend URL for frontend API calls |
| `VITE_DEMO_MODE` | *(empty)* | Set to `true` to enable demo login |

## SSL/TLS Configuration

### Option A: Reverse Proxy (Recommended)

Place nginx, Caddy, or Traefik in front of the Docker stack:

```nginx
# /etc/nginx/sites-available/blimp
server {
    listen 443 ssl http2;
    server_name blimp.yourcompany.com;

    ssl_certificate /etc/letsencrypt/live/blimp.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/blimp.yourcompany.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name blimp.yourcompany.com;
    return 301 https://$host$request_uri;
}
```

### Option B: Cloud Load Balancer

Use AWS ALB, GCP Load Balancer, or Cloudflare to terminate TLS upstream.

## Database Management

### Migrations

Migrations run automatically on container start (`prisma migrate deploy`).

To create a new migration during development:
```bash
cd server
npx prisma migrate dev --name describe_your_change
```

### Backups

```bash
# Manual backup
docker compose exec db pg_dump -U blimp blimp > backup_$(date +%Y%m%d).sql

# Restore
docker compose exec -T db psql -U blimp blimp < backup_20260226.sql
```

For automated backups, add a cron job:
```bash
# /etc/cron.d/blimp-backup (daily at 2am)
0 2 * * * root docker compose -f /path/to/docker-compose.yml exec -T db pg_dump -U blimp blimp | gzip > /backups/blimp_$(date +\%Y\%m\%d).sql.gz
```

### Retention

Keep at least 7 daily backups and 4 weekly backups. Test restores monthly.

## Health Checks

| Endpoint | Purpose | Expected Response |
|----------|---------|-------------------|
| `GET /health` | Liveness + DB check | `200 { status: "ok", checks: { database: "ok" } }` |
| `GET /ready` | Readiness probe | `200 { ready: true }` |
| `GET /` (frontend) | Nginx liveness | `200` HTML page |

## Monitoring

### Recommended Setup

1. **Uptime monitoring**: Point UptimeRobot or Pingdom at `/health`
2. **Error tracking**: Add Sentry DSN to both frontend and backend
3. **Log aggregation**: Docker JSON logs can be shipped to Loki, ELK, or CloudWatch

### Docker Log Access

```bash
# View backend logs
docker compose logs -f server

# View last 100 lines from all services
docker compose logs --tail=100
```

## Updating

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose --env-file .env.docker up -d --build

# Migrations run automatically on server start
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Server exits with FATAL: JWT_SECRET | Set JWT_SECRET to a 64+ char hex string in .env.docker |
| Server exits with FATAL: ENCRYPTION_KEY | Set ENCRYPTION_KEY to a 64-char hex string |
| Health returns `degraded` | Check DB connectivity: `docker compose logs db` |
| 502 Bad Gateway | Backend hasn't started yet — check `docker compose logs server` |
| CORS errors in browser | Set `CORS_ORIGIN` to match your frontend URL exactly |
