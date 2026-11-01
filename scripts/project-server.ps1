param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("Check", "Start", "Stop")]
    [string]$Action
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$executable = [System.IO.Path]::GetFullPath(
    (Join-Path $projectRoot "build\adaptive-interview.exe")
)
$buildDirectory = Join-Path $projectRoot "build"
$pidFile = Join-Path $buildDirectory "adaptive-interview.pid"
$logDirectory = Join-Path $buildDirectory "logs"
$port = 8080
$url = "http://localhost:$port"
$healthUrl = "http://127.0.0.1:$port/api/health"

function Get-ListeningProcessIds {
    try {
        return @(
            Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
                Select-Object -ExpandProperty OwningProcess -Unique
        )
    }
    catch {
        throw "Cannot safely inspect port $port. Run this script in Windows PowerShell with networking access."
    }
}

function Get-ProcessExecutablePath([int]$ProcessId) {
    $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if ($null -eq $process) {
        return $null
    }
    try {
        return $process.Path
    }
    catch {
        $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" `
            -ErrorAction SilentlyContinue
        if ($null -ne $processInfo) {
            return $processInfo.ExecutablePath
        }
        return $null
    }
}

function Test-InterviewHealth {
    try {
        $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2
        return (
            $health.status -eq "ok" -and
            $health.evaluator -eq "rule-based"
        )
    }
    catch {
        return $false
    }
}

function Open-InterviewWebsite {
    Start-Process $url
    Write-Host "Opened $url in your default browser."
}

function Find-ProjectListenerIds {
    $matchingIds = @()
    foreach ($processId in (Get-ListeningProcessIds)) {
        $processPath = Get-ProcessExecutablePath ([int]$processId)
        if ($processPath -and
            [System.IO.Path]::GetFullPath($processPath) -ieq $executable) {
            $matchingIds += [int]$processId
        }
    }
    return @($matchingIds | Select-Object -Unique)
}

switch ($Action) {
    "Check" {
        if (Test-InterviewHealth) {
            Write-Host "An interview server is already responding at $url."
            Open-InterviewWebsite
            exit 10
        }

        $listeners = @(Get-ListeningProcessIds)
        if ($listeners.Count -gt 0) {
            throw "Port $port is already in use by another process. No server was started."
        }
        Write-Host "Port $port is available."
        exit 0
    }

    "Start" {
        if (Test-InterviewHealth) {
            Write-Host "An interview server is already responding at $url."
            Open-InterviewWebsite
            exit 0
        }

        $listeners = @(Get-ListeningProcessIds)
        if ($listeners.Count -gt 0) {
            throw "Port $port is already in use by another process. No duplicate server was started."
        }
        if (-not (Test-Path -LiteralPath $executable -PathType Leaf)) {
            throw "The backend executable was not found at $executable."
        }

        New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
        $stdoutLog = Join-Path $logDirectory "server.stdout.log"
        $stderrLog = Join-Path $logDirectory "server.stderr.log"
        $env:PORT = [string]$port

        Write-Host "Starting the C++ backend from $executable ..."
        $server = Start-Process `
            -FilePath $executable `
            -WorkingDirectory $projectRoot `
            -WindowStyle Hidden `
            -RedirectStandardOutput $stdoutLog `
            -RedirectStandardError $stderrLog `
            -PassThru
        Set-Content -LiteralPath $pidFile -Value $server.Id -NoNewline

        $deadline = (Get-Date).AddSeconds(45)
        while ((Get-Date) -lt $deadline) {
            Start-Sleep -Milliseconds 500
            if (Test-InterviewHealth) {
                Write-Host "Backend health check passed."
                Open-InterviewWebsite
                exit 0
            }
            if ($server.HasExited) {
                Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
                throw "The backend exited before becoming ready. Check build\logs\server.stderr.log and build\logs\server.stdout.log."
            }
        }

        $runningPath = Get-ProcessExecutablePath $server.Id
        if ($runningPath -and
            [System.IO.Path]::GetFullPath($runningPath) -ieq $executable) {
            Stop-Process -Id $server.Id -ErrorAction SilentlyContinue
        }
        Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
        throw "The backend did not become ready within 45 seconds. Check build\logs\server.stderr.log and build\logs\server.stdout.log."
    }

    "Stop" {
        $projectProcessIds = @(Find-ProjectListenerIds)
        if ($projectProcessIds.Count -eq 0 -and
            (Test-Path -LiteralPath $pidFile -PathType Leaf)) {
            $savedIdText = (Get-Content -LiteralPath $pidFile -Raw).Trim()
            $savedId = 0
            if ([int]::TryParse($savedIdText, [ref]$savedId)) {
                $savedPath = Get-ProcessExecutablePath $savedId
                if ($savedPath -and
                    [System.IO.Path]::GetFullPath($savedPath) -ieq $executable) {
                    $projectProcessIds = @($savedId)
                }
            }
        }

        if ($projectProcessIds.Count -eq 0) {
            Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
            Write-Host "No Adaptive Interview Challenge server is running on port $port."
            exit 0
        }

        foreach ($processId in $projectProcessIds) {
            $processPath = Get-ProcessExecutablePath $processId
            if (-not $processPath -or
                [System.IO.Path]::GetFullPath($processPath) -ine $executable) {
                throw "Process $processId could not be verified as this project's backend; it was not stopped."
            }
            Stop-Process -Id $processId -ErrorAction Stop
            Write-Host "Stopped this project's backend process (PID $processId)."
        }

        Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
        exit 0
    }
}
