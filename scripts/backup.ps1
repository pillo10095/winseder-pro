<#
.SYNOPSIS
  Backup Wisender Pro database and media files.
.DESCRIPTION
  Creates a timestamped backup of the MySQL database and MinIO media.
  Restore with restore.ps1.
.PARAMETER BasePath
  Directory to store backups (default: ./backups).
#>

param(
  [string]$BasePath = (Join-Path -Path $PSScriptRoot -ChildPath "..\backups")
)

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupDir = Join-Path -Path $BasePath -ChildPath $Timestamp
$LogFile = Join-Path -Path $BackupDir -ChildPath "backup.log"

# Ensure backup directory
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

function Write-Log {
  param([string]$Message)
  $Line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
  Write-Host $Line
  Add-Content -Path $LogFile -Value $Line
}

Write-Log "=== Wisender Backup Started ==="
Write-Log "Backup directory: $BackupDir"

# 1. Database backup via Docker
Write-Log "Backing up database..."
$DbContainer = "wisender-mysql"
$DbUser = "root"
$DbPassword = "carlos12"
$DbName = "wisender_pro"
$DbDump = Join-Path -Path $BackupDir -ChildPath "database.sql"

try {
  docker exec $DbContainer mysqldump -u $DbUser -p"$DbPassword" --single-transaction --routines --triggers $DbName > $DbDump 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Log "Database backup saved: $DbDump"
  } else {
    throw "mysqldump failed"
  }
} catch {
  Write-Log "WARNING: Database backup failed (container may not be running): $_"
  Remove-Item -Path $DbDump -Force -ErrorAction SilentlyContinue
}

# 2. .env file backup
$EnvFile = Join-Path -Path $PSScriptRoot -ChildPath "..\.env"
if (Test-Path -Path $EnvFile) {
  Copy-Item -Path $EnvFile -Destination (Join-Path -Path $BackupDir -ChildPath ".env.backup")
  Write-Log "Environment file backed up"
}

# 3. Migration files backup
$MigrationsDir = Join-Path -Path $PSScriptRoot -ChildPath "..\apps\api\src\database\migrations"
$MigrationsBackup = Join-Path -Path $BackupDir -ChildPath "migrations"
if (Test-Path -Path $MigrationsDir) {
  Copy-Item -Path $MigrationsDir -Destination $MigrationsBackup -Recurse
  Write-Log "Migrations backed up"
}

# Summary
$Size = (Get-ChildItem -Path $BackupDir -Recurse | Measure-Object -Property Length -Sum).Sum
Write-Log "=== Backup Complete ==="
Write-Log "Total size: $([math]::Round($Size / 1MB, 2)) MB"
Write-Log "Backup path: $BackupDir"

return @{
  Path = $BackupDir
  Timestamp = $Timestamp
  SizeMB = [math]::Round($Size / 1MB, 2)
}
