# Creerlio Platform - Service Management

This directory contains scripts for managing the Creerlio Platform services.

## Available Scripts

### 🚀 Start Services
```bash
./scripts/start-services.sh
```
Starts both backend and frontend services in the background. Services will continue running even if you close the terminal.

**Features:**
- Sets port visibility to public automatically
- Cleans up any existing processes
- Starts backend on port 5007
- Starts frontend on port 3000
- Waits for services to be ready
- Shows service URLs and process IDs

### 🛑 Stop Services
```bash
./scripts/stop-services.sh
```
Stops all running services (frontend and backend).

### 📊 Check Status
```bash
./scripts/check-status.sh
```
Shows the current status of all services, including:
- Running/stopped status
- Process IDs
- Service URLs
- Log file locations

### 🔄 Restart Services
```bash
./scripts/stop-services.sh && ./scripts/start-services.sh
```

## Viewing Logs

### Backend logs:
```bash
tail -f /tmp/backend.log
```

### Frontend logs:
```bash
tail -f /tmp/frontend.log
```

## Automatic Startup

Services are configured to start automatically when the Codespace is created or restarted via the `postStartCommand` in `.devcontainer/devcontainer.json`.

## Port Configuration

Ports are automatically set to:
- **3000**: Frontend (Next.js)
- **5007**: Backend API (.NET)
- **5088**: Backend HTTPS (if needed)

All ports are configured as:
- ✅ Public visibility
- ✅ Silent auto-forward (no popups)
- ✅ Persistent across restarts

## Troubleshooting

### Services won't start
1. Check if ports are in use: `lsof -i :3000 -i :5007`
2. Stop services and restart: `./scripts/stop-services.sh && ./scripts/start-services.sh`
3. Check logs for errors

### Ports keep asking for permission
This is a GitHub Codespaces security feature. The scripts automatically set ports to public, but you may still need to click "Allow" once per session.

### Services stopped unexpectedly
Check the logs:
```bash
tail -100 /tmp/backend.log
tail -100 /tmp/frontend.log
```

## Manual Service Management

### Start backend only:
```bash
cd backend/Creerlio.Api
dotnet run --urls "http://0.0.0.0:5007"
```

### Start frontend only:
```bash
cd frontend/frontend-app
npm run dev -- --port 3000 --hostname 0.0.0.0
```
