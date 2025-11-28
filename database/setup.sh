#!/bin/bash

# HATOD Database Setup Script
# This script sets up the PostgreSQL database for local development

set -e

# Configuration
DB_NAME="hatod_db"
DB_USER=${DB_USER:-$(whoami)}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

echo "🚀 Setting up HATOD database..."
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo

# Check if PostgreSQL is running
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" >/dev/null 2>&1; then
    echo "❌ PostgreSQL is not running on $DB_HOST:$DB_PORT"
    echo "Please start PostgreSQL and try again."
    exit 1
fi

# Check if database already exists
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "⚠️  Database '$DB_NAME' already exists."
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Dropping existing database..."
        dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
    else
        echo "Setup cancelled."
        exit 0
    fi
fi

# Create database
echo "📦 Creating database '$DB_NAME'..."
createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"

# Run setup script
echo "⚙️  Running database setup..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$(dirname "$0")/setup.sql"

echo
echo "✅ Database setup completed successfully!"
echo
echo "📊 Sample data created:"
echo "   Admin: admin@hatod.com"
echo "   Restaurant: mario@pizza.com"
echo "   Rider: john@rider.com"
echo "   Customer: customer@example.com"
echo
echo "🔐 Note: Passwords are dummy hashes for development only!"
echo "   Use proper password hashing in production."
echo
echo "🎯 Next steps:"
echo "   1. Set up your application environment variables"
echo "   2. Run your backend server"
echo "   3. Test the API endpoints"