# 🚀 VelocityMesh Quick Deploy Guide

## Option 1: Deploy via Fly.io Web Interface (Recommended)

### Step 1: Sign up for Fly.io
1. Go to [https://fly.io](https://fly.io)
2. Click "Sign Up" and create an account
3. Verify your email

### Step 2: Install Fly CLI
**Windows (PowerShell as Admin):**
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

**Mac/Linux:**
```bash
curl -L https://fly.io/install.sh | sh
```

### Step 3: Deploy from GitHub
```bash
# Clone the repository
git clone https://github.com/MichaelCrowe11/velocitymesh-platform.git
cd velocitymesh-platform

# Login to Fly.io
fly auth login

# Launch the app (first time only)
fly launch --name velocitymesh-platform --region iad

# Deploy
fly deploy
```

## Option 2: Deploy via GitHub Actions (CI/CD)

### Step 1: Fork the Repository
1. Go to [https://github.com/MichaelCrowe11/velocitymesh-platform](https://github.com/MichaelCrowe11/velocitymesh-platform)
2. Click "Fork" button
3. Clone your fork locally

### Step 2: Get Fly.io API Token
```bash
fly auth token
```

### Step 3: Add GitHub Secrets
In your GitHub repository:
1. Go to Settings → Secrets → Actions
2. Add new secret: `FLY_API_TOKEN` with your token

### Step 4: Enable GitHub Actions
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Fly.io
on:
  push:
    branches: [master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

## Option 3: Deploy via Railway (Alternative Platform)

### Step 1: Sign up for Railway
1. Go to [https://railway.app](https://railway.app)
2. Sign in with GitHub

### Step 2: Deploy from GitHub
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose `velocitymesh-platform`
4. Railway will auto-detect and deploy

### Step 3: Configure Environment
Add these environment variables in Railway dashboard:
```
NODE_ENV=production
DATABASE_URL=<auto-provisioned>
REDIS_URL=<auto-provisioned>
```

## Option 4: Deploy via Render

### Step 1: Sign up for Render
1. Go to [https://render.com](https://render.com)
2. Sign up with GitHub

### Step 2: Create New Web Service
1. Click "New +" → "Web Service"
2. Connect GitHub repository
3. Use these settings:
   - Name: `velocitymesh-platform`
   - Environment: `Docker`
   - Plan: `Starter ($7/month)`

### Step 3: Deploy
Render will automatically build and deploy from your Dockerfile.

## Option 5: Local Development First

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis
- npm or yarn

### Quick Start
```bash
# Clone repository
git clone https://github.com/MichaelCrowe11/velocitymesh-platform.git
cd velocitymesh-platform

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your values

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

Access at: http://localhost:3000

## 🔧 Environment Variables Required

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=<generate-with-openssl-rand-hex-32>
SESSION_SECRET=<generate-with-openssl-rand-hex-32>

# Stripe (Optional for payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AI (Optional)
OPENAI_API_KEY=sk-...
```

## 📊 Deployment Checklist

- [ ] Database provisioned (PostgreSQL)
- [ ] Redis cache configured
- [ ] Environment variables set
- [ ] SSL certificates configured
- [ ] Domain name pointed (optional)
- [ ] Monitoring setup (optional)

## 🆘 Troubleshooting

### Common Issues

**Port conflicts:**
Change `PORT` in .env file

**Database connection failed:**
Check `DATABASE_URL` format

**Build failures:**
Ensure Node.js 18+ is installed

## 📞 Support

- GitHub Issues: [Create Issue](https://github.com/MichaelCrowe11/velocitymesh-platform/issues)
- Documentation: See `/docs` folder
- Email: support@velocitymesh.com

## 🎉 Quick Deploy Links

Choose your preferred platform:

1. **[Deploy to Fly.io](https://fly.io/docs/getting-started/)**
2. **[Deploy to Railway](https://railway.app/new/github)**
3. **[Deploy to Render](https://render.com/deploy)**
4. **[Deploy to Vercel](https://vercel.com/new)**
5. **[Deploy to Netlify](https://app.netlify.com/start)**

---

**Ready in 5 minutes!** Choose any platform above and follow their quick start guide.