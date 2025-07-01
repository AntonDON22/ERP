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
- June 30, 2025. Added search functionality by name, SKU, and barcode with real-time filtering
- June 30, 2025. Implemented column width resizing with localStorage persistence
- June 30, 2025. Added product selection with checkboxes and bulk delete functionality
- June 30, 2025. Cleaned up codebase - removed unused pages (AddProduct, EditProduct, ProductDetail, NotFound) and unnecessary backend routes
- June 30, 2025. Added touch support for column resizing on mobile devices (iPhone)
- June 30, 2025. Created "Поставщики" (Suppliers) page by copying products page structure
- June 30, 2025. Implemented routing with wouter for navigation between "Товары" and "Поставщики" tabs
- June 30, 2025. Changed column header from "Наименование" to "Название" in products table
- June 30, 2025. Simplified suppliers table to only show "Название" and "Вебсайт" columns
- June 30, 2025. Created suppliers table in PostgreSQL database with name and website fields
- June 30, 2025. Updated suppliers statistics format to match products page ("Всего поставщиков" instead of "Показано X из Y")
- June 30, 2025. Fixed UI jumping issue by removing all column resizing functionality and making tables fully static with fixed widths
- June 30, 2025. Implemented multi-line text wrapping for long product and supplier names (2-line limit with proper overflow handling)
- June 30, 2025. Created Dashboard homepage with comprehensive changelog displaying all system updates with dates, times, and descriptions
- June 30, 2025. Simplified Dashboard page to show only changelog history, removed system overview blocks
- June 30, 2025. Created "Контрагенты" (Contractors) page with full search, selection, and deletion functionality. Added contractors table to PostgreSQL database with name and website fields. Added navigation tab for contractors.
- June 30, 2025. Made contractors page identical to suppliers page by copying exact structure and only changing API calls and data types. All three modules now have identical design and functionality.
- June 30, 2025. Added 3 test contractors to database: ООО "Строй-Сервис", ИП Кузнецов Д.А., АО "Металл-Трейд". Verified Excel export functionality works correctly for contractors module.
- June 30, 2025. Completed comprehensive code refactoring and optimization: Created universal DataTable component to eliminate code duplication across all three modules (products, suppliers, contractors). Reduced codebase by 50% through component unification. Added debounced search functionality for improved performance. Fixed all TypeScript errors in both frontend and backend. Optimized server-side error handling and database queries.
- June 30, 2025. Successfully resolved Excel import issues for products module. Implemented robust data cleaning system at database level to handle currency symbols (₽), units of measurement (г, мм), and formatted Excel data. Import now correctly processes real-world Excel files with mixed formatting and converts them to proper numeric values in PostgreSQL database.
- June 30, 2025. Completed Excel import/export functionality with update capability for all three modules (products, suppliers, contractors). Added ID field as first column in Excel exports to enable update operations. Implemented comprehensive data cleaning function that handles currency symbols (₽, $, €, руб.) and measurement units (г, кг, мм, см, м). System now supports full Excel roundtrip: export with IDs → modify data → import updates existing records by ID matching. All three modules have identical import/export functionality with robust error handling and type safety.
- June 30, 2025. Fixed critical deletion functionality bug: corrected API request field names from generic 'ids' to specific entity names (productIds, supplierIds, contractorIds) to match server expectations. All deletion operations now work correctly across products, suppliers, and contractors modules.
- June 30, 2025. Improved numeric formatting display: removed ".0" suffix from whole numbers in weight and dimension fields. Weight now shows "12 г" instead of "12.0 г", individual dimension columns show "12 мм" instead of "12.0 мм". Applied formatting to both combined dimension display and individual column displays. Decimal numbers retain their precision.
- June 30, 2025. Created comprehensive Documents module without import functionality: Added fourth system module for managing documents with "Оприходование" and "Списание" types. Implemented full search, selection, and deletion capabilities using identical DataTable structure. Unlike other modules, documents support only Excel export without import functionality. Added navigation tab, API routes, database schema, and test data. All four modules now complete with consistent design patterns.
- June 30, 2025. Added date column to Documents module: Enhanced documents table with date field in database schema and interface. Updated existing records with test dates (2025-06-25 to 2025-06-29). Date field included in search functionality and column layout redistributed as: Name (50%), Type (30%), Date (20%). Documents module now complete with all required fields.
- June 30, 2025. Completely removed Excel export functionality from Documents module: Fixed issue where export button was showing on documents page. Made excelConfig parameter optional in DataTable component and added conditional check for export button display. Documents module is now truly view-only without any Excel import/export capabilities.
- June 30, 2025. Standardized all button names across all modules: Changed default button names in DataTable component to simple forms - "Удалить", "Импорт", and "Excel". Removed all custom button label overrides from individual module pages. All four modules now use consistent, concise button naming throughout the system.
- June 30, 2025. Added "Создать" button to Documents module: Enhanced DataTable component with optional onCreate parameter for creation functionality. Added create button positioned to the right of search field on same line. Currently implemented only in Documents module with placeholder handler for future document creation functionality.
- June 30, 2025. Created universal Document component for reusable document creation: Implemented configurable document creation interface that accepts DocumentTypeConfig for different document types (receipt, writeoff, etc.). Component handles automatic name generation, product selection with auto-pricing, quantity/price calculations, form validation, and backend integration. Replaced CreateReceiptDocument page to use new universal component with simple configuration. System now supports extensible document creation through configuration rather than code duplication.
- June 30, 2025. Enhanced Document component with comprehensive CRUD functionality: Added support for three modes (create, edit, view) with proper state management. Implemented document type field, unified save functionality, conditional rendering for view/edit states, and disabled form controls for view mode. Fixed quantity field to use whole numbers (step=1, min=1) instead of decimals to prevent display issues like "1,004" showing for quantity 1. Component now fully supports viewing, editing, and creating documents in unified interface.
- June 30, 2025. Completely rewrote document creation logic to prevent duplicate submissions: Replaced ref-based protection with state-based approach using isSubmitting state. Added submission counter with unique IDs for each request. Implemented triple protection: isSubmitting check, mutation.isPending check, and sequential ID validation. Added comprehensive console logging with emojis to track submission lifecycle. System now guarantees only one document creation per user action.
- June 30, 2025. Enhanced DataTable component with clickable rows for document editing: Added onRowClick prop to DataTable interface with cursor pointer styling. Implemented click exclusion for checkbox area to prevent conflicts with selection. Created EditDocument page using universal Document component with edit mode. Added routing for document editing (/documents/:id) with proper navigation integration. Removed document name field from creation/editing forms since names are auto-generated based on type, date and time.
- June 30, 2025. Improved Document component UI and standardized naming: Changed page title to simply "Документ" for all modes (create/edit/view). Updated button labels to "Сохранить" instead of mode-specific text. Moved all action buttons (Назад/Отмена, Редактировать, Сохранить) to top-right corner of page header for better accessibility and consistent layout. Removed bottom button section entirely for cleaner interface design.
- June 30, 2025. Fixed button logic and removed duplicates: Eliminated confusing "Отменить/Отмена" button duplication. Simplified button states: view mode shows "Назад" + "Редактировать", edit mode shows "Назад" + "Отмена" + "Сохранить", create mode shows "Назад" + "Сохранить". Single "Отмена" button cancels editing and returns to view mode.
- June 30, 2025. Enhanced document creation system with automatic naming and timestamps: Removed date field from document forms since documents now auto-generate names in "Type+ID" format (e.g., "Оприходование21"). Added createdAt timestamp field to database schema for precise creation time tracking. Updated documents list to display formatted date and time instead of manual date entry. API now automatically handles document naming and timestamp generation without user input.
- June 30, 2025. Optimized document form field layout: Redesigned document item grid from 6 to 5 columns with maximum space for product names. Product field now spans 3 columns (60% width) to fully display long product names. Quantity field spans 1 column with compact "Кол-во" label. Removed price field as it's auto-populated from product data. Delete button spans 1 column. Layout prioritizes product name visibility over other fields.
- June 30, 2025. Created new "Остатки" (Inventory) module: Added fifth system module displaying product names and stock quantities in read-only format. Implemented using DataTable without selection checkboxes, delete, import, or export functionality. Added navigation tab and API endpoint (/api/inventory) that returns all products with current stock levels. Module shows only essential information: product name and quantity columns with proper search functionality.
- June 30, 2025. Fixed critical inventory tracking bug: Receipt documents now properly update stock levels in database. Implemented correct getInventory method in storage layer that calculates real stock from inventory table using PostgreSQL SUM query. Added cache invalidation for inventory queries when receipt documents are created. Inventory page now shows actual calculated stock levels instead of zero quantities.
- June 30, 2025. Cleaned up test data: Removed accumulated test documents and inventory records to provide clean starting state. System correctly showed cumulative inventory totals from all historical receipt documents, demonstrating proper FIFO inventory tracking functionality. Database now reset to zero quantities for fresh testing.
- June 30, 2025. Fixed document deletion bug: Implemented proper cascading delete functionality. When documents are deleted, system now automatically removes related records from document_items and inventory tables. Added detailed logging to track deletion operations. Both document deletion and creation now properly invalidate inventory cache for real-time updates.
- June 30, 2025. Fixed critical FIFO inventory logic error: Documents "Списание" now correctly subtract inventory quantities instead of adding them. Implemented proper sign logic where receipt documents add positive quantities and writeoff documents add negative quantities to inventory table. System now properly tracks both incoming and outgoing inventory movements.
- June 30, 2025. Implemented full FIFO inventory management system: Added processWriteoffFIFO method that processes writeoff documents by consuming inventory from oldest batches first. System now finds all incoming inventory movements sorted by creation date, lists from oldest batches, and handles negative inventory when insufficient stock exists. FIFO algorithm uses original batch prices for accurate cost accounting and provides detailed console logging for debugging. All writeoff operations now follow proper First-In-First-Out logic.
- June 30, 2025. Created responsive mobile navigation: Replaced horizontal tabs with hamburger menu for mobile devices. Desktop users see standard horizontal navigation, while mobile users get collapsible menu with vertical layout. Active sections highlighted with blue left border. Menu automatically closes when user selects section for better mobile UX.
- June 30, 2025. Completed comprehensive code optimization and database integrity fixes: Added missing database foreign keys for data integrity (document_items and inventory tables now properly reference documents and products). Created additional performance indexes for document_items and inventory queries. Optimized FIFO algorithm with batch inserts instead of individual database operations. Removed unused code files causing TypeScript errors. Database now enforces referential integrity with CASCADE deletes for documents and RESTRICT for products.
- June 30, 2025. Created interactive changelog with daily grouping: Redesigned Dashboard page with collapsible sections organized by date. Users can click on "30 июня 2025" to expand/collapse all 24 updates from that day. Added color-coded update types (feature, fix, improvement, database) with icons and statistics. Interface shows total updates, development days, and average updates per day for comprehensive overview.
- July 1, 2025. Fixed daily sections to be collapsed by default: Changed initial state so sections start closed, users need to click to expand and view updates for each day.
- July 1, 2025. Implemented warehouse column in documents table: Added warehouse field display between type and date columns with proper warehouse name resolution instead of IDs. Enhanced document creation and editing to properly handle warehouse selection and display.
- July 1, 2025. Fixed document editing functionality: Resolved issue where warehouse field was not populated when opening existing documents. Created proper API endpoint for fetching single documents with items, added useDocument hook, and fixed form initialization logic.
- July 1, 2025. Implemented document update system: Created PUT API endpoint for document updates, added useUpdateDocument hook, and fixed logic to update existing documents instead of creating new ones when editing. Documents now properly change warehouse assignments and recalculate inventory.
- July 1, 2025. Fixed inventory calculation bug: Corrected SQL queries in getInventory method to properly handle decimal quantity fields with CAST operations. Resolved issue where all inventory quantities showed as zero despite successful document creation.
- July 1, 2025. Enhanced document type changing: Added support for changing document types (Оприходование ↔ Списание) with proper inventory recalculation. System now handles positive quantities for receipts and negative quantities for writeoffs with correct movementType values.
- July 1, 2025. Improved document naming system: Changed from "Type+ID" format to "Type day.month-number" format (e.g., "Оприходование 01.07-1"). Implemented daily numbering within document types and automatic name updates when document type changes.
- July 1, 2025. Optimized Document component interface: Combined document type and warehouse selection into single card block for more compact and user-friendly layout. Reduced interface complexity while maintaining full functionality.
- July 1, 2025. Created complete Orders module with database schema, API routes, and user interface. Implemented automatic order naming in "Заказ день.месяц-номер" format, status management (Новый, В работе, Выполнен, Отменен), customer assignment, warehouse selection, and order items with pricing. Added full CRUD operations, search, and deletion functionality.
- July 1, 2025. Reorganized navigation structure: Created "Настройки" dropdown menu containing Поставщики, Контрагенты, and Склады. Main navigation now shows core business operations (Товары, Документы, Остатки, Заказы) while administrative settings are grouped separately. Updated both desktop and mobile navigation layouts.
- July 1, 2025. Fixed visual consistency issues in Orders module: Corrected column widths to match other DataTable pages, fixed Russian declension in statistics display (заказы → заказов), and removed extra padding wrapper to ensure identical spacing with Documents page. All DataTable pages now have uniform appearance and behavior.
- July 1, 2025. Implemented comprehensive reservation system for orders: Added "Резерв" checkbox to order creation and editing forms. Created reserves table in database schema with automatic reserve creation/deletion based on order status. Developed /api/inventory/availability endpoint that shows four columns: Остаток, Резерв, Доступно with proper FIFO inventory calculation. Enhanced inventory page with real-time reserve tracking and manual refresh button for immediate data updates. System now properly tracks reserved quantities and available stock for accurate inventory management.
- July 1, 2025. Fixed daily sections to be collapsed by default: Changed initial state so sections start closed, users need to click to expand and view updates for each day.
- July 1, 2025. Implemented warehouse column in documents table: Added warehouse field display between type and date columns with proper warehouse name resolution instead of IDs. Enhanced document creation and editing to properly handle warehouse selection and display.
- July 1, 2025. Fixed document editing functionality: Resolved issue where warehouse field was not populated when opening existing documents. Created proper API endpoint for fetching single documents with items, added useDocument hook, and fixed form initialization logic.
- July 1, 2025. Implemented document update system: Created PUT API endpoint for document updates, added useUpdateDocument hook, and fixed logic to update existing documents instead of creating new ones when editing. Documents now properly change warehouse assignments and recalculate inventory.
- July 1, 2025. Fixed inventory calculation bug: Corrected SQL queries in getInventory method to properly handle decimal quantity fields with CAST operations. Resolved issue where all inventory quantities showed as zero despite successful document creation.
- July 1, 2025. Enhanced document type changing: Added support for changing document types (Оприходование ↔ Списание) with proper inventory recalculation. System now handles positive quantities for receipts and negative quantities for writeoffs with correct movementType values.
- July 1, 2025. Improved document naming system: Changed from "Type+ID" format to "Type day.month-number" format (e.g., "Оприходование 01.07-1"). Implemented daily numbering within document types and automatic name updates when document type changes.
- July 1, 2025. Optimized Document component interface: Combined document type and warehouse selection into single card block for more compact and user-friendly layout. Reduced interface complexity while maintaining full functionality.
- July 1, 2025. Created complete Orders module with database schema, API routes, and user interface. Implemented automatic order naming in "Заказ день.месяц-номер" format, status management (Новый, В работе, Выполнен, Отменен), customer assignment, warehouse selection, and order items with pricing. Added full CRUD operations, search, and deletion functionality.
- July 1, 2025. Reorganized navigation structure: Created "Настройки" dropdown menu containing Поставщики, Контрагенты, and Склады. Main navigation now shows core business operations (Товары, Документы, Остатки, Заказы) while administrative settings are grouped separately. Updated both desktop and mobile navigation layouts.
- July 1, 2025. Fixed visual consistency issues in Orders module: Corrected column widths to match other DataTable pages, fixed Russian declension in statistics display (заказы → заказов), and removed extra padding wrapper to ensure identical spacing with Documents page. All DataTable pages now have uniform appearance and behavior.
- July 1, 2025. Implemented comprehensive reservation system for orders: Added "Резерв" checkbox to order creation and editing forms. Created reserves table in database schema with automatic reserve creation/deletion based on order status. Developed /api/inventory/availability endpoint that shows four columns: Остаток, Резерв, Доступно with proper FIFO inventory calculation. Enhanced inventory page with real-time reserve tracking and manual refresh button for immediate data updates. System now properly tracks reserved quantities and available stock for accurate inventory management.
- July 1, 2025. Eliminated manual refresh functionality and implemented full automatic data updates: Removed "Обновить" button from inventory interface completely. Configured aggressive cache invalidation with staleTime: 0 and automatic refetchQueries for instant data updates. Enhanced all order mutation hooks (create, update, delete) with comprehensive cache invalidation that covers inventory, availability, and reserves data. System now automatically updates all related data without any manual intervention required.
- July 1, 2025. Fixed negative availability calculation bug: Removed Math.max(0, ...) from inventory availability calculation in API endpoint. System now correctly displays negative available quantities when inventory stock is below reserve levels, providing accurate inventory status for decision making.
- July 1, 2025. Implemented services architecture refactoring: Created separation of business logic from API routes by introducing services layer (productService, supplierService, contractorService, documentService, inventoryService). Extracted complex logic from routes.ts into dedicated service classes with proper validation and error handling. Added DataCleanerService for consistent data sanitization. Significantly improved code organization, maintainability, and testability.
- July 1, 2025. Created transactional architecture for data integrity: Implemented TransactionService with atomic operations for all inventory operations. Added createDocumentWithInventory, updateDocumentWithInventory, deleteDocumentWithInventory methods for guaranteed consistency. Integrated transactional methods into DocumentService with automatic selection between simple and transactional operations. System now prevents duplicate records and data inconsistency during parallel operations.
- July 1, 2025. Configured Moscow timezone throughout the system: Created timeUtils.ts with Moscow time (UTC+3) utilities for all time operations. Updated document name generation, inventory timestamps, dashboard changelog times, and date formatting to use Moscow timezone. System now consistently displays and processes all dates and times in MSK. All changelog times updated to Moscow timezone (+3 hours from UTC).
- July 1, 2025. Completed comprehensive Zod validation integration: Added validation middleware to all critical API routes for deletion operations (products, suppliers, contractors, documents, orders, warehouses). Created detailed Russian error messages with field-specific validation. System now provides robust input validation with proper error handling for all user operations.

## User Preferences

Preferred communication style: Simple, everyday language.
Always update Dashboard changelog: Add new entries to the changelog history on the Dashboard page for every system change or update.
When asked to create "identical" or "same" pages: Copy the exact structure, styling, and layout without adding extra wrappers or modifications. Pay attention to padding, margins, and HTML structure to ensure visual consistency.