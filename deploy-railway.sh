#!/bin/bash

# VelocityMesh Railway Deployment Script
echo "🚀 Deploying VelocityMesh to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Login to Railway
echo "🔐 Logging into Railway..."
railway login

# Create new project
echo "📋 Creating Railway project..."
railway project new velocitymesh-platform

# Add PostgreSQL
echo "🐘 Adding PostgreSQL database..."
railway add postgresql

# Add Redis
echo "📮 Adding Redis cache..."
railway add redis

# Set environment variables
echo "🔧 Setting environment variables..."
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set JWT_SECRET=$(openssl rand -hex 32)
railway variables set SESSION_SECRET=$(openssl rand -hex 32)
railway variables set ENCRYPTION_KEY=$(openssl rand -hex 32)

# Deploy
echo "🚀 Deploying application..."
railway up --detach

# Get deployment URL
echo "🌐 Getting deployment URL..."
URL=$(railway domain)

echo ""
echo "✅ Deployment complete!"
echo "🌐 Your app is live at: $URL"
echo "📊 Railway dashboard: https://railway.app/dashboard"
echo ""
echo "📝 Next steps:"
echo "  1. Visit your app: $URL"
echo "  2. Configure custom domain (optional)"
echo "  3. Set up monitoring and alerts"
echo "  4. Add Stripe keys for payments"