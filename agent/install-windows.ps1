#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Blimp Agent - Windows Installer
  Installs the Blimp agent as a Windows Service that starts automatically
  and exposes a local HTTP API on http://localhost:51723

.DESCRIPTION
  Requirements: Python 3.9+, Windows 10/11 or Server 2019+
  Run from PowerShell as Administrator.

.EXAMPLE
  .\install-windows.ps1
#>

$ErrorActionPreference = "Stop"

$AgentVersion = "1.0.0"
$InstallDir   = "C:\ProgramData\BlimpAgent"
$ServiceName  = "BlimpAgent"
$DisplayName  = "Blimp Hardware Inventory Agent"
$AgentPort    = 51723
$LogDir       = "$InstallDir\logs"

function Write-Info    { Write-Host "  → $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "  ✓ $args" -ForegroundColor Green }
function Write-Warn    { Write-Host "  ⚠ $args" -ForegroundColor Yellow }
function Write-Fail    { Write-Host "  ✗ $args" -ForegroundColor Red; exit 1 }

Clear-Host
Write-Host ""
Write-Host "  Blimp Agent v$AgentVersion — Windows Installer" -ForegroundColor White
Write-Host "  ─────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""

# ── Locate Python ─────────────────────────────────────────────────────────────
Write-Info "Locating Python 3.9+..."

$PythonExe = $null
$Candidates = @(
    "python",
    "python3",
    "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python310\python.exe",
    "$env:PROGRAMFILES\Python311\python.exe",
    "C:\Python311\python.exe"
)

foreach ($c in $Candidates) {
    try {
        $ver = & $c --version 2>&1
        if ($ver -match "Python (\d+)\.(\d+)") {
            $major = [int]$Matches[1]
            $minor = [int]$Matches[2]
            if ($major -ge 3 -and $minor -ge 9) {
                $PythonExe = (Get-Command $c -ErrorAction SilentlyContinue).Source ?? $c
                Write-Success "Found Python: $c ($ver)"
                break
            }
        }
    } catch { }
}

if (-not $PythonExe) {
    Write-Fail "Python 3.9+ not found. Install from https://www.python.org/downloads/"
}

# ── Install files ─────────────────────────────────────────────────────────────
Write-Info "Creating install directory: $InstallDir"
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

$ScriptSource = Join-Path $PSScriptRoot "blimp_agent.py"
if (-not (Test-Path $ScriptSource)) {
    Write-Fail "blimp_agent.py not found in $PSScriptRoot"
}

Copy-Item $ScriptSource "$InstallDir\blimp_agent.py" -Force
Write-Success "Agent installed to $InstallDir"

# ── Create a wrapper batch file (NSSM alternative) ───────────────────────────
# We'll use sc.exe + a wrapper batch for the service

$WrapperPath = "$InstallDir\run_agent.bat"
@"
@echo off
"$PythonExe" "$InstallDir\blimp_agent.py" --server --port $AgentPort >> "$LogDir\agent.log" 2>&1
"@ | Out-File -FilePath $WrapperPath -Encoding ASCII

# ── Install NSSM if available, otherwise use Task Scheduler ───────────────────
$NssmPath = Get-Command nssm -ErrorAction SilentlyContinue
if ($NssmPath) {
    Write-Info "Installing Windows Service via NSSM..."
    & nssm stop  $ServiceName 2>$null
    & nssm remove $ServiceName confirm 2>$null
    & nssm install $ServiceName $PythonExe "$InstallDir\blimp_agent.py --server --port $AgentPort"
    & nssm set $ServiceName AppDirectory $InstallDir
    & nssm set $ServiceName AppStdout "$LogDir\agent.log"
    & nssm set $ServiceName AppStderr "$LogDir\agent.err"
    & nssm set $ServiceName DisplayName $DisplayName
    & nssm set $ServiceName Description "Blimp hardware inventory agent — exposes local HTTP API"
    & nssm set $ServiceName Start SERVICE_AUTO_START
    & nssm start $ServiceName
    Write-Success "Service installed and started via NSSM"
} else {
    Write-Info "NSSM not found — installing via Task Scheduler (runs at logon)..."

    $Action  = New-ScheduledTaskAction -Execute $PythonExe `
                 -Argument "`"$InstallDir\blimp_agent.py`" --server --port $AgentPort" `
                 -WorkingDirectory $InstallDir
    $Trigger = New-ScheduledTaskTrigger -AtLogOn
    $Settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit 0 -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
    $Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

    Unregister-ScheduledTask -TaskName $ServiceName -Confirm:$false -ErrorAction SilentlyContinue

    Register-ScheduledTask -TaskName $ServiceName `
        -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal `
        -Description $DisplayName -Force | Out-Null

    Start-ScheduledTask -TaskName $ServiceName
    Write-Success "Scheduled task installed and started"
}

# ── Firewall: allow local-only access ─────────────────────────────────────────
Write-Info "Configuring Windows Firewall (localhost only)..."
$FwRule = "Blimp Agent HTTP"
try {
    Remove-NetFirewallRule -DisplayName $FwRule -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName $FwRule `
        -Direction Inbound -Protocol TCP -LocalPort $AgentPort `
        -RemoteAddress "127.0.0.1" -Action Allow | Out-Null
    Write-Success "Firewall rule added (port $AgentPort, localhost only)"
} catch {
    Write-Warn "Could not add firewall rule — you may need to do this manually"
}

# ── Verify ────────────────────────────────────────────────────────────────────
Write-Info "Waiting for agent to start..."
Start-Sleep -Seconds 3

try {
    $health = Invoke-RestMethod "http://localhost:$AgentPort/health" -TimeoutSec 5
    if ($health.status -eq "ok") {
        Write-Success "Agent is running at http://localhost:$AgentPort"
    }
} catch {
    Write-Warn "Agent may still be starting. Check logs: $LogDir"
}

Write-Host ""
Write-Host "  Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "  API endpoints:"
Write-Host "    http://localhost:$AgentPort/health  — health check"
Write-Host "    http://localhost:$AgentPort/report  — full hardware inventory"
Write-Host ""
Write-Host "  Logs:    $LogDir"
Write-Host "  Config:  $InstallDir"
Write-Host ""
Write-Host "  To stop:      Stop-ScheduledTask -TaskName '$ServiceName'"
Write-Host "  To uninstall: Unregister-ScheduledTask -TaskName '$ServiceName' -Confirm:`$false"
Write-Host ""
