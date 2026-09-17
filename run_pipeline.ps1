param(
    [string]$Season = "2026_27",
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$venvPython = Join-Path $projectRoot "venv\Scripts\python.exe"
$requirements = Join-Path $projectRoot "backend\requirements.txt"
$environmentFile = Join-Path $projectRoot "backend\.env"

Set-Location $projectRoot

if (-not (Test-Path -LiteralPath $environmentFile)) {
    throw "backend\.env is missing. Add the Supabase URL, anon key, and service-role key before running the pipeline."
}

if (-not (Test-Path -LiteralPath $venvPython)) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Cyan
    $pythonLauncher = Get-Command py -ErrorAction SilentlyContinue
    if ($pythonLauncher) {
        & py -3.11 -m venv "venv"
    } else {
        & python -m venv "venv"
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Could not create the Python virtual environment."
        exit 1
    }
}

if (-not $SkipInstall) {
    Write-Host "Checking Python dependencies..." -ForegroundColor Cyan
    & $venvPython -m pip install --disable-pip-version-check --quiet -r $requirements
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Dependency installation failed."
        exit 1
    }
}

Write-Host "Running the complete FPL pipeline for $Season..." -ForegroundColor Cyan
& $venvPython "backend\sync_daily.py" --season $Season
if ($LASTEXITCODE -ne 0) {
    $pipelineExitCode = $LASTEXITCODE
    Write-Host "Pipeline stopped. Follow the corrective action immediately above." -ForegroundColor Red
    exit $pipelineExitCode
}

Write-Host "Pipeline completed successfully." -ForegroundColor Green
