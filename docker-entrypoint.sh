#!/bin/sh
set -e

# Set database path
DB_PATH="/usr/src/app/data/database.sqlite"

# Create database file if it doesn't exist
if [ ! -f "$DB_PATH" ]; then
    echo "Creating new database file..."
    mkdir -p $(dirname "$DB_PATH")
    touch "$DB_PATH"
    chmod 644 "$DB_PATH"
    echo "Database file created successfully at $DB_PATH"
    
    # Run migrations if migrations directory exists
    if [ -d "/usr/src/app/migrations" ]; then
        echo "Running database migrations..."
        npx sequelize-cli db:migrate
    else
        echo "No migrations directory found. Skipping migrations."
    fi
    
    # Run seeders if seeders directory exists
    if [ -d "/usr/src/app/seeders" ]; then
        echo "Seeding initial data..."
        npx sequelize-cli db:seed:all
    else
        echo "No seeders directory found. Skipping seeding."
    fi
else
    echo "Using existing database file at $DB_PATH"
    
    # Run migrations if migrations directory exists
    if [ -d "/usr/src/app/migrations" ]; then
        echo "Running database migrations..."
        npx sequelize-cli db:migrate
    else
        echo "No migrations directory found. Skipping migrations."
    fi
fi

# Start the application
echo "Starting application..."
exec npm start
