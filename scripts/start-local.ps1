[CmdletBinding()]
param(
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$hostAddress = '127.0.0.1'
$port = 5173
$baseUrl = "http://${hostAddress}:$port"
$calendarUrl = "$baseUrl/app/calendar"
$viteEntry = Join-Path $projectRoot 'node_modules\vite\bin\vite.js'
$logDirectory = Join-Path $projectRoot '.g-tasker'

function Get-ListenerDetails {
  $listenerPid = $null
  try {
    $listener = Get-NetTCPConnection -State Listen -LocalAddress $hostAddress -LocalPort $port -ErrorAction Stop |
      Select-Object -First 1
    if ($listener) {
      $listenerPid = $listener.OwningProcess
    }
  } catch {
    # This cmdlet may be denied in restricted Windows sessions. Fall back to netstat.
  }

  if (-not $listenerPid) {
    $netstatLine = netstat.exe -ano -p TCP |
      Select-String "^\s*TCP\s+$([regex]::Escape("${hostAddress}:$port"))\s+\S+\s+LISTENING\s+\d+\s*$" |
      Select-Object -First 1
    if ($netstatLine -and $netstatLine.Line -match '\s+(\d+)\s*$') {
      $listenerPid = [int]$matches[1]
    }
  }

  if (-not $listenerPid) {
    return $null
  }

  $process = Get-Process -Id $listenerPid -ErrorAction SilentlyContinue
  $commandLine = $null
  try {
    $commandLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $listenerPid" -ErrorAction Stop).CommandLine
  } catch {
    # Command-line inspection is best effort; the PID and process name remain useful.
  }

  [pscustomobject]@{
    Pid = $listenerPid
    Name = if ($process) { $process.ProcessName } else { '<unknown>' }
    CommandLine = $commandLine
  }
}

function Test-GTaskerHealth {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 -Uri $baseUrl
    return $response.StatusCode -eq 200 -and $response.Content -match '<title>G-tasker'
  } catch {
    return $false
  }
}

function Show-PortConflict([object]$listener) {
  Write-Host 'Port 5173 is occupied by another process.'
  Write-Host "PID: $($listener.Pid)"
  Write-Host "Process: $($listener.Name)"
  if ($listener.CommandLine) {
    Write-Host "Command line: $($listener.CommandLine)"
  } else {
    Write-Host 'Command line: unavailable (Windows did not grant process-query access).'
  }
}

function Open-GTasker {
  if (-not $NoBrowser) {
    Start-Process $calendarUrl
  }
}

$listener = Get-ListenerDetails
if ($listener) {
  if (Test-GTaskerHealth) {
    Write-Host "G-Tasker is already running at $baseUrl (PID $($listener.Pid))."
    Open-GTasker
    exit 0
  }

  Show-PortConflict $listener
  exit 1
}

if (-not (Test-Path -LiteralPath $viteEntry)) {
  Write-Error "Vite was not found at $viteEntry. Run npm install from $projectRoot and try again."
  exit 1
}

$node = (Get-Command node.exe -ErrorAction Stop).Source
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
$stdoutLog = Join-Path $logDirectory 'dev-server.out.log'
$stderrLog = Join-Path $logDirectory 'dev-server.err.log'

Write-Host "Starting G-Tasker on strict port 5173 from $projectRoot..."
$process = Start-Process -FilePath $node -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru `
  -ArgumentList @($viteEntry, '--host', $hostAddress, '--port', $port, '--strictPort') `
  -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog

$deadline = (Get-Date).AddSeconds(30)
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Milliseconds 300
  if ($process.HasExited) {
    break
  }

  $startedListener = Get-ListenerDetails
  if ($startedListener -and $startedListener.Pid -eq $process.Id -and (Test-GTaskerHealth)) {
    Write-Host "G-Tasker is ready at $baseUrl (Vite PID $($process.Id))."
    Open-GTasker
    exit 0
  }
}

Write-Error "G-Tasker did not become healthy on $baseUrl."
if (Test-Path -LiteralPath $stderrLog) {
  Write-Host 'Vite error output:'
  Get-Content -LiteralPath $stderrLog
}
if (Test-Path -LiteralPath $stdoutLog) {
  Write-Host 'Vite standard output:'
  Get-Content -LiteralPath $stdoutLog
}
exit 1
