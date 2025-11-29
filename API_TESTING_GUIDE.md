# HATOD API Testing Guide

## Your API Base URL

```
https://hatod-app-production.up.railway.app
```

All API endpoints: `https://hatod-app-production.up.railway.app/api/...`

---

## Quick Test Methods

### Method 1: Browser (Easiest)

Just open these URLs in your browser:

1. **Health Check:**
   ```
   https://hatod-app-production.up.railway.app/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Test Endpoint:**
   ```
   https://hatod-app-production.up.railway.app/api/test
   ```
   Should return: `{"test":"ok"}`

### Method 2: PowerShell (Windows)

```powershell
# Health check
Invoke-RestMethod -Uri "https://hatod-app-production.up.railway.app/health"

# Test endpoint
Invoke-RestMethod -Uri "https://hatod-app-production.up.railway.app/api/test"
```

### Method 3: Postman/Insomnia (Recommended for Full Testing)

Download Postman: https://www.postman.com/downloads/

---

## Full API Testing Workflow

### Step 1: Test Basic Endpoints

#### Health Check
```
GET https://hatod-app-production.up.railway.app/health
```
**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-28T..."
}
```

#### Test Endpoint
```
GET https://hatod-app-production.up.railway.app/api/test
```
**Expected Response:**
```json
{
  "test": "ok"
}
```

---

### Step 2: Register a New User

```
POST https://hatod-app-production.up.railway.app/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123",
  "fullName": "Test User",
  "role": "customer"
}
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "...",
      "email": "test@example.com",
      "fullName": "Test User",
      "role": "customer"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "..."
  }
}
```

**Save the `token` - you'll need it for authenticated requests!**

---

### Step 3: Login

```
POST https://hatod-app-production.up.railway.app/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "user": {
      "id": "...",
      "email": "test@example.com",
      "fullName": "Test User"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "..."
  }
}
```

---

### Step 4: Get Restaurants (Public)

```
GET https://hatod-app-production.up.railway.app/api/restaurants
```

**Expected Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "...",
      "name": "Restaurant Name",
      "cuisine": "Italian",
      "rating": 4.5,
      "deliveryTime": "30-45 min",
      ...
    }
  ]
}
```

---

### Step 5: Get Restaurant Menu

```
GET https://hatod-app-production.up.railway.app/api/restaurants/:restaurantId/menu
```

Replace `:restaurantId` with an actual restaurant ID from Step 4.

---

### Step 6: Get Customer Profile (Authenticated)

```
GET https://hatod-app-production.up.railway.app/api/customers/:customerId
Authorization: Bearer YOUR_TOKEN_HERE
```

Replace:
- `:customerId` - Your user ID (from login/register response)
- `YOUR_TOKEN_HERE` - The token from login/register

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "id": "...",
    "email": "test@example.com",
    "fullName": "Test User",
    "addresses": [],
    ...
  }
}
```

---

### Step 7: Add Address (Authenticated)

```
POST https://hatod-app-production.up.railway.app/api/customers/:customerId/addresses
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "street": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "country": "USA",
  "isDefault": true
}
```

---

### Step 8: Get Cart (Authenticated)

```
GET https://hatod-app-production.up.railway.app/api/cart
Authorization: Bearer YOUR_TOKEN_HERE
```

---

### Step 9: Add Item to Cart (Authenticated)

```
POST https://hatod-app-production.up.railway.app/api/cart/items
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "menuItemId": "menu-item-id-here",
  "quantity": 2,
  "specialInstructions": "No onions"
}
```

---

### Step 10: Create Order (Authenticated)

```
POST https://hatod-app-production.up.railway.app/api/orders
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "restaurantId": "restaurant-id-here",
  "deliveryAddressId": "address-id-here",
  "items": [
    {
      "menuItemId": "menu-item-id-here",
      "quantity": 2,
      "price": 15.99
    }
  ],
  "paymentMethod": "cash",
  "specialInstructions": "Ring doorbell"
}
```

---

## Testing with Postman

### Setup Postman Collection

1. **Create New Collection:** "HATOD API"

2. **Set Collection Variables:**
   - `baseUrl`: `https://hatod-app-production.up.railway.app`
   - `token`: (will be set automatically after login)

3. **Create Requests:**

   **Health Check:**
   - Method: `GET`
   - URL: `{{baseUrl}}/health`

   **Register:**
   - Method: `POST`
   - URL: `{{baseUrl}}/api/auth/register`
   - Body (JSON):
     ```json
     {
       "email": "test@example.com",
       "password": "password123",
       "fullName": "Test User",
       "role": "customer"
     }
     ```
   - Tests (to save token):
     ```javascript
     if (pm.response.code === 200) {
       const jsonData = pm.response.json();
       pm.collectionVariables.set("token", jsonData.data.token);
       pm.collectionVariables.set("userId", jsonData.data.user.id);
     }
     ```

   **Login:**
   - Method: `POST`
   - URL: `{{baseUrl}}/api/auth/login`
   - Body (JSON):
     ```json
     {
       "email": "test@example.com",
       "password": "password123"
     }
     ```

   **Get Restaurants:**
   - Method: `GET`
   - URL: `{{baseUrl}}/api/restaurants`

   **Get Profile (Authenticated):**
   - Method: `GET`
   - URL: `{{baseUrl}}/api/customers/{{userId}}`
   - Headers:
     - `Authorization`: `Bearer {{token}}`

---

## Testing with PowerShell Script

Create a file `test-api.ps1`:

```powershell
$baseUrl = "https://hatod-app-production.up.railway.app"

# Test health
Write-Host "Testing Health Endpoint..." -ForegroundColor Green
$health = Invoke-RestMethod -Uri "$baseUrl/health"
Write-Host "Health: $($health.status)" -ForegroundColor Cyan

# Test register
Write-Host "`nTesting Register..." -ForegroundColor Green
$registerData = @{
    email = "test$(Get-Random)@example.com"
    password = "password123"
    fullName = "Test User"
    role = "customer"
} | ConvertTo-Json

$registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" `
    -Method Post `
    -Body $registerData `
    -ContentType "application/json"

$token = $registerResponse.data.token
$userId = $registerResponse.data.user.id
Write-Host "Registered! Token: $($token.Substring(0, 20))..." -ForegroundColor Cyan

# Test get restaurants
Write-Host "`nTesting Get Restaurants..." -ForegroundColor Green
$restaurants = Invoke-RestMethod -Uri "$baseUrl/api/restaurants"
Write-Host "Found $($restaurants.data.Count) restaurants" -ForegroundColor Cyan

# Test get profile (authenticated)
Write-Host "`nTesting Get Profile..." -ForegroundColor Green
$headers = @{
    Authorization = "Bearer $token"
}
$profile = Invoke-RestMethod -Uri "$baseUrl/api/customers/$userId" -Headers $headers
Write-Host "Profile: $($profile.data.fullName)" -ForegroundColor Cyan

Write-Host "`n✅ All tests passed!" -ForegroundColor Green
```

Run it:
```powershell
.\test-api.ps1
```

---

## Testing with curl (Linux/Mac/Git Bash)

```bash
# Health check
curl https://hatod-app-production.up.railway.app/health

# Register
curl -X POST https://hatod-app-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "fullName": "Test User",
    "role": "customer"
  }'

# Login
curl -X POST https://hatod-app-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Get restaurants
curl https://hatod-app-production.up.railway.app/api/restaurants

# Get profile (replace TOKEN and USER_ID)
curl https://hatod-app-production.up.railway.app/api/customers/USER_ID \
  -H "Authorization: Bearer TOKEN"
```

---

## Common API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token

### Restaurants
- `GET /api/restaurants` - List all restaurants
- `GET /api/restaurants/:id` - Get restaurant details
- `GET /api/restaurants/:id/menu` - Get restaurant menu

### Customers
- `GET /api/customers/:id` - Get customer profile
- `POST /api/customers/:id/addresses` - Add address
- `GET /api/customers/:id/addresses` - Get addresses
- `DELETE /api/customers/:id/addresses/:addressId` - Delete address

### Cart
- `GET /api/cart` - Get cart
- `POST /api/cart/items` - Add item to cart
- `PUT /api/cart/items/:itemId` - Update cart item
- `DELETE /api/cart/items/:itemId` - Remove item from cart

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get order details

---

## Troubleshooting

### 401 Unauthorized
- Token is missing or expired
- Add `Authorization: Bearer YOUR_TOKEN` header

### 404 Not Found
- Check URL path (should start with `/api/`)
- Verify endpoint exists

### 500 Internal Server Error
- Check Railway logs
- Database connection issue
- Missing environment variables

### 502 Bad Gateway
- Server not running
- Check Railway logs
- Wait 30-60 seconds for service to start

---

## Next Steps

1. ✅ Test basic endpoints (health, test)
2. ✅ Register a test user
3. ✅ Login and get token
4. ✅ Test authenticated endpoints
5. ✅ Test full order flow (restaurant → menu → cart → order)

Your API is ready to use! 🚀


