#!/bin/bash

# HATOD Deployment Script
# This script helps deploy your application to various platforms

set -e

echo "🚀 HATOD Deployment Script"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."

    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi

    print_success "Dependencies check passed"
}

# Setup environment variables
setup_env() {
    print_status "Setting up environment variables..."

    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from template..."
        cp api/.env.example .env
        print_warning "Please edit .env file with your actual values before deploying!"
        exit 1
    fi

    # Validate required environment variables
    if ! grep -q "DATABASE_URL=" .env; then
        print_error "DATABASE_URL not found in .env file"
        exit 1
    fi

    if ! grep -q "JWT_SECRET=" .env; then
        print_error "JWT_SECRET not found in .env file"
        exit 1
    fi

    print_success "Environment variables configured"
}

# Deploy to Vercel
deploy_vercel() {
    print_status "Deploying to Vercel..."

    if ! command -v vercel &> /dev/null; then
        print_status "Installing Vercel CLI..."
        npm install -g vercel
    fi

    # Deploy API
    print_status "Deploying API to Vercel..."
    cd api
    vercel --prod
    API_URL=$(vercel --prod 2>/dev/null | grep -o 'https://[^ ]*')

    # Deploy Frontend
    print_status "Deploying Frontend to Vercel..."
    cd ..
    # Update API URL in frontend
    sed -i.bak "s|const API_BASE_URL = .*|const API_BASE_URL = '$API_URL/api';|" pages/login.html
    vercel --prod

    print_success "Vercel deployment completed!"
    print_status "API URL: $API_URL"
}

# Deploy to Railway
deploy_railway() {
    print_status "Deploying to Railway..."

    if ! command -v railway &> /dev/null; then
        print_status "Installing Railway CLI..."
        npm install -g @railway/cli
    fi

    if ! railway status &> /dev/null; then
        print_warning "Please login to Railway first:"
        railway login
    fi

    # Deploy API
    print_status "Deploying API to Railway..."
    cd api
    railway init --name hatod-api --source . --language node
    railway up

    # Deploy Frontend
    print_status "Deploying Frontend to Railway..."
    cd ..
    railway init --name hatod-frontend --source . --language static
    railway up

    print_success "Railway deployment completed!"
}

# Deploy with Docker
deploy_docker() {
    print_status "Deploying with Docker..."

    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    print_status "Building and starting services..."
    docker-compose up --build -d

    print_success "Docker deployment completed!"
    print_status "Frontend: http://localhost:8080"
    print_status "API: http://localhost:4000"
}

# Test deployment
test_deployment() {
    print_status "Testing deployment..."

    # Wait for services to start
    sleep 10

    # Test API health
    if curl -f http://localhost:4000/health &> /dev/null; then
        print_success "API health check passed"
    else
        print_error "API health check failed"
    fi

    # Test frontend
    if curl -f http://localhost:8080 &> /dev/null; then
        print_success "Frontend serving correctly"
    else
        print_error "Frontend not accessible"
    fi
}

# Main menu
show_menu() {
    echo
    echo "Select deployment option:"
    echo "1) Vercel (Recommended for beginners)"
    echo "2) Railway (Full-stack platform)"
    echo "3) Docker (Local development)"
    echo "4) Test current deployment"
    echo "5) Exit"
    echo
    read -p "Enter your choice (1-5): " choice

    case $choice in
        1)
            check_dependencies
            setup_env
            deploy_vercel
            ;;
        2)
            check_dependencies
            setup_env
            deploy_railway
            ;;
        3)
            check_dependencies
            setup_env
            deploy_docker
            test_deployment
            ;;
        4)
            test_deployment
            ;;
        5)
            print_status "Goodbye!"
            exit 0
            ;;
        *)
            print_error "Invalid option. Please choose 1-5."
            show_menu
            ;;
    esac
}

# Run main function
main() {
    echo "Welcome to HATOD Deployment Assistant"
    echo "===================================="
    echo

    # Check if .env exists
    if [ ! -f ".env" ]; then
        print_warning "No .env file found. Creating from template..."
        cp api/.env.example .env
        print_error "Please edit the .env file with your actual configuration before deploying!"
        print_status "Required variables:"
        echo "  - DATABASE_URL (your Supabase connection string)"
        echo "  - JWT_SECRET (secure random string)"
        echo "  - CORS_ORIGIN (your frontend domain)"
        exit 1
    fi

    show_menu
}

# Run the script
main "$@"