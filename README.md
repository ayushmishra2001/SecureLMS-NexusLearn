# Secure LMS (NexusLearn)

Secure LMS is a highly secure, enterprise-grade, multi-tenant Learning Management System (SaaS). It provides robust data isolation, granular access control, and dynamic frontend synchronization designed for modern educational institutions and corporate training environments.

## 🚀 Key Features

* **Multi-Tenancy & Data Isolation:** Built with strict Group-based data partitioning. Users, Courses, Enrollments, and Audit Logs are strictly isolated per tenant (Group).
* **Advanced 3-Tier Security Matrix:** 
  * **Role (Baseline):** Defines default capabilities.
  * **Group (Ceiling):** Acts as a strict tenant boundary.
  * **User (Override):** Allows Super Admins to grant granular, individual exceptions.
* **Stateful Session & CSRF Protection:** Uses robust HTTP-Only Session Cookies (`JSESSIONID`) paired with a Single Page Application (SPA) CSRF protection model (`X-XSRF-TOKEN`).
* **OAuth2 Authorization Server:** Fully integrated as an Identity Provider (IdP) capable of issuing tokens to third-party clients, alongside Google OAuth2 social login integration.
* **The "Pending Users" Holding Pen:** All self-registered public accounts are quarantined into an isolated group with zero permissions to prevent data leakage until manually verified.
* **Comprehensive Audit Logging:** Secure `SecurityAuditLog` tracking all logins, role modifications, and sensitive data changes, bound cryptographically to each tenant.

## 🛠️ Technology Stack

### Backend
* **Java 17 / Spring Boot 3.x**
* **Spring Security** (Method-level `@PreAuthorize`, OAuth2 Server, CSRF)
* **Spring Data JPA / Hibernate**
* **JavaMailSender** (Email Verification & Password Reset flows)
* **AES Encryption** (PII Data Protection)

### Frontend
* **Angular** (TypeScript, RxJS, Signals)
* **Tailwind CSS / Custom Modern UI**
* **Dynamic Route & Menu Rendering** (Synchronized perfectly with the Backend's 3-Tier Security Matrix)

### Database
* **MySQL 8.x**

## 💻 Local Setup Instructions

### 1. Database Configuration
1. Install MySQL Server.
2. The application automatically creates its own database (`secure_lms_db`) and tables on the first run, provided your root credentials match.
3. Update `D:\SecureLMS\Backend\secure-lms\src\main\resources\application.properties` with your database credentials:
   ```properties
   spring.datasource.username=root
   spring.datasource.password=your_password
   ```

### 2. Backend Setup (Spring Boot)
1. Navigate to the backend directory:
   ```bash
   cd Backend/secure-lms
   ```
2. Build the project using Maven:
   ```bash
   mvn clean install
   ```
3. Run the Spring Boot application:
   ```bash
   mvn spring-boot:run
   ```
   *The backend will start on `http://localhost:8080`.*

### 3. Frontend Setup (Angular)
1. Navigate to the frontend directory:
   ```bash
   cd Frontend/secure-lms
   ```
2. Install the necessary Node.js dependencies:
   ```bash
   npm install
   ```
3. Start the Angular development server:
   ```bash
   npm start
   ```
   *The frontend will compile and start on `http://localhost:4200`.*

## 🔑 Initial Bootstrapping (Super Admin)
Because the system is secure by default, you cannot openly register a Super Admin. To bootstrap the platform on a fresh installation:
1. Go to the public Registration Page.
2. In the payload or registration mechanism, provide the hidden `superAdminSecret` (found in `application.properties`).
3. The system will automatically bypass the "Pending Users" quarantine, assign you the `SUPER_ADMIN` role, and place you in the "System Administration" group.
