# 🚀 ZyvoPay Backend - API Gateway

Complete Banking-as-a-Service (BaaS) platform with PIX payments, TED transfers, split payments, and full financial operations management.

## 📋 Table of Contents

- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running](#running)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Edge Functions](#edge-functions)
- [Database](#database)
- [Testing](#testing)
- [Deployment](#deployment)

## 🏗️ Architecture

```
┌─────────────────┐
│   Client Apps   │
└────────┬────────┘
         │
    ┌────▼─────┐
    │  Nginx   │ (Reverse Proxy, Port 80)
    └────┬─────┘
         │
  ┌──────▼───────────┐
  │   API Gateway    │ (Node.js + Fastify, Port 8000)
  │                  │
  │  - Authentication│
  │  - Rate Limiting │
  │  - Validation    │
  │  - Logging       │
  └──────┬───────────┘
         │
  ┌──────▼───────────────────────┐
  │      Supabase Backend        │
  │                              │
  │  - PostgreSQL Database       │
  │  - Edge Functions (Deno)     │
  │  - Storage (Documents)       │
  │  - Auth System               │
  │  - Real-time Subscriptions   │
  └──────┬───────────────────────┘
         │
  ┌──────▼──────────┐
  │  Celcoin BaaS   │ (PIX, TED, Banking)
  └─────────────────┘
```

## ✨ Features

### Core Functionality
- ✅ **PIX Payments**: Instant transfers, QR codes, key management
- ✅ **TED Transfers**: Wire transfers to any Brazilian bank
- ✅ **Split Payments**: Marketplace split rules with percentage or fixed amounts
- ✅ **Subaccounts**: Multi-tenant account management (PF/PJ)
- ✅ **Scheduled Transfers**: Future-dated payments
- ✅ **Recurring Payments**: Subscription-based payments
- ✅ **Transaction History**: Complete audit trail
- ✅ **Document Management**: KYC/KYB document upload and storage
- ✅ **Transaction Backups**: Weekly automated backups
- ✅ **Webhooks**: Real-time event notifications
- ✅ **Balance Management**: Real-time balance tracking with blocking

### Technical Features
- ✅ **API Key Authentication**: Secure client authentication
- ✅ **Rate Limiting**: 60 req/min per API key (configurable)
- ✅ **Swagger Documentation**: Interactive API docs at `/api-docs`
- ✅ **Request Logging**: Complete audit trail
- ✅ **Error Handling**: Consistent error responses
- ✅ **CORS Support**: Configurable cross-origin requests
- ✅ **Health Checks**: `/health` endpoint for monitoring
- ✅ **Docker Support**: Complete containerization

## 🛠️ Tech Stack

### API Gateway
- **Node.js 18+**: Runtime environment
- **Fastify**: High-performance web framework
- **Swagger UI**: API documentation
- **Fastify Helmet**: Security headers
- **Pino**: Ultra-fast logging
- **Fastify Rate Limit**: Rate limiting middleware

### Backend Infrastructure
- **Supabase**: Backend-as-a-Service
  - PostgreSQL 15+ with advanced features
  - Edge Functions (Deno runtime)
  - Storage (S3-compatible)
  - Real-time subscriptions
  - Auth system

### Database
- **PostgreSQL 15+**: Main database
- **pg_cron**: Scheduled jobs
- **pg_net**: HTTP requests from database
- **pgsodium**: Encryption
- **Vault**: Secrets management

### External Services
- **Celcoin**: Banking-as-a-Service provider
- **Resend**: Email notifications (optional)
- **Twilio**: SMS notifications (optional)
- **FCM**: Push notifications (optional)

## 📦 Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Supabase account
- Celcoin sandbox/production credentials

## 🚀 Installation

### 1. Clone Repository
```bash
git clone https://github.com/your-org/zyvopay-backend.git
cd zyvopay-backend
```

### 2. Install Dependencies
```bash
cd api-gateway
npm install
```

### 3. Configure Environment
```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your Supabase credentials
nano .env
```

### 4. Setup Supabase

#### 4.1 Create Supabase Project
1. Go to https://supabase.com/dashboard
2. Create new project
3. Copy your project URL and service role key

#### 4.2 Run Database Migrations
All migrations are in `supabase/migrations/` directory. They will be automatically applied when you link your project:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

#### 4.3 Configure Supabase Secrets
```bash
supabase secrets set CELCOIN_CLIENT_ID=your-client-id
supabase secrets set CELCOIN_CLIENT_SECRET=your-secret
supabase secrets set CELCOIN_BASE_URL=https://sandbox.celcoin.com.br
supabase secrets set CRON_SECRET=generate-random-secret
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set TWILIO_ACCOUNT_SID=AC...
supabase secrets set TWILIO_AUTH_TOKEN=...
supabase secrets set TWILIO_PHONE_NUMBER=+55...
supabase secrets set FCM_SERVER_KEY=...
```

#### 4.4 Configure Database Settings
```sql
-- Connect to your database via Supabase SQL Editor
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
ALTER DATABASE postgres SET app.settings.supabase_service_key = 'your-service-role-key';
```

#### 4.5 Deploy Edge Functions
Edge Functions are automatically deployed. To manually deploy:
```bash
supabase functions deploy webhook-delivery-processor
supabase functions deploy celcoin-webhook-receiver
supabase functions deploy celcoin-pix-payment
supabase functions deploy webhook-transaction-completed
supabase functions deploy celcoin-create-subaccount
supabase functions deploy webhook-pix-received
supabase functions deploy cron-scheduled-transfers
supabase functions deploy api-middleware-auth
# ... and others
```

## ⚙️ Configuration

### Environment Variables

Create `.env` file:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
SUPABASE_ANON_KEY=eyJhbG...
```

### API Gateway Settings

Edit `api-gateway/src/app.js` for:
- Rate limiting
- CORS origins
- Logging level

## 🏃 Running

### Development Mode
```bash
cd api-gateway
npm run dev
```

### Production Mode with Docker
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Access Points
- **API Gateway**: http://localhost
- **Swagger Docs**: http://localhost/api-docs
- **Health Check**: http://localhost/health

## 📚 API Documentation

### Authentication

All endpoints require API key authentication:

```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost/api/subaccounts
```

Or using Bearer token:
```bash
curl -H "Authorization: Bearer your-api-key" \
  http://localhost/api/subaccounts
```

### Quick Start Guide

#### 1. Create Client Account
```bash
curl -X POST http://localhost/api/auth/clients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Company",
    "document": "12345678000190",
    "email": "company@example.com",
    "webhook_url": "https://yourapp.com/webhooks"
  }'
```

#### 2. Generate API Key
```bash
curl -X POST http://localhost/api/auth/api-keys \
  -H "X-API-Key: temp-key-from-step-1" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Key",
    "scopes": ["read", "write"]
  }'
```

#### 3. Create Subaccount
```bash
curl -X POST http://localhost/api/subaccounts \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "account_type": "PF",
    "owner_name": "John Doe",
    "owner_document": "12345678900",
    "owner_email": "john@example.com",
    "owner_phone": "+5511999999999"
  }'
```

#### 4. Create PIX Payment
```bash
curl -X POST http://localhost/api/pix/payments \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "subaccount_id": "uuid-here",
    "pix_key": "recipient@example.com",
    "pix_key_type": "EMAIL",
    "amount_cents": 10000,
    "description": "Payment for services"
  }'
```

### Interactive Documentation

Access Swagger UI at: **http://localhost/api-docs**

## 📁 Project Structure

```
backend-zyvopay/
├── api-gateway/
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.js          # Authentication middleware
│   │   ├── routes/
│   │   │   ├── auth.js          # Auth & API keys
│   │   │   ├── subaccounts.js   # Subaccount management
│   │   │   ├── pix.js           # PIX operations
│   │   │   ├── ted.js           # TED transfers
│   │   │   ├── transactions.js  # Transaction history
│   │   │   ├── splits.js        # Split rules
│   │   │   ├── scheduled.js     # Scheduled transfers
│   │   │   ├── recurring.js     # Recurring payments
│   │   │   ├── documents.js     # Document management
│   │   │   ├── backups.js       # Backup downloads
│   │   │   └── webhooks.js      # Webhook config
│   │   ├── swagger/
│   │   │   └── openapi.yaml     # API specification
│   │   └── app.js               # Main application
│   ├── nginx/
│   │   └── nginx.conf           # Nginx configuration
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
├── supabase/
│   ├── migrations/              # Database migrations (57 RPCs)
│   └── functions/               # Edge Functions (17 functions)
│       ├── _shared/
│       │   ├── celcoin-client.ts
│       │   ├── supabase-client.ts
│       │   ├── validators.ts
│       │   └── types.ts
│       ├── webhook-delivery-processor/
│       ├── celcoin-webhook-receiver/
│       ├── celcoin-pix-payment/
│       ├── webhook-transaction-completed/
│       ├── celcoin-create-subaccount/
│       ├── webhook-pix-received/
│       ├── cron-scheduled-transfers/
│       ├── api-middleware-auth/
│       ├── webhook-transaction-failed/
│       ├── celcoin-ted-transfer/
│       ├── cron-recurring-payments/
│       ├── worker-notification-sender/
│       ├── webhook-subaccount-created/
│       ├── cron-balance-snapshots/
│       ├── cron-weekly-backups/
│       ├── health-check/
│       └── upload-document/
├── docker-compose.yml
├── .env.example
├── README.md
└── EDGE_FUNCTIONS_PLAN.md
```

## 🔥 Edge Functions

### Webhook Processors (5)
1. **webhook-delivery-processor**: Delivers webhooks to clients with retry logic
2. **webhook-transaction-completed**: Executes splits and notifications
3. **webhook-transaction-failed**: Unblocks balance and notifies
4. **webhook-pix-received**: Processes incoming PIX receipts
5. **webhook-subaccount-created**: Sends welcome emails

### Celcoin Integration (4)
6. **celcoin-create-subaccount**: Creates Celcoin BaaS accounts
7. **celcoin-pix-payment**: Executes PIX payments via Celcoin
8. **celcoin-ted-transfer**: Executes TED transfers
9. **celcoin-webhook-receiver**: Receives Celcoin webhooks

### Cron Jobs (4)
10. **cron-scheduled-transfers**: Processes scheduled transfers (every minute)
11. **cron-recurring-payments**: Processes recurring payments (hourly)
12. **cron-balance-snapshots**: Creates daily balance snapshots
13. **cron-weekly-backups**: Creates weekly transaction backups

### Utility Functions (3)
14. **api-middleware-auth**: Validates API keys and rate limits
15. **upload-document**: Handles document uploads
16. **health-check**: System health monitoring

## 🗄️ Database

### Tables (30+)
- **clients**: API clients (companies using ZyvoPay)
- **subaccounts**: Sub-accounts for end users
- **transactions**: All financial transactions
- **pix_keys**: PIX key registrations
- **pix_qr_codes**: QR code management
- **split_rules**: Split payment configurations
- **scheduled_transfers**: Future transfers
- **recurring_payments**: Subscription payments
- **documents**: KYC/KYB documents
- **transaction_backups**: Backup metadata
- **webhook_deliveries**: Webhook delivery logs
- **api_keys**: Client API keys
- **audit_logs**: System audit trail
- And more...

### RPCs (57)
Complete list of database functions for:
- Authentication & API keys
- Subaccount management
- PIX operations
- TED transfers
- Split payments
- Scheduled & recurring payments
- Balance management
- Document handling
- Compliance & fraud detection

## 🧪 Testing

```bash
# Run tests
npm test

# Test API endpoints
curl http://localhost/health

# Check Swagger docs
open http://localhost/api-docs
```

## 🚢 Deployment

### Production Checklist

- [ ] Configure production Supabase project
- [ ] Set all required secrets in Supabase
- [ ] Configure production Celcoin credentials
- [ ] Set up SSL certificates for Nginx
- [ ] Configure production domain
- [ ] Set up monitoring and logging
- [ ] Configure backup retention policies
- [ ] Set up alerting for failures
- [ ] Review rate limits
- [ ] Configure CORS for production domains

### Docker Production
```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f

# Scale API gateway
docker-compose up -d --scale api=3
```

## 📊 Monitoring

### Health Checks
```bash
# API Gateway health
curl http://localhost/health

# Edge Functions health
curl https://your-project.supabase.co/functions/v1/health-check \
  -H "Authorization: Bearer SERVICE_KEY"
```

### Logs
```bash
# API Gateway logs
docker-compose logs -f api

# Nginx logs
docker-compose logs -f nginx

# Supabase Edge Function logs
# View in Supabase Dashboard > Edge Functions > Logs
```

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Support

For support, email support@zyvopay.com or open an issue in the repository.

## 🔗 Links

- [Supabase Documentation](https://supabase.com/docs)
- [Celcoin API Docs](https://developers.celcoin.com.br)
- [Swagger/OpenAPI Spec](http://localhost/api-docs)

---

**Built with ❤️ by ZyvoPay Team**