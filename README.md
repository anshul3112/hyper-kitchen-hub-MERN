# Hyper Kitchen Hub

### Self-Ordering Kiosk Management Platform

A **multi-tenant restaurant kiosk platform** that enables quick service restaurants (QSR) to manage self-ordering kiosks, digital menus, inventory, analytics, and real-time order workflows across multiple outlets.

Customers can browse menus, place orders, and receive smart recommendations directly from kiosks, while restaurant staff manage operations through administrative dashboards and kitchen display systems.

The platform is inspired by modern self-ordering systems used by companies like McDonald's and Burger King and aims to replicate real-world restaurant technology architecture including asynchronous order processing, dynamic menu management, and intelligent upselling.

---

# System Overview

The platform is designed around **multiple operational roles and interfaces** to manage restaurant operations efficiently.

## Super Admin
Platform-level management and monitoring.

Responsibilities:
- Manage tenants (restaurant brands)
- Manage tenant administrators
- Monitor platform-wide analytics
- Configure recommendation system weights
- Monitor overall system activity

---

## Tenant Admin
Brand-level administration.

Responsibilities:
- Manage outlets belonging to a tenant
- Configure languages available on kiosks
- Monitor analytics across outlets
- Manage tenant user profiles
- Configure tenant settings

---

## Outlet Admin
Outlet-level operational management.

Responsibilities:
- Manage menu items, categories, and filters
- Manage inventory and stock thresholds
- Configure combo offers and upselling relationships
- Configure recommendation rules
- Manage kiosks belonging to the outlet
- Configure time-based pricing and availability schedules
- Monitor outlet-level analytics

---

## Kiosk Interface
Customer-facing ordering interface used inside the restaurant.

Capabilities:
- Browse menu items
- View detailed item information
- Select dine-in or takeaway orders
- Receive combo and upsell suggestions
- View estimated order preparation time
- Place orders directly from the kiosk

---

## Kitchen Screen
Operational screen used by restaurant staff to process incoming orders.

Capabilities:
- View incoming orders
- Update order preparation status
- Track order workflow

---

## Order Display Screen
Customer-facing display screen showing order readiness.

Capabilities:
- Show active order numbers
- Notify customers when orders are ready

---

# Core System Features

## Multi-Tenant Architecture
The platform supports multiple restaurant brands (tenants), each with multiple outlets and kiosks. This architecture enables centralized platform management while isolating tenant data.

---

## Dynamic Menu Management
Admins can configure menus dynamically with support for:

- Categories and filters
- Item availability controls
- Item preparation times
- Combo relationships
- Inventory tracking
- Multi-language menu content

Items can be enabled or disabled for kiosk ordering without removing them from the database.

---

## Inventory Management
Inventory is managed at the outlet level with features including:

- Real-time stock updates
- Low-stock threshold alerts
- Visual stock indicators in admin dashboards
- Inventory-aware recommendation logic

Inventory is automatically updated after orders are processed.

---

## Time-Based Pricing and Availability
The system includes a **scheduling engine** allowing outlet admins to define multiple time slots controlling:

- Dynamic item pricing
- Item availability
- Weekly scheduling rules
- Priority resolution for overlapping schedules

This enables features like breakfast menus, lunch pricing, and happy-hour discounts.

---

## Order Processing Architecture
Orders placed from kiosks are processed asynchronously to improve reliability and scalability.

The system uses:

- Amazon SQS for asynchronous order processing
- Sequential processing per outlet using message groups
- Retry logic and duplicate message detection

This approach removes heavy database transactions while maintaining order consistency.

---

## Intelligent Recommendation System
The kiosk integrates a **multi-signal recommendation engine** designed to increase order value and improve menu discovery.

Recommendation signals include:

- Admin-configured recommendation rules
- Historical ordering patterns
- Inventory availability
- Profit margin prioritization

These signals are merged into a weighted scoring system that determines which items are suggested to customers.

Super Admins can configure recommendation weights to adjust system behavior.

---

## Dynamic Upselling and Combo Suggestions
During the ordering process, the kiosk suggests:

- Combo upgrades
- Higher-value items
- Complementary products

Suggestions are generated dynamically based on menu relationships and recommendation signals.

---

## Analytics and Reporting
The platform provides analytics dashboards for different user roles using aggregation pipelines.

Available insights include:

- Order history
- Revenue metrics
- Time-based sales analysis
- Outlet performance comparisons

Analytics APIs support filtering by:

- Tenant
- Outlet
- Date range
- Order status

Cursor-based pagination is used to efficiently handle large datasets.

---

## Multilingual Menu Support
Menu content supports multiple languages.

Features include:

- Multilingual item names and descriptions
- Tenant-configurable kiosk languages
- Automatic fallback to default language when translations are missing

Static UI translations are handled on the frontend.

---

## Offline Resilience
Kiosk devices maintain limited offline resilience using browser storage.

Inventory updates and item changes are cached locally, allowing kiosks to notify users if menu data has changed before checkout.

---

## Media Management
Menu images and category images are stored using cloud storage.

Uploads are handled using pre-signed URLs allowing clients to upload directly without routing files through the backend server.

---

## Real-Time Communication
The platform uses real-time messaging to synchronize events between kiosks, kitchen screens, and display systems.

This enables:

- Instant order status updates
- Kitchen workflow synchronization
- Real-time order notifications

---

# System Infrastructure

The platform integrates several infrastructure components to improve scalability and performance.

### Database
MongoDB is used as the primary database for storing menu data, orders, users, and analytics records.

### Caching
Redis is used to cache frequently accessed menu data to reduce database load and improve kiosk response times.

### Asynchronous Processing
Amazon SQS is used to process orders asynchronously and ensure sequential order handling per outlet.

### Cloud Storage
AWS S3 is used for storing images such as menu items, categories, and filters.

### Real-Time Communication
WebSocket connections are used to synchronize events between kiosks, kitchen screens, and display screens.

---

# Technology Stack

Backend:
- Node.js
- Express.js
- MongoDB
- Redis
- AWS SQS
- AWS S3
- WebSockets

Frontend:
- React
- i18next for multilingual UI support

Infrastructure:
- Docker (local Redis setup)
- Cloud storage and messaging using AWS services

---

# Key Architectural Highlights

- Multi-tenant restaurant management system
- Asynchronous order processing pipeline
- Intelligent recommendation engine with configurable weights
- Time-based dynamic pricing and availability
- Real-time order lifecycle updates
- Inventory-aware menu management
- Analytics dashboards with cursor-based pagination
- Multilingual menu and UI support

---

# Purpose of the Project

This project explores how modern restaurant technology platforms operate at scale by implementing:

- scalable backend architecture
- real-time order workflows
- dynamic menu and pricing systems
- intelligent recommendation strategies
- analytics and reporting dashboards

The system demonstrates how digital kiosk platforms can improve operational efficiency while enabling restaurants to optimize revenue through data-driven insights and automated recommendations.

- **Client**: The frontend built with React and TypeScript.
- **Server**: The backend built with Node.js and Express.

## Prerequisites

Before starting, ensure you have the following installed on your system:

- Node.js (v16 or higher)
- npm (Node Package Manager)
- MongoDB (running locally or a connection URI)

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd Hyper-Kitchen-Hub-mern
   ```

2. Install dependencies for both the client and server:
   ```bash
   cd client
   npm install
   cd ../server
   npm install
   ```

## Environment Setup

1. Create environment files for the server and client:

   - **Server**: Create a `.env` file in the `server` directory with the following variables:

     ```env
      MONGO_URI=<your-mongodb-uri>

      ACCESS_TOKEN_SECRET=<your-access-token-secret>
      ACCESS_TOKEN_EXPIRY=1d

      KIOSK_TOKEN_SECRET=<your-kiosk-token-secret>
      KIOSK_TOKEN_EXPIRY=30d

      NODE_ENV=PRODUCTION

      AWS_BUCKET=<your-bucket-name>
      AWS_REGION=ap-south-1
      AWS_ACCESS_KEY_ID=<your-access-key>
      AWS_SECRET_ACCESS_KEY=<your-secret-key>

      AWS_SQS_QUEUE_URL=<your-sqs-queue-url>
      AWS_SQS_ACCESS_KEY_ID=<your-sqs-access-key>
      AWS_SQS_SECRET_ACCESS_KEY=<your-sqs-secret-key>

      REDIS_URL=<your-redis-url>

      RATE_LIMIT_AUTH_WINDOW_MS=900000
      RATE_LIMIT_AUTH_MAX=100
      RATE_LIMIT_API_WINDOW_MS=60000
      RATE_LIMIT_API_MAX=200
     ```

   - **Client**: Create a `.env` file in the `client` directory with the following variables:

     ```env
     VITE_API_BASE_URL=http://localhost:8000
     ```

## Running the Application

1. Start the server:

   ```bash
   cd server
   npm start
   ```

2. Start the client:

   ```bash
   cd client
   npm run dev
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

## Project Structure

### Client

- **src**: Contains the React application code.
  - `features`: Feature-specific modules (e.g., auth, kiosk, outlet).
  - `common`: Shared components, utilities, and types.

### Server

- **src**: Contains the backend application code.
  - `users`, `items`, `outlet`, `tenant`: Feature-specific modules.
  - `utils`: Shared utilities.

## Scripts

### Client

- `npm run dev`: Start the development server.
- `npm run build`: Build the application for production.

### Server

- `npm start`: Start the server.
