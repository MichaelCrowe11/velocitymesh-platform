#!/bin/bash

# VelocityMesh Fly.io Deployment Script
# Usage: ./deploy-to-fly.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}
APP_NAME="velocitymesh-platform"

echo "🚀 Deploying VelocityMesh to Fly.io ($ENVIRONMENT)"

# Check if fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo "❌ Fly CLI not found. Installing..."
    curl -L https://fly.io/install.sh | sh
    export PATH="$HOME/.fly/bin:$PATH"
fi

# Authenticate with Fly.io
echo "📝 Checking Fly.io authentication..."
fly auth whoami || fly auth login

# Launch app if it doesn't exist
if ! fly apps list | grep -q "$APP_NAME"; then
    echo "📦 Creating Fly.io app..."
    fly launch --name "$APP_NAME" --region iad --no-deploy --yes
fi

# Set up PostgreSQL if not exists
if ! fly postgres list | grep -q "${APP_NAME}-db"; then
    echo "🐘 Creating PostgreSQL database..."
    fly postgres create --name "${APP_NAME}-db" --region iad --initial-cluster-size 1 --vm-size shared-cpu-1x --volume-size 10
    fly postgres attach "${APP_NAME}-db" --app "$APP_NAME"
fi

# Set up Redis if not exists
if ! fly redis list 2>/dev/null | grep -q "${APP_NAME}-redis"; then
    echo "📮 Creating Redis instance..."
    fly redis create --name "${APP_NAME}-redis" --region iad --no-replicas
fi

# Configure secrets
echo "🔐 Configuring secrets..."
fly secrets set \
    NODE_ENV="$ENVIRONMENT" \
    JWT_SECRET="$(openssl rand -hex 32)" \
    SESSION_SECRET="$(openssl rand -hex 32)" \
    ENCRYPTION_KEY="$(openssl rand -hex 32)" \
    --app "$APP_NAME" --stage

# Deploy based on environment
if [ "$ENVIRONMENT" = "production" ]; then
    echo "🚀 Deploying to production..."
    fly deploy --strategy bluegreen --wait-timeout 300

    # Scale for production
    fly scale count 3 --region iad
    fly scale vm shared-cpu-2x --memory 2048
else
    echo "🧪 Deploying to staging..."
    fly deploy --strategy immediate

    # Minimal resources for staging
    fly scale count 1
    fly scale vm shared-cpu-1x --memory 512
fi

# Run database migrations
echo "📊 Running database migrations..."
fly ssh console -C "cd /app && npm run db:migrate" || true

# Health check
echo "❤️ Checking deployment health..."
sleep 10
fly status --app "$APP_NAME"

# Get app URL
APP_URL=$(fly apps list | grep "$APP_NAME" | awk '{print $2}')
echo "✅ Deployment complete!"
echo "🌐 Application URL: https://${APP_NAME}.fly.dev"
echo "📊 Dashboard: https://fly.io/apps/${APP_NAME}"
echo ""
echo "📝 Next steps:"
echo "  - Monitor logs: fly logs --app $APP_NAME"
echo "  - SSH into app: fly ssh console --app $APP_NAME"
echo "  - View metrics: fly dashboard --app $APP_NAME"