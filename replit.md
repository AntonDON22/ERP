# Product Management System

## Overview

This is a full-stack web application for managing products with a modern React frontend and Express.js backend. The system allows users to create, read, update, and delete products with detailed information including images, pricing, and dimensions.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **File Storage**: Local file system with multer for image uploads
- **Session Management**: Express sessions with PostgreSQL storage
- **Development**: Hot reloading with Vite integration

## Key Components

### Database Schema
- **Users Table**: Basic user authentication (id, username, password)
- **Products Table**: Comprehensive product information including:
  - Basic info (name, sku)
  - Pricing (price, purchase_price)
  - Physical attributes (weight, dimensions)
  - Media (image_url, barcode)

### API Endpoints
- `GET /api/products` - Fetch all products
- `GET /api/products/:id` - Fetch single product
- `POST /api/products` - Create new product with image upload
- `PUT /api/products/:id` - Update existing product
- `DELETE /api/products/:id` - Delete product
- `GET /uploads/*` - Serve uploaded images

### Frontend Pages
- **ProductsList**: Main product listing with search, filter, and sort functionality
- **AddProduct**: Form for creating new products with image upload
- **EditProduct**: Form for updating existing products
- **ProductDetail**: Detailed view of individual products
- **NotFound**: 404 error page

### Storage Strategy
The application uses a dual storage approach:
- **Development**: In-memory storage for rapid development and testing
- **Production**: PostgreSQL database with Drizzle ORM for persistence

## Data Flow

1. **Product Creation**: User submits form → Frontend validates with Zod → FormData sent to backend → Image saved to disk → Product data saved to database
2. **Product Listing**: Frontend requests products → Backend fetches from storage → Data transformed and returned → Frontend displays with React Query caching
3. **Image Handling**: Images uploaded to `/uploads` directory → Served statically by Express → Referenced by URL in database

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management
- **react-hook-form**: Form handling and validation
- **zod**: Schema validation
- **multer**: File upload handling

### UI Dependencies
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **class-variance-authority**: Component variant management

## Deployment Strategy

### Development
- Frontend: Vite dev server with HMR
- Backend: tsx with hot reloading
- Database: Can use either in-memory storage or PostgreSQL

### Production
- Frontend: Static build served by Express
- Backend: Compiled to ESM bundle with esbuild
- Database: PostgreSQL with migrations via Drizzle Kit
- File Storage: Local uploads directory

### Build Process
1. `npm run build` - Compiles frontend to static files and backend to production bundle
2. `npm run start` - Runs production server
3. `npm run db:push` - Applies database schema changes

## Changelog
- June 30, 2025. Initial setup
- June 30, 2025. Removed category and description fields completely from all products
- June 30, 2025. Successfully migrated from in-memory storage to PostgreSQL database with Drizzle ORM
- June 30, 2025. Removed all photos, buttons, and creation/editing functionality - simplified to view-only product listing

## User Preferences

Preferred communication style: Simple, everyday language.