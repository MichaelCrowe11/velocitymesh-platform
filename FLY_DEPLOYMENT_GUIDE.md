# VelocityMesh Fly.io Deployment Guide

## Prerequisites
- Fly.io CLI installed (`curl -L https://fly.io/install.sh | sh`)
- Fly.io account (`fly auth signup`)
- Docker installed locally
- PostgreSQL and Redis databases (can use Fly.io managed services)

## Step 1: Initialize Fly.io App

```bash
cd velocitymesh-platform
fly launch --name velocitymesh-app --region iad
```

## Step 2: Set Up Database Services

### PostgreSQL Database
```bash
fly postgres create --name velocitymesh-db --region iad
fly postgres attach velocitymesh-db --app velocitymesh-app
```

### Redis Cache
```bash
fly redis create --name velocitymesh-redis --region iad
```

## Step 3: Configure Secrets

```bash
# Database
fly secrets set DATABASE_URL="postgresql://..." --app velocitymesh-app

# Redis
fly secrets set REDIS_URL="redis://..." --app velocitymesh-app

# Auth & Security
fly secrets set JWT_SECRET="$(openssl rand -hex 32)" --app velocitymesh-app
fly secrets set SESSION_SECRET="$(openssl rand -hex 32)" --app velocitymesh-app

# Stripe
fly secrets set STRIPE_SECRET_KEY="sk_live_..." --app velocitymesh-app
fly secrets set STRIPE_WEBHOOK_SECRET="whsec_..." --app velocitymesh-app

# AI Services
fly secrets set OPENAI_API_KEY="sk-..." --app velocitymesh-app

# Email
fly secrets set SENDGRID_API_KEY="SG...." --app velocitymesh-app
```

## Step 4: Deploy Application

```bash
# Deploy the main application
fly deploy --app velocitymesh-app

# Scale for production
fly scale vm shared-cpu-2x --memory 512 --app velocitymesh-app
fly scale count 2 --app velocitymesh-app
```

## Step 5: Set Up Custom Domain

```bash
# Add custom domain
fly certs add velocitymesh.com --app velocitymesh-app

# Show DNS records to configure
fly certs show velocitymesh.com --app velocitymesh-app
```

## Step 6: Monitoring & Logs

```bash
# View logs
fly logs --app velocitymesh-app

# Monitor metrics
fly dashboard metrics --app velocitymesh-app

# SSH into container
fly ssh console --app velocitymesh-app
```

## Architecture on Fly.io

### Multi-Region Deployment
```toml
# fly.toml regions configuration
[regions]
primary = "iad"  # Primary region
fallbacks = ["ord", "sea"]  # Fallback regions
```

### Auto-Scaling Configuration
```toml
[[services]]
  internal_port = 3000
  protocol = "tcp"
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1

  [services.concurrency]
    type = "connections"
    hard_limit = 1000
    soft_limit = 800
```

### Health Checks
```toml
[[services.http_checks]]
  interval = "10s"
  timeout = "2s"
  grace_period = "5s"
  method = "GET"
  path = "/health"
```

## Production Checklist

- [ ] Configure environment variables
- [ ] Set up database backups
- [ ] Configure SSL certificates
- [ ] Set up monitoring alerts
- [ ] Configure auto-scaling rules
- [ ] Test disaster recovery
- [ ] Set up CI/CD pipeline
- [ ] Configure rate limiting
- [ ] Enable DDoS protection
- [ ] Set up error tracking (Sentry)

## Deployment Commands Script

```bash
#!/bin/bash
# deploy.sh - Full deployment script

# Build and deploy
fly deploy --strategy rolling

# Run database migrations
fly ssh console -C "npm run migrate:prod"

# Verify deployment
fly status
fly logs --tail

# Scale if needed
fly scale count 3 --region iad
```

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
```bash
fly postgres connect -a velocitymesh-db
```

2. **Memory Issues**
```bash
fly scale memory 1024 --app velocitymesh-app
```

3. **Build Failures**
```bash
fly deploy --local-only --build-arg NODE_ENV=production
```

## Cost Optimization

### Estimated Monthly Costs
- Basic: ~$25/month (1 app, shared CPU, 512MB RAM)
- Standard: ~$70/month (2 apps, dedicated CPU, 2GB RAM)
- Enterprise: ~$200+/month (Multi-region, auto-scaling)

### Cost Saving Tips
1. Use auto-stop machines for staging
2. Implement efficient caching
3. Use Fly.io's built-in CDN
4. Optimize Docker images
5. Use shared CPU for non-critical services

## Support & Resources

- [Fly.io Documentation](https://fly.io/docs)
- [VelocityMesh GitHub](https://github.com/MichaelCrowe11/velocitymesh-platform)
- [Status Page](https://status.fly.io)
- Support Email: support@velocitymesh.com