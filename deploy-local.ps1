Set-Location $PSScriptRoot

Write-Host "Building..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Build failed." -ForegroundColor Red; exit 1 }

$msg = Read-Host "Commit message"
if (-not $msg) { $msg = "deploy: build update" }

git add -A
git commit -m $msg
git push

Write-Host "Done." -ForegroundColor Green
