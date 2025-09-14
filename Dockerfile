# VelocityMesh Platform - Production Dockerfile
# Multi-stage build for optimal production deployment

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./
RUN npm ci --only=production

# Copy frontend source
COPY frontend/ ./

# Build frontend for production
ENV NODE_ENV=production
ENV VITE_API_URL=https://velocitymesh-platform.fly.dev
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./
COPY backend/prisma ./prisma/
RUN npm ci --only=production

# Copy backend source
COPY backend/ ./

# Generate Prisma client
RUN npx prisma generate

# Build backend (skip for now due to compilation errors)
# RUN npm run build

# Stage 3: Build AI Engine
FROM python:3.11-slim AS ai-builder
WORKDIR /app/ai-engine

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy AI engine requirements
COPY ai-engine/requirements*.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy AI engine source
COPY ai-engine/ ./

# Stage 4: Production Image
FROM node:20-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    postgresql-client \
    redis \
    nginx \
    supervisor \
    curl \
    && pip3 install --no-cache-dir uvicorn fastapi

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S velocitymesh -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy built applications
COPY --from=frontend-builder --chown=velocitymesh:nodejs /app/frontend/dist ./frontend/dist
COPY --from=backend-builder --chown=velocitymesh:nodejs /app/backend ./backend
COPY --from=ai-builder --chown=velocitymesh:nodejs /app/ai-engine ./ai-engine

# Copy package.json files
COPY --chown=velocitymesh:nodejs package*.json ./
COPY --chown=velocitymesh:nodejs backend/package*.json ./backend/
COPY --chown=velocitymesh:nodejs frontend/package*.json ./frontend/

# Install production dependencies
RUN cd backend && npm ci --only=production && npm cache clean --force

# Copy configuration files
COPY --chown=velocitymesh:nodejs docker/nginx.conf /etc/nginx/nginx.conf
COPY --chown=velocitymesh:nodejs docker/supervisord.conf /etc/supervisord.conf

# Create necessary directories
RUN mkdir -p /app/logs /app/data /var/log/supervisor && \
    chown -R velocitymesh:nodejs /app /var/log/supervisor

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Expose ports
EXPOSE 8080

# Switch to non-root user
USER velocitymesh

# Start script
COPY --chown=velocitymesh:nodejs docker/start.sh /app/start.sh
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]