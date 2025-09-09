param(
    [string]$Version = "dev"
)

$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path "$PSScriptRoot/../dist" | Out-Null
Push-Location "$PSScriptRoot/.."

Write-Host "Building Windows amd64..."
$env:CGO_ENABLED = "0"
$env:GOOS = "windows"
$env:GOARCH = "amd64"
go build -ldflags "-s -w -X main.version=$Version" -o dist/proxy-windows-amd64.exe .

Write-Host "Building Linux amd64..."
$env:GOOS = "linux"
$env:GOARCH = "amd64"
go build -ldflags "-s -w -X main.version=$Version" -o dist/proxy-linux-amd64 .

Write-Host "Building Linux arm64..."
$env:GOOS = "linux"
$env:GOARCH = "arm64"
go build -ldflags "-s -w -X main.version=$Version" -o dist/proxy-linux-arm64 .

Pop-Location
Write-Host "Done. Artifacts in dist/"


