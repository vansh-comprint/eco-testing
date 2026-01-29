#!/bin/bash
# EcoTribe Deployment Script
# Server: 172.20.1.228
# Frontend: port 1228 | Backend: port 2228

set -e

echo "========================================="
echo "  EcoTribe Deployment"
echo "========================================="

# --- BACKEND ---
echo ""
echo "[1/4] Setting up backend..."
cd backend

# Copy production env
cp .env.production .env

# Create virtual environment if not exists
if [ ! -d "venv" ]; then
    echo "  Creating virtual environment..."
    python3 -m venv venv
fi

# Activate and install deps
source venv/bin/activate
echo "  Installing dependencies..."
pip install -r requirements.txt --quiet

# Run migrations
echo "  Running database migrations..."
alembic upgrade head

# Create storage directories
mkdir -p storage uploads

echo "  Backend ready."
deactivate
cd ..

# --- FRONTEND ---
echo ""
echo "[2/4] Setting up frontend..."
cd frontend

# The dist/ folder should already be built with production env
# If not, rebuild:
if [ ! -d "dist" ]; then
    echo "  Building frontend..."
    npm install
    npm run build -- --mode production
fi

echo "  Frontend ready."
cd ..

# --- START SERVICES ---
echo ""
echo "[3/4] Starting backend on port 2228..."
cd backend
source venv/bin/activate
nohup uvicorn app.main:app --host 0.0.0.0 --port 2228 > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"
deactivate
cd ..

echo ""
echo "[4/4] Starting frontend on port 1228..."
cd frontend
nohup npx serve dist -s -l 1228 --no-clipboard > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"
cd ..

# Save PIDs for stop script
echo "$BACKEND_PID" > .backend.pid
echo "$FRONTEND_PID" > .frontend.pid

echo ""
echo "========================================="
echo "  Deployment Complete!"
echo "========================================="
echo "  Frontend:  http://172.20.1.228:1228"
echo "  Backend:   http://172.20.1.228:2228"
echo "  API Docs:  http://172.20.1.228:2228/docs (disabled in production)"
echo "  Health:    http://172.20.1.228:2228/health"
echo ""
echo "  Logs:"
echo "    tail -f backend.log"
echo "    tail -f frontend.log"
echo ""
echo "  Stop: ./stop.sh"
echo "========================================="
