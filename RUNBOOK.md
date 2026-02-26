# Blimp — Operational Runbook

This document covers common incidents, debugging procedures, escalation paths, and recovery steps for the Blimp ITAM platform.

---

## 1. Health Check Failures

### Symptoms
- Load balancer reports backend unhealthy
- `/health` returns `503` or times out

### Diagnosis
```bash
# Check health endpoint directly
curl -s http://localhost:4000/health | jq .

# Check readiness
curl -s http://localhost:4000/ready | jq .

# Check container status
docker compose ps
docker compose logs --tail=50 server
```

### Common Causes & Fixes

| Cause | Fix |
|-------|-----|
| Database unreachable | Check `docker compose logs db`, verify `DATABASE_URL` |
| Server OOM-killed | Check `docker inspect <container>` for OOMKilled, increase memory limit in `docker-compose.yml` |
| Port conflict | Check `lsof -i :4000`, stop conflicting process |
| Prisma connection pool exhausted | Restart server: `docker compose restart server` |

---

## 2. Database Issues

### Connection Refused
```bash
# Verify DB container is running
docker compose ps db

# Check DB logs
docker compose logs --tail=100 db

# Test connectivity manually
docker compose exec db pg_isready -U blimp

# If DB won't start, check disk space
df -h
docker system df
```

### Slow Queries
```bash
# Connect to the database
docker compose exec db psql -U blimp -d blimp

# Find slow queries (requires pg_stat_statements)
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

# Check for table bloat
SELECT schemaname, tablename, n_dead_tup, n_live_tup
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

# Run VACUUM if needed
VACUUM ANALYZE;
```

### Database Backup & Restore
```bash
# Manual backup
docker compose exec db pg_dump -U blimp -d blimp --format=custom -f /tmp/backup.dump
docker compose cp db:/tmp/backup.dump ./backup-$(date +%Y%m%d).dump

# Restore from backup
docker compose cp ./backup-20260225.dump db:/tmp/restore.dump
docker compose exec db pg_restore -U blimp -d blimp --clean --if-exists /tmp/restore.dump
```

---

## 3. Application Errors

### 500 Internal Server Errors
```bash
# Check server logs for stack traces
docker compose logs --tail=200 server | grep -A5 "Error"

# Common causes:
# 1. Missing ENCRYPTION_KEY -> integration routes fail
# 2. Prisma schema drift -> run migrations
# 3. Invalid data in DB -> check error details
```

### Authentication Failures
```bash
# Check if JWT_SECRET is set
docker compose exec server printenv JWT_SECRET

# Verify user exists in DB
docker compose exec db psql -U blimp -d blimp -c "SELECT id, email, role FROM \"User\";"

# If JWT_SECRET changed, all existing sessions are invalid
# Users must re-login — this is expected behavior
```

### Integration Sync Failures
```bash
# Check sync result in DB
docker compose exec db psql -U blimp -d blimp -c "SELECT id, name, status, \"lastSync\" FROM \"Integration\";"

# Check for encryption key issues
docker compose logs server | grep "encryption"

# Re-trigger sync via API
curl -X POST http://localhost:4000/integrations/intune/sync \
  -H "Authorization: Bearer <admin-jwt-token>"
```

---

## 4. Performance Issues

### High Memory Usage
```bash
# Check container resource usage
docker stats --no-stream

# If server memory is high, check for:
# 1. Large sync payloads (1000+ devices)
# 2. Unpaginated queries
# 3. Memory leaks in long-running connections

# Restart as immediate mitigation
docker compose restart server
```

### Slow API Responses
```bash
# Check if it's a DB issue
docker compose exec db psql -U blimp -d blimp -c "SELECT count(*) FROM \"Asset\";"

# Check indexes exist
docker compose exec db psql -U blimp -d blimp -c "\di"

# If tables are large and queries slow, verify indexes:
# Asset: detectionSource, serial
# App: renewalDate
# Person: email
```

### Frontend Loading Slowly
```bash
# Check nginx is serving compressed assets
curl -sI -H "Accept-Encoding: gzip, br" http://localhost/ | grep -i content-encoding

# Verify static asset caching headers
curl -sI http://localhost/assets/index-*.js | grep -i cache-control

# Check bundle size
ls -lh dist/assets/*.js
```

---

## 5. Docker & Infrastructure

### Container Won't Start
```bash
# Check logs
docker compose logs <service-name>

# Rebuild from scratch
docker compose down
docker compose build --no-cache
docker compose up -d

# Check for port conflicts
docker compose config | grep ports
```

### Disk Space Full
```bash
# Check disk usage
df -h
docker system df

# Clean up Docker resources
docker system prune -f          # Remove stopped containers, unused networks
docker image prune -a -f        # Remove unused images
docker volume prune -f          # Remove unused volumes (CAUTION: may delete data)

# Check DB size
docker compose exec db psql -U blimp -d blimp -c "SELECT pg_size_pretty(pg_database_size('blimp'));"
```

### SSL Certificate Expiry
```bash
# Check certificate expiry (if using Let's Encrypt)
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com < /dev/null 2>/dev/null | openssl x509 -noout -dates

# Renew with certbot
certbot renew --dry-run    # Test first
certbot renew              # Actual renewal
```

---

## 6. Escalation Paths

| Severity | Response Time | Who to Contact | Action |
|----------|---------------|----------------|--------|
| **P1 — Outage** (service down, data loss risk) | Immediate | On-call engineer + Team lead | Restore service, then investigate |
| **P2 — Degraded** (slow, partial functionality) | < 1 hour | On-call engineer | Diagnose, apply fix or restart |
| **P3 — Bug** (non-critical feature broken) | < 1 business day | Engineering team | File issue, schedule fix |
| **P4 — Enhancement** (improvement request) | Sprint planning | Product + Engineering | Prioritize in backlog |

---

## 7. Recovery Procedures

### Full Service Recovery
```bash
# 1. Check all containers
docker compose ps

# 2. Check database connectivity
docker compose exec db pg_isready -U blimp

# 3. Check application health
curl -s http://localhost:4000/health | jq .

# 4. If database is corrupt, restore from backup
docker compose down
docker compose up -d db
# Wait for DB to be ready
docker compose exec db pg_isready -U blimp
docker compose exec db pg_restore -U blimp -d blimp --clean /tmp/latest.dump
docker compose up -d

# 5. Verify recovery
curl -s http://localhost:4000/health | jq .
```

### Rolling Back a Bad Deployment
```bash
# 1. Identify the last known good image tag
docker compose logs server | head -5   # Check current version

# 2. Update docker-compose.yml to pin the previous image tag
# image: ghcr.io/gerritbandison/blimp-server:previous-tag

# 3. Pull and restart
docker compose pull server
docker compose up -d server

# 4. Verify
curl -s http://localhost:4000/health | jq .
```

### Database Migration Rollback
```bash
# Check current migration status
docker compose exec server npx prisma migrate status

# If a bad migration was applied, restore DB from pre-migration backup
# Prisma does not support automatic rollback, so backups are critical
```

---

## 8. Monitoring Checklist

Run these checks regularly (daily or via automated monitoring):

- [ ] `GET /health` returns `200` with `status: "ok"`
- [ ] `GET /ready` returns `200` with `ready: true`
- [ ] Docker containers are running: `docker compose ps`
- [ ] Disk usage is below 80%: `df -h`
- [ ] Database connections are not exhausted
- [ ] No error spikes in server logs: `docker compose logs --since=1h server | grep -c Error`
- [ ] SSL certificate has > 14 days before expiry
- [ ] Backup jobs completed successfully
