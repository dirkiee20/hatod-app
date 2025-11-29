# HATOD API Testing Script
# Run this script to test your deployed API

$baseUrl = "https://hatod-app-production.up.railway.app"
$token = $null
$userId = $null

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "HATOD API Testing Script" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "[1/6] Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -ErrorAction Stop
    Write-Host "  ✅ Health: $($health.status)" -ForegroundColor Green
    Write-Host "  Timestamp: $($health.timestamp)" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ Health check failed: $_" -ForegroundColor Red
    exit 1
}

# Test 2: Test Endpoint
Write-Host "`n[2/6] Testing Test Endpoint..." -ForegroundColor Yellow
try {
    $test = Invoke-RestMethod -Uri "$baseUrl/api/test" -ErrorAction Stop
    Write-Host "  ✅ Test: $($test.test)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Test endpoint failed: $_" -ForegroundColor Red
}

# Test 3: Register New User
Write-Host "`n[3/6] Testing User Registration..." -ForegroundColor Yellow
$randomEmail = "test$(Get-Random -Minimum 1000 -Maximum 9999)@example.com"
$registerData = @{
    email = $randomEmail
    password = "password123"
    fullName = "Test User"
    role = "customer"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" `
        -Method Post `
        -Body $registerData `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    $token = $registerResponse.data.token
    $userId = $registerResponse.data.user.id
    Write-Host "  ✅ Registered successfully!" -ForegroundColor Green
    Write-Host "  Email: $randomEmail" -ForegroundColor Gray
    Write-Host "  User ID: $userId" -ForegroundColor Gray
    Write-Host "  Token: $($token.Substring(0, 30))..." -ForegroundColor Gray
} catch {
    Write-Host "  ❌ Registration failed: $_" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "  Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

# Test 4: Get Restaurants
Write-Host "`n[4/6] Testing Get Restaurants..." -ForegroundColor Yellow
try {
    $restaurants = Invoke-RestMethod -Uri "$baseUrl/api/restaurants" -ErrorAction Stop
    $count = if ($restaurants.data) { $restaurants.data.Count } else { 0 }
    Write-Host "  ✅ Found $count restaurants" -ForegroundColor Green
    if ($count -gt 0) {
        Write-Host "  First restaurant: $($restaurants.data[0].name)" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ❌ Get restaurants failed: $_" -ForegroundColor Red
}

# Test 5: Get Profile (Authenticated)
if ($token -and $userId) {
    Write-Host "`n[5/6] Testing Get Profile (Authenticated)..." -ForegroundColor Yellow
    try {
        $headers = @{
            Authorization = "Bearer $token"
        }
        $profile = Invoke-RestMethod -Uri "$baseUrl/api/customers/$userId" -Headers $headers -ErrorAction Stop
        Write-Host "  ✅ Profile retrieved!" -ForegroundColor Green
        Write-Host "  Name: $($profile.data.fullName)" -ForegroundColor Gray
        Write-Host "  Email: $($profile.data.email)" -ForegroundColor Gray
    } catch {
        Write-Host "  ❌ Get profile failed: $_" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            Write-Host "  Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "`n[5/6] Skipping authenticated test (no token)" -ForegroundColor Yellow
}

# Test 6: Login
Write-Host "`n[6/6] Testing Login..." -ForegroundColor Yellow
if ($randomEmail) {
    $loginData = @{
        email = $randomEmail
        password = "password123"
    } | ConvertTo-Json
    
    try {
        $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" `
            -Method Post `
            -Body $loginData `
            -ContentType "application/json" `
            -ErrorAction Stop
        
        Write-Host "  ✅ Login successful!" -ForegroundColor Green
        Write-Host "  Token: $($loginResponse.data.token.Substring(0, 30))..." -ForegroundColor Gray
    } catch {
        Write-Host "  ❌ Login failed: $_" -ForegroundColor Red
    }
} else {
    Write-Host "  ⚠️ Skipping (no test user created)" -ForegroundColor Yellow
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Testing Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nYour API is working! 🚀" -ForegroundColor Green
Write-Host "`nBase URL: $baseUrl" -ForegroundColor Gray
if ($token) {
    Write-Host "Test Token: $($token.Substring(0, 30))..." -ForegroundColor Gray
    Write-Host "`nYou can use this token to test authenticated endpoints!" -ForegroundColor Yellow
}


