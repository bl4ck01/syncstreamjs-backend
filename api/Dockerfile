# Use official Bun image
FROM oven/bun:1.0-alpine AS base

# Install dependencies for production
FROM base AS deps
WORKDIR /app
COPY package.json ./
RUN bun install --production

# Install all dependencies for building
FROM base AS build-deps
WORKDIR /app
COPY package.json ./
RUN bun install

# Build the application
FROM build-deps AS build
WORKDIR /app
COPY . .
# If you have a build step, run it here
# RUN bun run build

# Production image
FROM base AS runtime
WORKDIR /app

# Install PostgreSQL client for migrations
RUN apk add --no-cache postgresql-client

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy production dependencies
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Create necessary directories
RUN mkdir -p /app/logs && \
    chown -R nodejs:nodejs /app/logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/v1/health || exit 1

# Start the application
CMD ["bun", "run", "src/index.js"]
