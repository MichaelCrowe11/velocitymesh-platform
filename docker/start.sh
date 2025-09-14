#!/bin/bash

# VelocityMesh Platform Startup Script
set -e

echo "🚀 Starting VelocityMesh Platform..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
while ! pg_isready -h "${DATABASE_HOST:-postgres}" -p "${DATABASE_PORT:-5432}" -q; do
  echo "Database is unavailable - sleeping"
  sleep 1
done
echo "✅ Database is ready!"

# Wait for Redis to be ready  
echo "⏳ Waiting for Redis connection..."
while ! redis-cli -h "${REDIS_HOST:-redis}" -p "${REDIS_PORT:-6379}" ping > /dev/null 2>&1; do
  echo "Redis is unavailable - sleeping"
  sleep 1
done
echo "✅ Redis is ready!"

# Run database migrations
echo "📦 Running database migrations..."
cd /app/backend
npx prisma migrate deploy
echo "✅ Database migrations completed!"

# Seed database if needed
if [ "$SEED_DATABASE" = "true" ]; then
  echo "🌱 Seeding database..."
  npx prisma db seed
  echo "✅ Database seeded!"
fi

# Start services with supervisor
echo "🎯 Starting all services..."
exec supervisord -c /etc/supervisord.conf