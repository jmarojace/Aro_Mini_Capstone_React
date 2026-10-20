# Mini Store Inventory System

A small inventory and sales system for mini stores. The frontend is React + Vite and the API is Laravel 12 with Sanctum token authentication. The example environment uses SQLite for an easy local start; this workspace's `.env` is set to MySQL. Keep your own database settings in `.env` and run migrations for that database.

## Start the app

Open two terminals in the project folder.

### 1. Start the API

```powershell
cd backend
copy .env.example .env   # only if .env does not exist yet
php artisan key:generate  # only for a new .env
if (!(Test-Path database/database.sqlite)) { New-Item database/database.sqlite -ItemType File }
php artisan migrate --seed
php artisan storage:link
php artisan serve
```

The API runs at `http://127.0.0.1:8000`. The default database is SQLite at `backend/database/database.sqlite`.

### 2. Start the frontend

```powershell
cd fontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal. The frontend defaults to `http://127.0.0.1:8000/api`; set `VITE_API_URL` in `fontend/.env` to change it.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@gmail.com` | `admin123` |
| Staff | `staff@gmail.com` | `staff123` |

These are local demo credentials created by the seeder. Change or remove them before deploying the app. New registrations are always assigned the staff role; users cannot register themselves as admins.

## Features

- Sanctum login, logout, current-user endpoint, and admin-only authorization.
- Product and category management, search by product name or SKU, stock filters, and paginated products.
- Stock in, stock out, direct quantity adjustments, and an inventory audit trail.
- Sales with multiple products, invoice numbers, saved sale prices, and automatic stock deduction inside a database transaction.
- Restock request workflow: pending → approved → received. Inventory is increased only on receipt. Staff can submit requests and see their own; admins can manage all requests.
- Order status tracking from processing through ready and completion, with stock returned and logged when an order is cancelled.
- Per-user product wishlists and product image uploads stored on Laravel's public disk.
- Dashboard totals, low-stock and out-of-stock alerts, today's sales, and best sellers.
- A seven-day sales chart and category filtering for the product catalogue.
- Responsive React interface with sign-in progress, empty states, confirmation prompts, and status messages.

## API outline

All API paths are under `/api`.

| Method | Path | Access |
| --- | --- | --- |
| POST | `/auth/login`, `/auth/register` | Public (registration creates staff) |
| GET | `/auth/me`; POST `/auth/logout` | Signed in |
| GET | `/products`, `/categories`, `/sales` | Signed in |
| POST | `/sales` | Signed in |
| GET/POST | `/restocks` | Signed in (staff sees their own) |
| GET/POST/DELETE | `/wishlist` | Signed in (personal list) |
| GET | `/dashboard`, `/inventory/transactions` | Admin |
| POST/PUT/DELETE | `/categories`, `/products` | Admin |
| POST | `/products/{product}/stock` | Admin |
| PATCH | `/sales/{sale}/status` | Admin (order tracking) |
| PATCH | `/restocks/{restock}` | Admin |

Send the login token in `Authorization: Bearer <token>`. Validation errors use Laravel's standard `422` JSON response.

## Stack

- React 18, Vite, React Router, Axios, Context API, and Tailwind CSS utilities
- Laravel 12, PHP 8.2+, Sanctum
- SQLite by default; MySQL can be selected in `backend/.env`

## Docker deployment

The repository includes Dockerfiles for the Laravel API and React frontend, plus a MySQL-backed Compose setup. For a public VM, point `APP_URL` and `VITE_API_URL` at the public API address, set `CORS_ALLOWED_ORIGINS` to the frontend origin, and put both services behind HTTPS. Keep the database and uploaded-image volumes persistent.

In PowerShell, set unique secrets and public URLs before starting the stack:

```powershell
$keyBytes = New-Object byte[] 32
$random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$random.GetBytes($keyBytes)
$random.Dispose()
$env:APP_KEY = "base64:$([Convert]::ToBase64String($keyBytes))"
$env:DB_PASSWORD = Read-Host "Database password"
$env:DB_ROOT_PASSWORD = Read-Host "Database root password"
$env:APP_URL = "https://api.example.com"
$env:CORS_ALLOWED_ORIGINS = "https://store.example.com"
$env:VITE_API_URL = "https://api.example.com/api"
docker compose up --build -d
```

Replace the example domains with your HTTPS domains. The API runs on port `8000` and the frontend on port `8080` by default. The API container runs migrations on startup. Product uploads are stored in the persistent `backend-storage` volume.
