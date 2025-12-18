# PowerShell script to start Creerlio Platform Backend
# This script handles virtual environment activation and dependency installation

Write-Host "🚀 Starting Creerlio Platform Backend..." -ForegroundColor Cyan

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$backendDir = $scriptDir
$venvPath = Join-Path $projectRoot "venv"

# Check if virtual environment exists
if (-not (Test-Path $venvPath)) {
    Write-Host "📦 Creating virtual environment..." -ForegroundColor Yellow
    python -m venv $venvPath
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to create virtual environment" -ForegroundColor Red
        exit 1
    }
}

# Activate virtual environment
$activateScript = Join-Path $venvPath "Scripts\Activate.ps1"
if (Test-Path $activateScript) {
    Write-Host "✅ Activating virtual environment..." -ForegroundColor Green
    & $activateScript
} else {
    Write-Host "❌ Virtual environment activation script not found at: $activateScript" -ForegroundColor Red
    exit 1
}

# Install/update dependencies
Write-Host "📥 Checking dependencies..." -ForegroundColor Yellow
$requirementsFile = Join-Path $projectRoot "requirements.txt"
if (Test-Path $requirementsFile) {
    pip install -q -r $requirementsFile
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Some dependencies may have failed to install" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  requirements.txt not found, skipping dependency installation" -ForegroundColor Yellow
}

# Change to backend directory
Set-Location $backendDir

# Start server
Write-Host "🌐 Starting FastAPI server..." -ForegroundColor Cyan
Write-Host "📍 Backend will run on: http://localhost:8000" -ForegroundColor Green
Write-Host ""

python main.py
