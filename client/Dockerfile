# Multi-stage Dockerfile for UBUNIFU SEC SMS Frontend
# Stage 1: Build React application
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S frontend -u 1001 -G nodejs

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copy client package files
COPY ./client/package*.json ./

# Install dependencies
RUN npm ci --no-audit --no-fund && \
    npm cache clean --force

# Copy client source code
COPY ./client .

# Set build environment
ENV NODE_ENV=production
ENV REACT_APP_API_URL=/api
ENV GENERATE_SOURCEMAP=false

# Build the application
RUN npm run build && \
    ls -la build/

# Stage 2: Nginx production server
FROM nginx:1.25-alpine AS production

# Install additional packages
RUN apk add --no-cache \
    curl \
    tzdata

# Set timezone
ENV TZ=Africa/Dar_es_Salaam

# Create non-root user
RUN addgroup -g 1001 -S nginx-user && \
    adduser -S frontend -u 1001 -G nginx-user

# Copy custom nginx configuration
COPY ./client/nginx.conf /etc/nginx/nginx.conf
COPY ./client/default.conf /etc/nginx/conf.d/default.conf

# Copy built React app from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Create necessary directories
RUN mkdir -p /var/cache/nginx /var/run/nginx && \
    chown -R frontend:nginx-user /var/cache/nginx /var/run/nginx /usr/share/nginx/html

# Set proper permissions
RUN chmod -R 755 /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:80/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
