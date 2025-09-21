# CNiS-MCP Server - Production Docker Image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Update Alpine system packages and install dependencies, create user, and setup directories
RUN apk update && apk upgrade && \
    apk add --no-cache curl && \
    rm -rf /var/cache/apk/* && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    mkdir -p /app/logs && \
    npm install -g npm@latest

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY healthcheck.js ./

# Install dependencies, copy source, build, and cleanup in single layer
COPY src/ ./src/
RUN npm ci --silent && \
    npm run build && \
    chmod +x build/index.js && \
    npm prune --production && \
    rm -rf src/ tsconfig.json && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["node", "healthcheck.js"]

# Expose port (for HTTP mode)
EXPOSE 3000

# Default command - STDIO mode
CMD ["node", "build/index.js"]

# Labels for metadata
LABEL name="cnis-mcp-server" \
      version="1.0.0" \
      description="Crypto News Intelligence Server - MCP with triple protocol support" \
      maintainer="Kaayaan Infrastructure"