# Multi-stage build for optimized production image
FROM node:18-alpine AS frontend-builder

# Set working directory
WORKDIR /app

# Copy frontend package files
COPY package*.json ./
COPY bun.lockb ./

# Install dependencies
RUN npm ci

# Copy frontend source code
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig*.json ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY components.json ./
COPY eslint.config.js ./
COPY src/ ./src/
COPY public/ ./public/

# Build frontend
RUN npm run build

# Python backend stage
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    build-essential \
    nginx \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy backend requirements
COPY backend/requirements.txt ./backend/

# Install Python dependencies
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy frontend build from previous stage
COPY --from=frontend-builder /app/dist ./frontend-dist

# Create necessary directories
RUN mkdir -p /app/backend/uploads \
    && mkdir -p /app/backend/audio_cache \
    && mkdir -p /var/log/supervisor

# Configure nginx
RUN echo 'server { \n\
    listen 8080; \n\
    server_name localhost; \n\
    \n\
    location / { \n\
        root /app/frontend-dist; \n\
        try_files $uri $uri/ /index.html; \n\
    } \n\
    \n\
    location /api/ { \n\
        proxy_pass http://127.0.0.1:8000/; \n\
        proxy_http_version 1.1; \n\
        proxy_set_header Upgrade $http_upgrade; \n\
        proxy_set_header Connection "upgrade"; \n\
        proxy_set_header Host $host; \n\
        proxy_set_header X-Real-IP $remote_addr; \n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \n\
        proxy_set_header X-Forwarded-Proto $scheme; \n\
        proxy_read_timeout 86400; \n\
        client_max_body_size 100M; \n\
    } \n\
}' > /etc/nginx/sites-available/default

# Create supervisor configuration
RUN echo '[supervisord] \n\
nodaemon=true \n\
logfile=/var/log/supervisor/supervisord.log \n\
pidfile=/var/run/supervisord.pid \n\
\n\
[program:backend] \n\
command=python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 \n\
directory=/app \n\
autostart=true \n\
autorestart=true \n\
redirect_stderr=true \n\
stdout_logfile=/var/log/supervisor/backend.log \n\
environment=PATH="/usr/local/bin:/usr/bin:/bin" \n\
\n\
[program:nginx] \n\
command=/usr/sbin/nginx -g "daemon off;" \n\
autostart=true \n\
autorestart=true \n\
redirect_stderr=true \n\
stdout_logfile=/var/log/supervisor/nginx.log' > /etc/supervisor/conf.d/supervisord.conf

# Expose port
EXPOSE 8080

# Set environment variables (will be overridden by docker run command)
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Start supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]