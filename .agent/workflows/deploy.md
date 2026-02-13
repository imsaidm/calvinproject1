---
description: How to deploy code changes to the Hostinger VPS production server
---

# Deploy to VPS Server

// turbo-all

## Server Details
- **VPS IP**: `72.60.225.27`
- **SSH**: `ssh root@72.60.225.27`
- **Password**: `#Cshclaude69`
- **Git repo on VPS**: `/docker/calvinproject1/_repo`
- **Docker project on VPS**: `/docker/calvinproject1`
- **Docker Compose**: `/docker/calvinproject1/docker-compose.yml`

## Deployment Steps

### 1. Push changes to GitHub from local machine
```bash
cd c:\Users\abdul\OneDrive\Desktop\KerjaanCalvin\Kerjaan0702
git add -A && git commit -m "description of changes" && git push
```

### 2. SSH into VPS and deploy

Run this single command to pull, copy files, rebuild, and restart:

```bash
ssh -o StrictHostKeyChecking=no root@72.60.225.27 "cd /docker/calvinproject1/_repo && git pull origin main && cp -r RemotionProject/src/ /docker/calvinproject1/RemotionProject/src/ && cp -r RemotionProject/scripts/ /docker/calvinproject1/RemotionProject/scripts/ && cd /docker/calvinproject1 && docker compose build --no-cache video-engine 2>&1 | tail -5 && docker compose up -d video-engine 2>&1"
```

When prompted for password, enter: `#Cshclaude69`

### 3. If web-ui (frontend) also changed, rebuild that too:

```bash
ssh -o StrictHostKeyChecking=no root@72.60.225.27 "cd /docker/calvinproject1/_repo && cp -r web-ui/ /docker/calvinproject1/web-ui/ && cd /docker/calvinproject1 && docker compose build --no-cache web-dashboard 2>&1 | tail -5 && docker compose up -d web-dashboard 2>&1"
```

### 4. Verify deployment

```bash
ssh -o StrictHostKeyChecking=no root@72.60.225.27 "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
```

Check that `csh-video-engine` and `csh-web-dashboard` are running.

## Important Notes

- The VPS has a **separate git repo clone** at `/docker/calvinproject1/_repo` which is used to pull code
- Files are **copied** from `_repo` into the Docker project directory at `/docker/calvinproject1/`
- Only rebuild the container(s) whose code changed:
  - Backend changes → rebuild `video-engine`
  - Frontend changes → rebuild `web-dashboard`
  - Both changed → rebuild both
- The `--no-cache` flag ensures a clean rebuild
- Docker volumes persist video outputs and assets between rebuilds

## Quick Reference — What to rebuild

| Files Changed | Rebuild Command |
|---|---|
| `RemotionProject/src/*` | `docker compose build --no-cache video-engine && docker compose up -d video-engine` |
| `web-ui/src/*` | `docker compose build --no-cache web-dashboard && docker compose up -d web-dashboard` |
| `docker-compose.yml` | `docker compose up -d` |
| `.env` | `docker compose up -d` (restart picks up env changes) |
