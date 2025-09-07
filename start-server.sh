#!/bin/bash
# CNiS-MCP Server Startup Script

set -e

echo "🚀 Starting CNiS-MCP (Crypto News Intelligence Server)"
echo "==============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | sed 's/v//')
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    print_error "Node.js version $NODE_VERSION is too old. Please install Node.js 18+ (current: $NODE_VERSION)"
    exit 1
fi

print_status "Node.js version $NODE_VERSION is compatible"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    print_info "Installing dependencies..."
    npm install
fi

# Check if build directory exists
if [ ! -d "build" ]; then
    print_info "Building TypeScript..."
    npm run build
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from .env.example"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_info "Created .env file. Please review and configure as needed."
    else
        print_error ".env.example file not found"
        exit 1
    fi
fi

# Load environment variables
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Determine mode
MODE=${HTTP_MODE:-false}

print_info "Server Configuration:"
echo "  - Mode: $([ "$MODE" = "true" ] && echo "HTTP Server" || echo "STDIO MCP")"
echo "  - Port: ${PORT:-3000} (HTTP mode only)"
echo "  - Cache TTL: ${CACHE_TTL_MINUTES:-15} minutes"
echo "  - Max News Age: ${MAX_NEWS_AGE_HOURS:-24} hours"
echo ""

# Validate environment if needed
if [ "$MODE" = "true" ]; then
    print_info "Starting in HTTP Server mode..."
    print_info "Health check will be available at: http://localhost:${PORT:-3000}/health"
    print_info "API endpoints available at: http://localhost:${PORT:-3000}/api/"
    print_info "MCP Protocol endpoint: http://localhost:${PORT:-3000}/mcp"
else
    print_info "Starting in STDIO MCP mode..."
    print_info "Server will communicate via stdin/stdout for MCP protocol"
fi

echo ""
print_status "All checks passed! Starting server..."
echo "==============================================="

# Start the server
exec node build/index.js