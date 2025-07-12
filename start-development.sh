#!/bin/bash

echo "🚀 Starting StraySafe Development Environment"
echo "=============================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

# Create environment file for frontend if it doesn't exist
if [ ! -f .env.local ]; then
    print_status "Creating frontend environment file..."
    echo "VITE_API_URL=http://localhost:5000/api" > .env.local
fi

# Check if backend dependencies are installed
if [ ! -d "backend/node_modules" ]; then
    print_status "Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

# Check if frontend dependencies are installed
if [ ! -d "node_modules" ]; then
    print_status "Installing frontend dependencies..."
    npm install
fi

# Check if Docker is available for database
if command -v docker &> /dev/null; then
    print_status "Starting PostgreSQL database with Docker..."
    cd backend && docker-compose up -d postgres
    
    # Wait for database to be ready
    print_status "Waiting for database to be ready..."
    sleep 5
    
    # Check if database is seeded
    if ! docker-compose exec -T postgres psql -U postgres -d straysafe_db -c "SELECT COUNT(*) FROM users;" &> /dev/null; then
        print_status "Seeding database with sample data..."
        npm run seed
    fi
    cd ..
else
    print_warning "Docker not found. Please make sure PostgreSQL is running manually."
fi

# Function to start backend
start_backend() {
    print_status "Starting backend server on port 5000..."
    cd backend
    npm run dev &
    BACKEND_PID=$!
    cd ..
    echo $BACKEND_PID > .backend.pid
}

# Function to start frontend
start_frontend() {
    print_status "Starting frontend server on port 5173..."
    npm run dev &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > .frontend.pid
}

# Start both servers
start_backend
sleep 3
start_frontend

# Wait a moment for servers to start
sleep 5

# Test backend health
print_status "Testing backend connection..."
if curl -s http://localhost:5000/api/health > /dev/null; then
    print_status "✅ Backend is running at http://localhost:5000"
else
    print_warning "⚠️  Backend might still be starting..."
fi

print_status "✅ Frontend is running at http://localhost:5173"

echo ""
echo "🎉 StraySafe Development Environment Started!"
echo ""
echo "📋 Quick Test Credentials:"
echo "   • Citizen: sarah@example.com / password123"
echo "   • NGO: contact@nycanimalrescue.org / password123"
echo "   • Admin: admin@straysafe.com / admin123"
echo ""
echo "🔗 URLs:"
echo "   • Frontend: http://localhost:5173"
echo "   • Backend API: http://localhost:5000/api"
echo "   • Database Admin: http://localhost:8080 (if Docker is used)"
echo ""
echo "🛑 To stop all services:"
echo "   • Press Ctrl+C or run: ./stop-development.sh"
echo ""

# Function to cleanup on exit
cleanup() {
    print_status "Stopping development servers..."
    if [ -f .backend.pid ]; then
        kill $(cat .backend.pid) 2>/dev/null
        rm .backend.pid
    fi
    if [ -f .frontend.pid ]; then
        kill $(cat .frontend.pid) 2>/dev/null
        rm .frontend.pid
    fi
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Keep script running
print_status "Development servers are running. Press Ctrl+C to stop."
wait