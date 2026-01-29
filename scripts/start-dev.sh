#!/bin/bash

# TrustBridge Development Startup Script
# Starts both backend and frontend servers

echo "🚀 Starting TrustBridge Development Environment..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Kill existing processes
echo "Stopping any existing servers..."
lsof -ti :3000 | xargs kill -9 2>/dev/null
lsof -ti :5173 | xargs kill -9 2>/dev/null
sleep 1

# Start backend
echo -e "${GREEN}Starting Backend (port 3000)...${NC}"
cd ~/trustbridge-backend
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
echo -e "${GREEN}Starting Frontend (port 5173)...${NC}"
cd ~/trustbridge-frontend
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 3

echo ""
echo "=========================================="
echo -e "${GREEN}✅ TrustBridge is running!${NC}"
echo "=========================================="
echo ""
echo "  Frontend:  http://localhost:5173"
echo "  Backend:   http://localhost:3000"
echo "  Health:    http://localhost:3000/api/health"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""

# Wait for interrupt
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT
wait
