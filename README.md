# Research Lab and Project Management System
A full-stack, enterprise-grade research administration web application built for university CSE coursework. The platform centralizes laboratory infrastructure, research initiatives, scientific personnel, collaborative teams, funding institutions, research grants, lab instruments, and project deliverables into a unified management portal.

---

## 1. System Architecture

```
[ Frontend: React + Vite ] 
       │ (Port 5173 - REST JSON / JWT Bearer)
       ▼
[ Backend: FastAPI (Python 3.14) ]
       │ (Port 8000 - Core Logic, RBAC & Argon2id Security)
       ▼
[ Database Access: python-oracledb (Thick Mode via Instant Client 19c) ]
       │ (Port 1521 - SQL Parameterized Queries & Pool)
       ▼
[ Database: Oracle Database 11g Express Edition (XE) ]
```

---

## 2. Technology Stack

- **Frontend:** React.js (v19) with Vite
- **Styling:** Vanilla CSS with Modern Dark/Light Theme & Glassmorphism design tokens
- **Icons:** `lucide-react`
- **Backend Framework:** FastAPI (Python)
- **Validation & Models:** Pydantic v2 & `email-validator`
- **Database:** Oracle Database 11g Express Edition (XE)
- **Oracle Connectivity:** `python-oracledb` in thick mode using Oracle Instant Client 19c
- **Password Cryptography:** Argon2id (`argon2-cffi`)
- **Token Security:** JSON Web Tokens (PyJWT) with Role-Based Access Control (RBAC)
- **API Documentation:** Interactive Swagger UI (`/docs`) & ReDoc (`/redoc`)

---

## 3. Database Design & Entities

The system strictly integrates the 8 existing Oracle Database entities plus the `APP_USERS` authentication table:

1. **`RESEARCH_LAB`**: Laboratory facilities, disciplines, allocated budgets, and physical locations.
2. **`RESEARCH_PROJECT`**: Research initiatives linked to laboratories, tracking duration, lead count, and project lifecycle.
3. **`RESEARCHER`**: Scientists, principal investigators, and researchers with specialized fields.
4. **`RESEARCH_TEAM`**: Collaborative groups assigned to projects and led by a designated researcher.
5. **`FUNDING_SOURCE`**: Government bodies, private foundations, and international research councils.
6. **`GRANT_DETAILS`**: Grant awards linking funding sources with specific research projects.
7. **`EQUIPMENT`**: Scientific equipment inventory, acquisition cost, and availability status.
8. **`PROJECT_MILESTONE`**: Key project deliverables, target completion dates, and progress tracking.
9. **`APP_USERS`**: Secure authentication table storing Argon2id hashes, RBAC roles, and optional researcher linkage.

---

## 4. Role-Based Access Control (RBAC)

The application enforces three distinct authorization tiers across both the FastAPI backend dependencies and React UI:

| Role | Permissions & Capabilities |
| :--- | :--- |
| **Admin** | Full system control: Manage users & roles, create/update/delete laboratories, projects, researchers, teams, funding sources, grants, equipment, and milestones. |
| **Lab Manager** | Operational management: Create and edit labs, projects, equipment availability, teams, and milestones. Destructive deletions and user management are restricted. |
| **Researcher** | Scientific access: Browse laboratories, projects, equipment, and teams. Update milestone progress deliverables for assigned research projects. |

---

## 5. Seed Demo Credentials

| Role | Email Address | Password | Description |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@research.org` | `Admin@123` | System Administrator |
| **Lab Manager** | `labmanager@research.org` | `Manager@123` | Laboratory Director |
| **Researcher** | `aarav@research.org` | `Researcher@123` | Lead Geneticist (Researcher ID: 301) |

*(Quick-login buttons are also provided on the sign-in screen for presentation convenience).*

---

## 6. Setup & Installation Guide

### Prerequisites
- Python 3.10+ (or Python 3.14)
- Node.js v18+ and npm
- Oracle Database XE (running service `OracleServiceXE` on port 1521)

---

### Backend Setup

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure Environment Variables (`backend/.env`):
   ```env
   ORACLE_USER=system
   ORACLE_PASSWORD=oracle
   ORACLE_DSN=localhost:1521/XE
   ORACLE_SCHEMA=SYSTEM
   ORACLE_CLIENT_DIR=oracle_client/instantclient_19_24

   SECRET_KEY=research_lab_management_jwt_super_secret_key_2026_xyz
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=480

   API_PREFIX=/api
   CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173
   DEBUG=True
   ```

4. Run the automated backend test suite:
   ```bash
   python test_api.py
   ```

5. Start the FastAPI backend server:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   *The API and Swagger documentation will be available at `http://127.0.0.1:8000/docs`.*

---

### Frontend Setup

1. Open a second terminal and navigate to `frontend/`:
   ```bash
   cd frontend
   ```

2. Install node dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend dashboard will run at `http://127.0.0.1:5173/`.*

---

## 7. REST API Endpoints Overview

All endpoints are prefixed with `/api` and documented in Swagger UI (`/docs`):

### Authentication & Users
- `POST /api/auth/login` — Authenticate user and issue JWT
- `POST /api/auth/logout` — Revoke session cookie
- `GET /api/auth/me` — Retrieve active profile and permissions
- `GET /api/users` — List application accounts (Admin only)
- `POST /api/users` — Create application account (Admin only)
- `PUT /api/users/{id}` — Update user roles or reset credentials
- `DELETE /api/users/{id}` — Delete user account

### Analytics
- `GET /api/dashboard` — Live aggregated counts, budgets, milestones, and project distributions

### Core Entity CRUD Endpoints
- `/api/labs` — `GET`, `POST`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}`
- `/api/projects` — `GET`, `POST`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}`
- `/api/researchers` — `GET`, `POST`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}`
- `/api/teams` — `GET`, `POST`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}`
- `/api/funding` — `GET`, `POST`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}`
- `/api/grants` — `GET`, `POST`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}`
- `/api/equipment` — `GET`, `POST`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}`
- `/api/milestones` — `GET`, `POST`, `GET /{id}`, `PUT /{id}`, `DELETE /{id}`

---

## 8. University CSE Project Highlights

1. **No Mock Data**: Every statistic and metric is computed dynamically using SQL aggregate queries (`SUM`, `COUNT`, `JOIN`, `GROUP BY`) executed against the Oracle XE database.
2. **Oracle Database Integrity**: Primary keys, check constraints (`ALLOCATED_BUDGET >= 0`, `GRANT_AMOUNT > 0`, `TEAM_SIZE > 0`, `END_DATE >= START_DATE`), and foreign keys are preserved and enforced.
3. **Argon2id Hashing**: Complies with modern password hashing recommendations (RFC 9106) rather than obsolete algorithms like MD5 or SHA-1.
4. **Parameterized SQL Queries**: All database queries use bind variables (`:1`, `:2`, `:param`) to guarantee 100% immunity against SQL injection attacks.
>>>>>>> 705240e (Initial commit: Research Lab and Project Management System full-stack app)
