<#
.SYNOPSIS
  Restore Wisender Pro database from a backup.
.DESCRIPTION
  Restores a MySQL dump created by backup.ps1.
.PARAMETER BackupPath
  Path to the backup directory containing database.sql.
#>

param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath
)

$LogFile = Join-Path -Path $BackupPath -ChildPath "restore.log"
$DbDump = Join-Path -Path $BackupPath -ChildPath "database.sql"

function Write-Log {
  param([string]$Message)
  $Line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
  Write-Host $Line
  Add-Content -Path $LogFile -Value $Line
}

Write-Log "=== Wisender Restore Started ==="
Write-Log "Restoring from: $BackupPath"

# Validate backup exists
if (-not (Test-Path -Path $DbDump)) {
  Write-Log "ERROR: database.sql not found in $BackupPath"
  exit 1
}

# Confirm
Write-Host "WARNING: This will DROP and recreate the wisender_pro database!" -ForegroundColor Red
$confirm = Read-Host "Are you sure you want to continue? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
  Write-Log "Restore cancelled by user"
  exit 0
}

# Restore database
$DbContainer = "wisender-mysql"
$DbUser = "root"
$DbPassword = "carlos12"
$DbName = "wisender_pro"

try {
  Write-Log "Dropping and recreating database..."
  docker exec -i $DbContainer mysql -u $DbUser -p"$DbPassword" -e "DROP DATABASE IF EXISTS $DbName; CREATE DATABASE $DbName CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  
  Write-Log "Importing database..."
  Get-Content -Path $DbDump -Raw | docker exec -i $DbContainer mysql -u $DbUser -p"$DbPassword" $DbName
  
  Write-Log "Database restored successfully"
} catch {
  Write-Log "ERROR: Restore failed: $_"
  exit 1
}

# Restore .env if present
$EnvBackup = Join-Path -Path $BackupPath -ChildPath ".env.backup"
if (Test-Path -Path $EnvBackup) {
  $EnvTarget = Join-Path -Path $PSScriptRoot -ChildPath "..\.env"
  Copy-Item -Path $EnvBackup -Destination $EnvTarget -Force
  Write-Log ".env restored"
}

Write-Log "=== Restore Complete ==="
Write-Log "Restart the application for changes to take effect."
