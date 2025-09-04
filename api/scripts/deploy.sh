#!/bin/bash

# SyncStream TV Deployment Script
# Usage: ./scripts/deploy.sh [environment] [action]
# Environments: dev, staging, production
# Actions: deploy, rollback, status, logs

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
ACTION=${2:-deploy}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
LOG_FILE="./logs/deploy_${ENVIRONMENT}_${TIMESTAMP}.log"

# Environment-specific settings
case $ENVIRONMENT in
    dev)
        COMPOSE_FILE="docker-compose.yml"
        ENV_FILE=".env.local"
        ;;
    staging)
        COMPOSE_FILE="docker-compose.yml"
        ENV_FILE=".env.staging"
        ;;
    production)
        COMPOSE_FILE="docker-compose.yml"
        ENV_FILE=".env"
        COMPOSE_PROFILES="--profile monitoring"
        ;;
    *)
        echo -e "${RED}Invalid environment: $ENVIRONMENT${NC}"
        echo "Usage: $0 [dev|staging|production] [deploy|rollback|status|logs]"
        exit 1
        ;;
esac

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a $LOG_FILE
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a $LOG_FILE
}

# Create necessary directories
mkdir -p ./logs
mkdir -p $BACKUP_DIR

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
    fi
    
    # Check environment file
    if [ ! -f "$ENV_FILE" ]; then
        error "Environment file $ENV_FILE not found"
    fi
    
    # Check required environment variables
    source $ENV_FILE
    if [ -z "$JWT_SECRET" ]; then
        error "JWT_SECRET is not set in $ENV_FILE"
    fi
    if [ -z "$STRIPE_SECRET_KEY" ]; then
        error "STRIPE_SECRET_KEY is not set in $ENV_FILE"
    fi
    
    log "Prerequisites check passed"
}

# Backup database
backup_database() {
    log "Backing up database..."
    
    # Get database container name
    DB_CONTAINER=$(docker ps --filter "name=syncstream-db" --format "{{.Names}}")
    
    if [ -z "$DB_CONTAINER" ]; then
        warning "Database container not running, skipping backup"
        return
    fi
    
    # Create backup
    BACKUP_FILE="$BACKUP_DIR/db_backup_${ENVIRONMENT}_${TIMESTAMP}.sql"
    docker exec $DB_CONTAINER pg_dump -U syncstream syncstream_db > $BACKUP_FILE
    
    if [ $? -eq 0 ]; then
        log "Database backed up to $BACKUP_FILE"
        # Keep only last 5 backups
        ls -t $BACKUP_DIR/db_backup_${ENVIRONMENT}_*.sql | tail -n +6 | xargs -r rm
    else
        error "Database backup failed"
    fi
}

# Deploy application
deploy() {
    log "Starting deployment for $ENVIRONMENT environment..."
    
    # Pull latest code
    log "Pulling latest code..."
    git pull origin main
    
    # Backup database
    backup_database
    
    # Build and start services
    log "Building Docker images..."
    docker-compose -f $COMPOSE_FILE build --no-cache
    
    log "Starting services..."
    docker-compose -f $COMPOSE_FILE up -d $COMPOSE_PROFILES
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    sleep 10
    
    # Run database migrations
    log "Running database migrations..."
    docker-compose -f $COMPOSE_FILE exec -T app bun run db:migrate
    
    # Health check
    log "Performing health check..."
    sleep 5
    HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/health)
    
    if [ "$HEALTH_CHECK" = "200" ]; then
        log "Deployment successful! Health check passed."
    else
        error "Health check failed with status code: $HEALTH_CHECK"
    fi
    
    # Clean up old images
    log "Cleaning up old Docker images..."
    docker image prune -f
    
    log "Deployment completed successfully!"
}

# Rollback to previous version
rollback() {
    log "Starting rollback for $ENVIRONMENT environment..."
    
    # Find latest backup
    LATEST_BACKUP=$(ls -t $BACKUP_DIR/db_backup_${ENVIRONMENT}_*.sql 2>/dev/null | head -n 1)
    
    if [ -z "$LATEST_BACKUP" ]; then
        error "No backup found for rollback"
    fi
    
    log "Found backup: $LATEST_BACKUP"
    
    # Stop current services
    log "Stopping current services..."
    docker-compose -f $COMPOSE_FILE down
    
    # Restore database
    log "Restoring database from backup..."
    docker-compose -f $COMPOSE_FILE up -d postgres
    sleep 10
    
    DB_CONTAINER=$(docker ps --filter "name=syncstream-db" --format "{{.Names}}")
    docker exec -i $DB_CONTAINER psql -U syncstream syncstream_db < $LATEST_BACKUP
    
    # Start previous version
    log "Starting previous version..."
    docker-compose -f $COMPOSE_FILE up -d $COMPOSE_PROFILES
    
    log "Rollback completed!"
}

# Show status
show_status() {
    log "Checking status for $ENVIRONMENT environment..."
    
    echo -e "\n${GREEN}=== Container Status ===${NC}"
    docker-compose -f $COMPOSE_FILE ps
    
    echo -e "\n${GREEN}=== Health Status ===${NC}"
    curl -s http://localhost:3000/api/v1/health | jq '.' || echo "API not responding"
    
    echo -e "\n${GREEN}=== Database Status ===${NC}"
    docker-compose -f $COMPOSE_FILE exec postgres pg_isready -U syncstream || echo "Database not ready"
    
    echo -e "\n${GREEN}=== Resource Usage ===${NC}"
    docker stats --no-stream $(docker-compose -f $COMPOSE_FILE ps -q)
}

# Show logs
show_logs() {
    SERVICE=${3:-app}
    LINES=${4:-100}
    
    log "Showing logs for $SERVICE service..."
    docker-compose -f $COMPOSE_FILE logs --tail=$LINES -f $SERVICE
}

# Main execution
case $ACTION in
    deploy)
        check_prerequisites
        deploy
        ;;
    rollback)
        rollback
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    *)
        echo -e "${RED}Invalid action: $ACTION${NC}"
        echo "Usage: $0 [environment] [deploy|rollback|status|logs]"
        exit 1
        ;;
esac
