#!/bin/bash

# StraySafe Backend Setup Script
echo "🐕 StraySafe Backend Setup Script 🐱"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
check_nodejs() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js v16 or higher."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        print_error "Node.js version is too old. Please upgrade to v16 or higher."
        exit 1
    fi
    
    print_status "Node.js $(node --version) is installed"
}

# Check if PostgreSQL is installed
check_postgresql() {
    if ! command -v psql &> /dev/null; then
        print_warning "PostgreSQL is not installed locally. Using Docker Compose setup."
        USE_DOCKER=true
    else
        print_status "PostgreSQL is installed"
        USE_DOCKER=false
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        print_status "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
}

# Setup environment variables
setup_env() {
    if [ ! -f .env ]; then
        print_status "Creating .env file..."
        cp .env.example .env
        print_warning "Please update the .env file with your actual credentials"
        print_warning "Especially update the Cloudinary credentials for image uploads"
    else
        print_status ".env file already exists"
    fi
}

# Setup database with Docker
setup_database_docker() {
    print_status "Setting up database with Docker..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker and Docker Compose."
        exit 1
    fi
    
    # Start PostgreSQL container
    docker-compose up -d postgres
    
    # Wait for PostgreSQL to start
    print_status "Waiting for PostgreSQL to start..."
    sleep 10
    
    # Run database migrations
    print_status "Running database schema..."
    docker-compose exec postgres psql -U postgres -d straysafe_db -f /docker-entrypoint-initdb.d/schema.sql
    
    # Seed database
    print_status "Seeding database with sample data..."
    npm run seed
}

# Setup database locally
setup_database_local() {
    print_status "Setting up database locally..."
    
    # Create database
    print_status "Creating database..."
    createdb straysafe_db 2>/dev/null || print_warning "Database may already exist"
    
    # Run schema
    print_status "Running database schema..."
    psql -d straysafe_db -f config/schema.sql
    
    # Seed database
    print_status "Seeding database with sample data..."
    npm run seed
}

# Main setup function
main() {
    print_status "Starting StraySafe Backend setup..."
    
    # Check prerequisites
    check_nodejs
    check_postgresql
    
    # Install dependencies
    install_dependencies
    
    # Setup environment
    setup_env
    
    # Setup database
    if [ "$USE_DOCKER" = true ]; then
        setup_database_docker
    else
        setup_database_local
    fi
    
    print_status "Setup completed successfully!"
    echo ""
    echo "🎉 StraySafe Backend is ready!"
    echo ""
    echo "Next steps:"
    echo "1. Update your .env file with actual credentials"
    echo "2. Start the development server: npm run dev"
    echo "3. Visit http://localhost:5000/api/health to verify"
    echo ""
    echo "Default login credentials:"
    echo "- Admin: admin@straysafe.com / admin123"
    echo "- Citizen: sarah@example.com / password123"
    echo "- NGO: contact@nycanimalrescue.org / password123"
    echo ""
    print_status "Happy coding! 🚀"
}

# Run main function
main