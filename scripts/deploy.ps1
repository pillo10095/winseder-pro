<#
.SYNOPSIS
  Deploy Wisender Pro to production.
.DESCRIPTION
  Builds and deploys the application using Docker Compose.
  Optionally backs up the database before deployment.
.PARAMETER NoBackup
  Skip database backup before deployment.
.PARAMETER BuildOnly
  Only build images, don't restart services.
#>

param(
  [switch]$NoBackup,
  [switch]$BuildOnly
)

$RootDir = Split-Path -Parent $PSScriptRoot
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$LogFile = Join-Path -Path $RootDir -ChildPath "logs\deploy-$Timestamp.log"

# Ensure logs directory
New-Item -ItemType Directory -Path (Join-Path -Path $RootDir -ChildPath "logs") -Force | Out-Null

function Write-Log {
  param([string]$Message)
  $Line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
  Write-Host $Line
  Add-Content -Path $LogFile -Value $Line
}

function Exit-WithError {
  param([string]$Message)
  Write-Log "FATAL: $Message"
  exit 1
}

Write-Log "=== Wisender Deploy Started ==="

# 1. Pre-flight checks
Write-Log "Running pre-flight checks..."

if (-not (Test-Path -Path (Join-Path -Path $RootDir -ChildPath ".env"))) {
  Exit-WithError ".env file not found. Create it from .env.example"
}

try {
  docker info > $null 2>&1
} catch {
  Exit-WithError "Docker is not running"
}

try {
  $gitStatus = git status --porcelain
  if ($gitStatus) {
    Write-Log "WARNING: Working directory has uncommitted changes"
    Write-Log $gitStatus
    $confirm = Read-Host "Continue with uncommitted changes? (y/N)"
    if ($confirm -ne "y" -and $confirm -ne "Y") {
      Exit-WithError "Deploy cancelled"
    }
  }
} catch {
  Write-Log "WARNING: Git check failed, continuing..."
}

# 2. Backup database
if (-not $NoBackup) {
  Write-Log "Creating pre-deploy backup..."
  try {
    & (Join-Path -Path $PSScriptRoot -ChildPath "backup.ps1")
    Write-Log "Backup created"
  } catch {
    Write-Log "WARNING: Backup failed: $_"
  }
}

# 3. Pull latest code
Write-Log "Pulling latest code..."
try {
  git pull origin main 2>&1 | Out-String | Write-Log
} catch {
  Write-Log "WARNING: Git pull failed: $_"
}

# 4. Build
Write-Log "Building Docker images..."
try {
  docker compose -f "$RootDir\docker-compose.yml" build api web 2>&1 | Out-String | Write-Log
  Write-Log "Build complete"
} catch {
  Exit-WithError "Build failed: $_"
}

if ($BuildOnly) {
  Write-Log "Build-only mode. Exiting without deployment."
  exit 0
}

# 5. Deploy
Write-Log "Starting production services..."
try {
  docker compose -f "$RootDir\docker-compose.yml" up -d --no-deps api web 2>&1 | Out-String | Write-Log
  Write-Log "Services started"
} catch {
  Exit-WithError "Deploy failed: $_"
}

# 6. Health check
Write-Log "Running health check..."
Start-Sleep -Seconds 10
try {
  $health = Invoke-RestMethod -Uri "http://localhost:4000/api/health" -TimeoutSec 10
  Write-Log "Health check: $($health | ConvertTo-Json -Compress)"
} catch {
  Write-Log "WARNING: Health check failed: $_"
}

Write-Log "=== Deploy Complete ==="
Write-Log "Log file: $LogFile"
