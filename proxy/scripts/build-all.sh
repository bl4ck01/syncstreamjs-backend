#!/usr/bin/env sh
set -euo pipefail

VERSION="${1:-dev}"
DIST_DIR="$(dirname "$0")/../dist"
mkdir -p "$DIST_DIR"

cd "$(dirname "$0")/.."

echo "Building linux/amd64..."
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags "-s -w -X main.version=$VERSION" -o dist/proxy-linux-amd64 .

echo "Building linux/arm64..."
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -ldflags "-s -w -X main.version=$VERSION" -o dist/proxy-linux-arm64 .

echo "Building windows/amd64..."
CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -ldflags "-s -w -X main.version=$VERSION" -o dist/proxy-windows-amd64.exe .

echo "Done. Artifacts in dist/"


