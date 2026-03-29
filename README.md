# LPG Customer Management System

LIVE on: https://lpg-crm.vercel.app/#/

## 1. Project Overview

This project presents a web-based LPG customer management system designed to support the day-to-day workflow of a local gas distribution business. The application helps manage customer records, delivery requests, sales transactions, due balances, and customer documents through a single browser-based dashboard.

The system is built as a React and TypeScript single-page application and uses Firebase Firestore and Firebase Storage as its backend services. It focuses on making routine LPG operations faster, more organized, and easier to monitor, while still being simple enough to run directly in the browser.

### Key Features
-   **Customer Management:** Add, edit, search, filter, and view LPG customer records with details such as customer ID, consumer number, Aadhaar, village, panchayat, agency, and connection type.
-   **Bulk Import & Export:** Import customer data from Excel, validate rows before sync, and export filtered records back to spreadsheet format.
-   **Transaction Tracking:** Record LPG sales, quick-sell walk-in transactions, update past transactions, and automatically maintain customer balance values.
-   **Delivery Workflow:** Create delivery requests, track pending deliveries, and complete them while generating linked transaction entries.
-   **Document Storage:** Upload and manage Aadhaar cards, passbooks, consumer cards, and SV documents using Firebase Storage.
-   **Admin Controls:** Support soft delete, restore, and permanent delete actions for customer records, along with transaction visibility for administrators.
-   **Bilingual Interface & Dark Mode:** Includes English/Hindi translation support and theme switching for better usability.

---

## 2. Usage Guide


### Main User Flow

1.  **Open Dashboard:** View active customers, pending deliveries, completed deliveries, outstanding balance, and recent transactions.
2.  **Add Customers:** Use the manual form for single entries or the import tab for Excel-based bulk upload.
3.  **Manage Customer Records:** Search and filter customers by panchayat, village, agency, or connection type.
4.  **Open Customer Details:** Review personal details, balance, uploaded documents, and transaction history.
5.  **Record Sales:** Add new cylinder sale transactions or update existing ones; the balance is recalculated automatically.
6.  **Handle Deliveries:** Request a delivery for a customer and later mark it complete with sale/payment details.
7.  **Use Admin Panel:** Restore deleted customers, permanently delete records, and review all transactions.

### Troubleshooting

-   **Blank or broken data screens:** Check whether Firebase is initialized correctly and whether Firestore rules allow reads/writes.
-   **Document upload fails:** Verify Firebase Storage permissions and confirm the selected file type and size are allowed.
-   **Excel import/export does not work:** Make sure the SheetJS CDN script in `index.html` is loading successfully.
-   **Login issues:** Confirm the Firestore `config/admin` document contains the expected password, or use the fallback first-time password if the document has not yet been created.

---

## 3. System Architecture & Design

The application follows a frontend-driven architecture where the browser UI acts as the client and Firebase services act as the backend data and storage layer.

### Communication Flow

The system is built around direct browser-to-Firebase interaction:

1.  **UI Layer:** React components collect user input for customers, deliveries, transactions, and documents.
2.  **Service Layer:** `services/api.ts` performs Firestore queries, document writes, storage uploads, and transactional balance updates.
3.  **Persistence Layer:** Firestore stores customers, transactions, deliveries, documents, and configuration values; Firebase Storage stores uploaded files.
4.  **UI Refresh:** Pages reload or re-fetch data after create, update, upload, delete, or completion actions so the interface stays synchronized with the database.

### Technology Stack

-   **Frontend:**
    -   React 19
    -   TypeScript
    -   Vite
-   **Styling:**
    -   Tailwind CSS (loaded via CDN)
-   **Backend Services:**
    -   Firebase Firestore
    -   Firebase Storage
-   **Utilities:**
    -   SheetJS/XLSX for spreadsheet import and export
    -   `lodash.get` for translation lookup
-   **Routing & State:**
    -   Hash-based route handling in `App.tsx`
    -   React hooks and local component state

---

## 4. Functional Implementation

The system is organized around practical LPG business operations rather than generic CRUD pages.

### Dashboard Module
-   Shows total active customers, pending deliveries, completed deliveries, and outstanding balance.
-   Displays recent transactions for quick monitoring.
-   Includes a quick-sell form for both registered customers and walk-in customers.
-   Supports date-based filtering for today, month, year, or all-time summaries.

### Customer Management Module
-   Supports manual entry of customer details with validation for mobile number, Aadhaar number, and required fields.
-   Supports Excel import with preview, row validation, and create/update detection based on consumer number.
-   Allows searching and filtering by village, panchayat, connection type, and agency.
-   Supports printing and spreadsheet export of customer lists.

### Customer Detail Module
-   Displays complete customer profile information and current balance.
-   Allows editing of customer information.
-   Maintains transaction history for each customer.
-   Supports updating old transactions while preserving change history.
-   Supports document upload, replacement, viewing, and printing for core LPG-related customer files.

### Delivery Module
-   Creates pending delivery requests tied to existing customers.
-   Separates requested and completed delivery lists.
-   Converts delivery completion into a transaction entry while updating customer balance.

### Admin Module
-   Displays all customers, including deleted ones.
-   Supports soft delete and restore operations.
-   Supports permanent delete of customer records along with linked transactions, deliveries, and uploaded files.
-   Displays a transaction-level overview for administrative monitoring.

---

## 5. Data & Backend Implementation

The backend logic is concentrated in `services/api.ts`, where Firestore collections and storage references are managed.

### Core Collections
-   `customers`
-   `transactions`
-   `deliveries`
-   `documents`
-   `config`

### Key Backend Behaviors
-   **Customer Creation:** Prevents duplicate consumer numbers when adding records manually.
-   **Bulk Upsert:** Uses batch operations to create or update customers from Excel imports.
-   **Balance Management:** Customer balances are updated automatically during transaction creation, transaction editing, and delivery completion.
-   **Document Handling:** Replaces old uploaded files when a new document of the same type is uploaded.
-   **Soft Delete Strategy:** Normal customer screens exclude deleted records, while the admin screen can still access them.
-   **Permanent Delete Strategy:** Removes Firestore data first and then deletes related Firebase Storage files.

---

## 6. User Interface Implementation

The application is built as a single-page React interface with reusable components and hook-based behavior.

-   **Layout Components:** `Header`, `Sidebar`, `Card`, `Modal`, `Tabs`, `DataTable`, and form controls provide a consistent application structure.
-   **Routing:** `App.tsx` uses hash-based routing for dashboard, customer list, add customer, deliveries, admin, and customer detail pages.
-   **Language Support:** `LanguageContext` provides translation lookup for English and Hindi labels/messages.
-   **Theme Support:** `useDarkMode` stores the current theme in `localStorage` and applies the `dark` class to the document root.
-   **Responsive Behavior:** The sidebar closes automatically on route changes for mobile usage, helping the layout work across screen sizes.

---

## 7. Testing & Validation

The project structure suggests the system has mainly been validated through practical application workflow testing rather than a formal automated test suite.

### Validation Areas
1.  **Customer Lifecycle Testing:** Add, edit, search, import, export, delete, restore, and permanently delete customer records.
2.  **Transaction Testing:** Verify manual sale entry, quick-sell flow, transaction editing, and automatic balance updates.
3.  **Delivery Testing:** Confirm delivery request creation and proper completion-to-transaction conversion.
4.  **Document Testing:** Validate upload, replace, open, and print flows for customer documents.
5.  **UI Validation:** Confirm routing, dark mode, filtering, print windows, and bilingual content rendering.

A future enhancement would be to add formal unit and integration tests for the service layer and major UI flows.

---

## 8. Conclusion & Future Work

This project successfully delivers a focused LPG customer management platform that combines customer records, document handling, transaction accounting, and delivery workflow into a single browser application. It demonstrates how a lightweight React frontend and Firebase backend can be combined to support real business operations with minimal deployment complexity.

### Future Work
-   **Firebase Authentication:** Replace the current password-only gate with proper user authentication and role-based access control.
-   **Environment-Based Configuration:** Move Firebase configuration fully into environment variables instead of keeping project-specific values in the service file.
-   **Automated Testing:** Add unit and integration tests for transaction logic, imports, and delivery workflows.
-   **Audit & Security Improvements:** Strengthen client-side admin/password handling and review Firestore/Storage security rules.
-   **Reports & Analytics:** Add richer reporting such as agency-wise summaries, due reports, refill trends, and printable monthly statements.
-   **PWA or Offline Support:** Improve usability in lower-connectivity environments common to field operations.
