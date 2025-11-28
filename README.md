# HATOD - Food Ordering & Delivery System

A modern food ordering and delivery platform with a fully responsive frontend (HTML + Tailwind CSS) and a production-ready REST API powered by Node.js, Express, and PostgreSQL.

## 🚀 Features

- Responsive frontend built with HTML5 and Tailwind CSS
- Role-based portals for customers, restaurants, riders, and admins
- Express API with JWT auth, validation, and centralized error handling
- PostgreSQL schema covering restaurants, menus, orders, deliveries, payments, and reviews
- Database-backed endpoints using parameterized SQL and transactions
- Modular architecture with clear separation of routes, controllers, middleware, and utilities

## 📋 Prerequisites

- **Node.js** ≥ 18.x (LTS recommended) – [download](https://nodejs.org/)
- **npm** (bundled with Node.js)
- **PostgreSQL** ≥ 13.x

## 👤 Demo Accounts

After running the database setup, you can use these demo accounts to test the application:

| Role | Email | Password | Notes |
| --- | --- | --- | --- |
| Admin | `admin@hatod.com` | `password123` | Full system access |
| Restaurant Owner | `mario@pizza.com` | `password123` | Manage restaurant and menu |
| Delivery Rider | `john@rider.com` | `password123` | Handle deliveries |
| Customer | `customer@example.com` | `password123` | Place orders |

## ️ Installation

```bash
npm install
```

## ⚙️ Environment Variables

Create a `.env` file in the project root (see `docs/env.example`) and configure:

| Variable | Description | Example |
| --- | --- | --- |
| `PORT` | API port | `4000` |
| `CORS_ORIGIN` | Comma-separated whitelist of origins | `http://localhost:8080` |
| `DATABASE_URL` | Full PostgreSQL connection string | `postgres://user:pw@localhost:5432/hatod` |
| `PGHOST` / `PGPORT` / `PGUSER` / `PGPASSWORD` / `PGDATABASE` | Alternative DB settings if `DATABASE_URL` not provided | – |
| `PGSSL` | Enable SSL (`true`/`false`) | `false` |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Secrets for JWT signing | – |
| `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Token TTLs | `1h` / `7d` |
| `BCRYPT_SALT_ROUNDS` | Hashing cost factor | `12` |

> Apply the schema (`database/schema.sql`) and optional seed data (`database/seed.sql`) before starting the API.

## 🚦 Running the project

### API Server

```bash
npm run server       # starts Express on PORT (default 4000)
# or
npm run dev:server   # starts with nodemon
```

### Frontend

```bash
npm run build:css    # one-time CSS build
npm start            # build CSS and serve static site on 8080
```

For live development:

```bash
# Terminal 1
npm run dev          # watch Tailwind CSS

# Terminal 2
npm run serve        # serve static site on 8080
```

## 🌐 Frontend → API integration

Expose the API URL before page scripts run:

```html
<script>
  window.__HATOD_API_BASE_URL__ = 'http://localhost:4000/api';
</script>
<script src="../../public/dhws-data-injector.js"></script>
```

If omitted, the frontend falls back to `${window.location.origin}/api`.

## 📁 Project structure

```
hatod-system/
├── api/                   # Express application
│   ├── app.js             # Express bootstrap
│   ├── server.js          # HTTP server entry point
│   ├── config/            # DB and configuration helpers
│   ├── controllers/       # Route handlers
│   ├── middleware/        # Auth, validation, error handling
│   ├── routes/            # Route definitions
│   └── utils/             # Shared helpers (async, tokens, errors)
├── css/                   # Tailwind source and compiled CSS
├── database/              # SQL schema, seeds, setup scripts
├── pages/                 # Static HTML pages
├── public/                # Static assets + client helpers
├── index.html             # Landing page
├── package.json           # Scripts & dependencies
└── tailwind.config.js     # Tailwind configuration
```

## 📦 NPM scripts

| Script | Purpose |
| --- | --- |
| `build:css` | Compile Tailwind once |
| `watch:css` / `dev` | Watch and recompile Tailwind |
| `serve` | Serve static frontend (http-server @ 8080) |
| `start` | Build CSS then serve frontend |
| `server` | Start Express API |
| `dev:server` | Start Express API with nodemon |

## 🛣️ REST API Reference

Base URL: `http://localhost:4000/api`

### Auth

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/auth/register` | Customer/restaurant self-registration |
| `POST` | `/auth/login` | Issue access + refresh tokens |
| `POST` | `/auth/refresh` | Refresh access token |

### Admin (role: `admin`)

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/admin/users` | Paginated users with filters |
| `GET` | `/admin/users/stats` | User totals & activity snapshot |
| `POST` | `/admin/users/restaurants` | Create restaurant owner + restaurant |
| `POST` | `/admin/users/delivery` | Create rider + profile |
| `PATCH` | `/admin/users/:userId/activate` | Activate user |
| `PATCH` | `/admin/users/:userId/deactivate` | Deactivate user |
| `GET` | `/admin/overview` | Dashboard totals & recent orders |
| `GET` | `/admin/orders` | Paginated order list |

### Customers (roles: `customer`, `admin`)

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/customers/:customerId/profile` | Fetch profile |
| `PUT` | `/customers/:customerId/profile` | Update profile |
| `GET` | `/customers/:customerId/addresses` | List saved addresses |
| `POST` | `/customers/:customerId/addresses` | Create address |
| `PUT` | `/customers/:customerId/addresses/:addressId` | Update address |
| `DELETE` | `/customers/:customerId/addresses/:addressId` | Delete address |
| `GET` | `/customers/:customerId/orders` | Order history |

### Restaurants

| Method | Endpoint | Description | Auth |
| --- | --- | --- | --- |
| `GET` | `/restaurants` | Public restaurant listing (filters supported) | – |
| `GET` | `/restaurants/:restaurantId` | Restaurant details | – |
| `GET` | `/restaurants/:restaurantId/menu` | Categories + menu items | – |
| `POST` | `/restaurants/:restaurantId/menu/categories` | Create category | Owner/Admin |
| `POST` | `/restaurants/:restaurantId/menu/items` | Create menu item | Owner/Admin |
| `PUT` | `/restaurants/:restaurantId/menu/items/:menuItemId` | Update menu item | Owner/Admin |
| `DELETE` | `/restaurants/:restaurantId/menu/items/:menuItemId` | Delete menu item | Owner/Admin |
| `GET` | `/restaurants/:restaurantId/orders` | Restaurant order feed | Owner/Admin |
| `PATCH` | `/restaurants/:restaurantId` | Update restaurant profile | Owner/Admin |
| `POST` | `/restaurants/:restaurantId/toggle-status` | Toggle open/closed | Owner/Admin |

### Orders

| Method | Endpoint | Description | Auth |
| --- | --- | --- | --- |
| `POST` | `/orders` | Create new order (items + totals) | Customer |
| `GET` | `/orders/:orderId` | Order details, items, delivery info | Auth required |
| `PATCH` | `/orders/:orderId/status` | Update status & timeline | Owner/Admin/Rider/Customer (based on ownership) |
| `GET` | `/orders/:orderId/history` | Status change history | Auth required |

### Delivery / Riders (roles: `delivery`, `admin`)

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/delivery/riders/:riderId/assignments` | Rider assignments (filterable) |
| `PATCH` | `/delivery/assignments/:deliveryId/status` | Update delivery status |
| `POST` | `/delivery/assignments/:deliveryId/claim` | Claim unassigned delivery |

## 🧱 Database highlights

- `users` captures all actors (customer, restaurant, rider, admin)
- `restaurants`, `menu_categories`, `menu_items` manage storefront data
- `orders`, `order_items`, `order_status_events` track purchases and timelines
- `deliveries`, `rider_profiles` manage rider assignments and capabilities
- `payments`, `reviews` support post-purchase workflows

Review `database/schema.sql` for the full schema, triggers, and indexes.

## 🙏 Acknowledgments

- Built with [Rocket.new](https://rocket.new)
- Frontend powered by HTML & Tailwind CSS
- Backend powered by Express.js & PostgreSQL
