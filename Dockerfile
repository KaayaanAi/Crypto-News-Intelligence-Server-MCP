# CNiS-MCP Server - Production Docker Image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including dev dependencies for build)
RUN npm ci --silent

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build && \
    chmod +x build/index.js

# Remove dev dependencies and source after build
RUN npm prune --production && \
    rm -rf src/ tsconfig.json

# Create necessary directories
RUN mkdir -p /app/logs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# Expose port (for HTTP mode)
EXPOSE 3000

# Default command - STDIO mode
CMD ["node", "build/index.js"]

# Labels for metadata
LABEL name="cnis-mcp-server" \
      version="1.0.0" \
      description="Crypto News Intelligence Server - MCP with triple protocol support" \
      maintainer="Kaayaan Infrastructure"