# Multi-stage Dockerfile for UBUNIFU SEC SMS Backend
# Stage 1: Build and prepare dependencies
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001 -G nodejs

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copy package files from build context root
COPY package*.json ./

# Install dependencies with exact versions  
RUN npm install --only=production --no-audit --no-fund && \
    npm cache clean --force

# Stage 2: Production runtime
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001 -G nodejs

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    tzdata

# Set timezone
ENV TZ=Africa/Dar_es_Salaam

# Copy production dependencies from builder
COPY --from=builder --chown=backend:nodejs /app/node_modules ./node_modules

# Copy server application code
COPY --chown=backend:nodejs ./server ./
COPY --chown=backend:nodejs ./package*.json ./

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads /app/temp && \
    chown -R backend:nodejs /app/logs /app/uploads /app/temp

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Switch to non-root user
USER backend

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]
