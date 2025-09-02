#!/bin/bash

# SyncStream TV Backup Script
# Automated backup for database and application data

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
S3_BUCKET="${S3_BUCKET:-}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

# Create backup directory
mkdir -p $BACKUP_DIR

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    send_notification "error" "$1"
    exit 1
}

# Send notification to Slack
send_notification() {
    local status=$1
    local message=$2
    
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"Backup $status: $message\"}" \
            $SLACK_WEBHOOK 2>/dev/null || true
    fi
}

# Backup PostgreSQL database
backup_database() {
    log "Starting database backup..."
    
    DB_CONTAINER="syncstream-db"
    DB_NAME="syncstream_db"
    DB_USER="syncstream"
    
    # Check if container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
        error "Database container $DB_CONTAINER is not running"
    fi
    
    # Create backup
    BACKUP_FILE="$BACKUP_DIR/db_${TIMESTAMP}.sql.gz"
    
    docker exec $DB_CONTAINER pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_FILE
    
    if [ $? -eq 0 ]; then
        log "Database backup completed: $BACKUP_FILE"
        echo "$BACKUP_FILE"
    else
        error "Database backup failed"
    fi
}

# Backup Redis data
backup_redis() {
    log "Starting Redis backup..."
    
    REDIS_CONTAINER="syncstream-redis"
    
    # Check if container is running
    if ! docker ps --format '{{.Names}}' | grep -q "^${REDIS_CONTAINER}$"; then
        log "Redis container not running, skipping backup"
        return
    fi
    
    # Trigger Redis save
    docker exec $REDIS_CONTAINER redis-cli BGSAVE
    sleep 5
    
    # Copy dump file
    BACKUP_FILE="$BACKUP_DIR/redis_${TIMESTAMP}.rdb"
    docker cp $REDIS_CONTAINER:/data/dump.rdb $BACKUP_FILE
    
    if [ $? -eq 0 ]; then
        log "Redis backup completed: $BACKUP_FILE"
        echo "$BACKUP_FILE"
    else
        log "Redis backup failed"
    fi
}

# Backup application files
backup_application() {
    log "Starting application backup..."
    
    # Files to backup
    BACKUP_FILES=(
        ".env"
        "package.json"
        "src/"
        "postman/"
    )
    
    # Create tar archive
    BACKUP_FILE="$BACKUP_DIR/app_${TIMESTAMP}.tar.gz"
    
    tar -czf $BACKUP_FILE ${BACKUP_FILES[@]} 2>/dev/null
    
    if [ $? -eq 0 ]; then
        log "Application backup completed: $BACKUP_FILE"
        echo "$BACKUP_FILE"
    else
        log "Application backup failed"
    fi
}

# Upload to S3
upload_to_s3() {
    local file=$1
    
    if [ -z "$S3_BUCKET" ]; then
        log "S3 bucket not configured, skipping upload"
        return
    fi
    
    log "Uploading $file to S3..."
    
    # Using AWS CLI
    aws s3 cp $file s3://$S3_BUCKET/backups/$(basename $file) \
        --storage-class STANDARD_IA
    
    if [ $? -eq 0 ]; then
        log "Upload completed: $(basename $file)"
    else
        log "Upload failed: $(basename $file)"
    fi
}

# Clean old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # Local cleanup
    find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
    find $BACKUP_DIR -type f -name "*.rdb" -mtime +$RETENTION_DAYS -delete
    find $BACKUP_DIR -type f -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
    
    # S3 cleanup (if configured)
    if [ -n "$S3_BUCKET" ]; then
        aws s3 ls s3://$S3_BUCKET/backups/ | while read -r line; do
            createDate=$(echo $line | awk '{print $1" "$2}')
            createDate=$(date -d "$createDate" +%s)
            olderThan=$(date -d "$RETENTION_DAYS days ago" +%s)
            if [[ $createDate -lt $olderThan ]]; then
                fileName=$(echo $line | awk '{print $4}')
                if [ -n "$fileName" ]; then
                    aws s3 rm s3://$S3_BUCKET/backups/$fileName
                    log "Deleted old S3 backup: $fileName"
                fi
            fi
        done
    fi
    
    log "Cleanup completed"
}

# Verify backup
verify_backup() {
    local file=$1
    
    if [ ! -f "$file" ]; then
        return 1
    fi
    
    # Check file size
    size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
    if [ "$size" -lt 1000 ]; then
        return 1
    fi
    
    # Test integrity based on file type
    case "$file" in
        *.gz)
            gzip -t "$file" 2>/dev/null
            return $?
            ;;
        *.tar.gz)
            tar -tzf "$file" >/dev/null 2>&1
            return $?
            ;;
        *)
            return 0
            ;;
    esac
}

# Main backup process
main() {
    log "Starting SyncStream backup process..."
    
    BACKUP_FILES=()
    
    # Database backup
    DB_BACKUP=$(backup_database)
    if verify_backup "$DB_BACKUP"; then
        BACKUP_FILES+=("$DB_BACKUP")
        upload_to_s3 "$DB_BACKUP"
    else
        error "Database backup verification failed"
    fi
    
    # Redis backup
    REDIS_BACKUP=$(backup_redis)
    if [ -n "$REDIS_BACKUP" ] && verify_backup "$REDIS_BACKUP"; then
        BACKUP_FILES+=("$REDIS_BACKUP")
        upload_to_s3 "$REDIS_BACKUP"
    fi
    
    # Application backup
    APP_BACKUP=$(backup_application)
    if verify_backup "$APP_BACKUP"; then
        BACKUP_FILES+=("$APP_BACKUP")
        upload_to_s3 "$APP_BACKUP"
    fi
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Summary
    log "Backup process completed successfully!"
    log "Created backups:"
    for file in "${BACKUP_FILES[@]}"; do
        log "  - $(basename $file) ($(du -h $file | cut -f1))"
    done
    
    send_notification "success" "Backup completed: ${#BACKUP_FILES[@]} files created"
}

# Run main function
main
