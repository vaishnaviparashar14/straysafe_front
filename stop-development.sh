#!/bin/bash

echo "🛑 Stopping StraySafe Development Environment"
echo "============================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Stop backend server
if [ -f .backend.pid ]; then
    BACKEND_PID=$(cat .backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        print_status "Stopping backend server (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
    fi
    rm .backend.pid
else
    print_status "Stopping any running backend processes..."
    pkill -f "node.*server.js" 2>/dev/null || true
fi

# Stop frontend server
if [ -f .frontend.pid ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        print_status "Stopping frontend server (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
    fi
    rm .frontend.pid
else
    print_status "Stopping any running frontend processes..."
    pkill -f "vite" 2>/dev/null || true
fi

# Stop Docker containers if they're running
if command -v docker &> /dev/null; then
    if [ -f backend/docker-compose.yml ]; then
        print_status "Stopping Docker containers..."
        cd backend && docker-compose down && cd ..
    fi
fi

print_status "✅ All development services stopped!"
echo ""
echo "💡 To start again, run: ./start-development.sh"