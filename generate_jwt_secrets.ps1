# Generate JWT Secrets for Deployment
# Run this script to generate secure random strings for JWT_SECRET and JWT_REFRESH_SECRET

Write-Host "Generating JWT Secrets..." -ForegroundColor Green
Write-Host ""

# Generate JWT_SECRET (64 characters)
$jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})

# Generate JWT_REFRESH_SECRET (64 characters)
$jwtRefreshSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})

Write-Host "JWT_SECRET:" -ForegroundColor Yellow
Write-Host $jwtSecret -ForegroundColor Cyan
Write-Host ""
Write-Host "JWT_REFRESH_SECRET:" -ForegroundColor Yellow
Write-Host $jwtRefreshSecret -ForegroundColor Cyan
Write-Host ""

# Copy to clipboard
$jwtSecret | Set-Clipboard
Write-Host "JWT_SECRET copied to clipboard!" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to copy JWT_REFRESH_SECRET to clipboard..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
$jwtRefreshSecret | Set-Clipboard
Write-Host "JWT_REFRESH_SECRET copied to clipboard!" -ForegroundColor Green

Write-Host ""
Write-Host "Add these to your Railway/Render environment variables!" -ForegroundColor Green

