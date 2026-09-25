# 🤖 ALEA Care Smart Rover

> **Autonomous Bedside Delivery & Resident Assistance Platform for Senior Living Communities**  
> *Built for Hebrew SeniorLife (HSL) Care Innovation • Dual-Mode (Virtual Simulation & Waveshare UGV-Beast Hardware)*

---

## 🌟 Executive Summary

In senior care facilities, clinical staff walk an average of **4+ miles per shift** performing routine supply distribution, non-urgent comfort deliveries, and repetitive status checks. 

**ALEA Care Smart Rover** is an end-to-end autonomous robotics and caregiver coordination platform designed to alleviate this operational strain. By uniting a **13-state transactional Finite State Machine (FSM)**, **zero-trust biometric facial authentication**, an interactive **2D CAD facility mission monitor**, and a **bedside resident kiosk**, the platform ensures scheduled medications and care packages are securely delivered directly to residents without cognitive or physical burden on nurses.

---

## 📑 Table of Contents

- [System Architecture](#-system-architecture)
- [Key Features](#-key-features)
- [Monorepo Project Layout](#-monorepo-project-layout)
- [Prerequisites](#-prerequisites)
- [Quick Start Guide](#-quick-start-guide)
  - [Option A: Docker Setup (Recommended — One Command)](#option-a-docker-setup-recommended--one-command)
  - [Option B: Native Local Setup (Node.js & Local PostgreSQL)](#option-b-native-local-setup-nodejs--local-postgresql)
- [Default Staff Credentials & Demo Persona](#-default-staff-credentials--demo-persona)
- [Dual Operation Modes](#-dual-operation-modes)
  - [Virtual Simulation Mode (Default)](#virtual-simulation-mode-default)
  - [Hardware Mode (Waveshare UGV-Beast + Raspberry Pi)](#hardware-mode-waveshare-ugv-beast--raspberry-pi)
- [Core Application Modules](#-core-application-modules)
  - [1. Caregiver Operations Dashboard](#1-caregiver-operations-dashboard)
  - [2. 2D Mission Monitor & Floorplan CAD](#2-2d-mission-monitor--floorplan-cad)
  - [3. Bedside Rover Touchscreen Kiosk](#3-bedside-rover-touchscreen-kiosk)
  - [4. 5-Angle Biometric Enrollment Studio](#4-5-angle-biometric-enrollment-studio)
  - [5. Regulatory Compliance & Audit Log Explorer](#5-regulatory-compliance--audit-log-explorer)
- [Automated Verification & Test Suites](#-automated-verification--test-suites)
- [Environment Variables Reference](#-environment-variables-reference)
- [Hackathon Demo & Live Presentation Script](#-hackathon-demo--live-presentation-script)
- [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Frontend ["React 18 + Vite 6 Frontend (Port 5173)"]
        Dashboard["Caregiver Dashboard"]
        Mission2D["2D Floorplan CAD Monitor"]
        Kiosk["On-Rover Bedside Kiosk"]
        Studio["5-Angle Biometric Studio"]
        AuditView["Audit Log Explorer"]
    end

    subgraph Backend ["Node.js + Express Server (Port 4000)"]
        API["REST API Surface"]
        SocketServer["Socket.IO Real-Time Engine"]
        FSM["13-State Task Machine"]
        SnoozeRetry["Snooze & Escalation Engine"]
        RoverMgr["Rover Mode Manager"]
    end

    subgraph Storage ["Data Layer"]
        Postgres[(PostgreSQL Database)]
        Prisma["Prisma ORM (6.x)"]
        LocalS3["Local Storage / AWS S3 Fallback"]
    end

    subgraph Edge ["Rover Edge Platforms"]
        VirtualRover["Virtual Rover Simulator (In-Memory Physics)"]
        UGVBeast["Waveshare UGV-Beast (Raspberry Pi 4B/5 + Python)"]
    end

    Frontend <-->|"REST API + WebSockets"| Backend
    Backend <--> Prisma
    Prisma <--> Postgres
    Backend --> LocalS3

    RoverMgr -.->|"ROVER_MODE=SIMULATION"| VirtualRover
    RoverMgr <===>|"ROVER_MODE=HARDWARE via Socket.IO"| UGVBeast
```

---

## ⚡ Key Features

1. **Transactional 13-State Finite State Machine (FSM)**  
   Guarantees strict delivery lifecycles (`SCHEDULED` ➔ `READY` ➔ `DISPATCHED` ➔ `EN_ROUTE` ➔ `ARRIVED` ➔ `AWAITING_CONFIRMATION` ➔ `COMPLETED`). Eliminates race conditions, duplicate dispatches, or lost packages.

2. **Zero-Trust Bedside Biometrics & Audio Guidance**  
   The rover's motorized medication bay stays electronically locked until the resident's face matches the enrolled 128D biometric vector (or emergency 4-digit PIN `1234`). Features Web Speech API vocal greetings and dosage instructions.

3. **5-Angle Biometric Enrollment Studio**  
   Studio camera interface guiding residents through 5 standardized poses (*Center*, *Left*, *Right*, *Up*, *Down*) with real-time face reticle detection and vector embedding storage.

4. **Interactive 2D Facility CAD Tracking**  
   Dynamic SVG rendering of a 13 ft × 20 ft senior living floor plan (Rooms 101, 102, 103, Charging Dock, Caregiver Station, Pharmacy). Streams live rover coordinates (`x`, `y`), breadcrumbs, and instant Emergency Stop (`ESTOP`).

5. **Dual-Mode Adapter (Zero Hardware Lock-In)**  
   Develop and pitch without a physical robot using full-fidelity simulation, or connect the physical **Waveshare UGV-Beast** with automatic solenoid pin actuation via Python.

6. **Immutable Clinical Audit Trail**  
   Every state transition, waymark reached, biometric validation, and manual override is cryptographically logged with actor attribution (`CAREGIVER`, `RESIDENT`, `SYSTEM`, `ROVER`) and exportable to JSON for regulatory inspections.

7. **Presenter Demo Controls**  
   Includes a live pitch HUD with **1-Click 10-Second Snooze Fast-Forward**, **1-Click Hero Scenario Reset**, and step-by-step presentation soundbites.

---

## 📂 Monorepo Project Layout

```text
HSL_Hackathon/
├── package.json               # Root monorepo orchestrator (concurrent dev runner)
├── scripts/
│   └── release-phase.js       # Staged git commit & hackathon phase automation
├── client/                    # React 18 + TypeScript + Vite 6 Frontend
│   ├── package.json
│   ├── vite.config.ts         # Reverse proxy to backend (Port 4000)
│   ├── index.html
│   └── src/
│       ├── App.tsx            # Main shell & tab navigation
│       ├── socket.ts          # Bi-directional WebSocket client
│       ├── types.ts           # Shared TypeScript domain contracts
│       ├── context/           # AuthContext & role session management
│       └── components/        # UI Views (Dashboard, Kiosk, Monitor, Studio, etc.)
├── server/                    # Node.js + Express + Prisma Backend
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example           # Canonical environment configuration template
│   ├── prisma/
│   │   ├── schema.prisma      # PostgreSQL models (Resident, Task, Room, AuditLog, etc.)
│   │   └── seed.ts            # Deterministic demo seeder (Rooms, Mary Johnson, Rover-01)
│   ├── src/
│   │   ├── server.ts          # Express HTTP & Socket.IO server initialization
│   │   ├── socket.ts          # Real-time event broadcasting
│   │   ├── routes/            # REST API endpoints (tasks, residents, devices, demo, auth)
│   │   ├── services/          # State Machine, Snooze/Retry, Auth, Audit services
│   │   ├── rover/             # Dual-mode rover adapters (VirtualRover & HardwareRover)
│   │   └── tests/             # Self-verifying test scripts (Phases 2, 3, 4)
│   └── uploads/               # Local media fallback storage
└── rover-pi/                  # Edge Client for Raspberry Pi 4B/5 (Waveshare UGV-Beast)
    ├── README.md
    └── rover_client.py        # Python Socket.IO client & hardware solenoid controller
```

---

## 🧰 Prerequisites

Choose your preferred development approach:

| Environment | Requirements | When to Choose |
| :--- | :--- | :--- |
| **🐳 Option A: Docker (Recommended)** | **Docker Desktop** (or Docker Engine + Compose v2+) | Zero host dependencies required. PostgreSQL, Node backend, Prisma seed, and React Vite frontend start in isolated containers with live hot-reloading. |
| **💻 Option B: Native Host** | **Node.js 18+ / 20+ LTS**, **npm 9+**, **PostgreSQL 14+** | Direct local execution without container virtualization. |

> [!TIP]
> **WSL2 Developers (Native Mode)**: If your default terminal reports an older Node.js version (e.g. `v12.x`), activate Node 20+ using NVM:
> ```bash
> nvm use 20 || nvm use default
> ```

---

## 🚀 Quick Start Guide

### 🐳 Option A: Docker Setup (Recommended — One Command)

With Docker, you do not need to install PostgreSQL or configure local databases manually. Everything (PostgreSQL 16, Prisma migration & seed, Express API, Vite frontend) starts and links automatically.

#### 1. Clone and Navigate
```bash
git clone <repository-url>
cd HSL_Hackathon
```

#### 2. Start the Full Stack with Docker Compose
```bash
# Using npm script:
npm run docker:up

# Or directly with Docker Compose:
docker compose up --build
```

Docker Compose will automatically:
1. Spin up **PostgreSQL 16** (`hsl-postgres`) with healthchecks (mapped to host port `5433` to prevent collision with any existing local PostgreSQL).
2. Build and start **Express Backend** (`hsl-server`), automatically executing `prisma db push` and `prisma db seed`.
3. Build and start **React Vite Client** (`hsl-client`) with live source code mounting and hot reload.

#### 3. Access the Applications
- 💻 **Caregiver Web Portal & Kiosk**: [http://localhost:5173](http://localhost:5173)
- 🚀 **Backend Health API**: [http://localhost:4000/api/health](http://localhost:4000/api/health)
- 🗄️ **PostgreSQL (Host Tools / DBeaver)**: `localhost:5433` (User: `postgres`, Password: `postgres`, DB: `hsl_rover`)

#### Helpful Docker Commands
```bash
# View live container logs
npm run docker:logs          # or: docker compose logs -f

# Stop containers
npm run docker:down          # or: docker compose down

# Hard reset (wipe database volume, re-migrate & re-seed)
npm run docker:reset         # or: docker compose down -v && docker compose up --build
```

---

### 💻 Option B: Native Local Setup (Node.js & Local PostgreSQL)

If you prefer running services directly on your host machine:

#### 1. Environment Configuration
Create the server environment file from the provided template:
```bash
cp server/.env.example server/.env
```
Ensure `DATABASE_URL` matches your local PostgreSQL credentials:
```ini
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hsl_rover?schema=public"
PORT=4000
ROVER_MODE=SIMULATION
FAST_FORWARD_SECONDS=10
CLIENT_URL=http://localhost:5173
JWT_SECRET=hsl-care-smart-rover-jwt-secret-key-2026
```

#### 2. Create the Database
```bash
# Terminal (Linux / macOS / WSL):
psql -U postgres -c "CREATE DATABASE hsl_rover;"

# PowerShell (Windows Host):
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -U postgres -c "CREATE DATABASE hsl_rover;"
```

#### 3. Install Dependencies
```bash
# 1. Root dependencies (concurrently)
npm install

# 2. Server dependencies
npm --prefix server install

# 3. Client dependencies
npm --prefix client install
```

#### 4. Push Schema & Seed Demo Data
```bash
npm run db:push
npm run db:seed
```

#### 5. Launch Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Default Staff Credentials & Demo Persona

The application includes an instant role switcher in the top navigation bar. For full authentication testing, use any seeded account:

| Role | Name | Email | Password | Badge ID |
| :--- | :--- | :--- | :--- | :--- |
| **Nurse (Default)** | Sarah Jenkins | `nurse@hsl.care` | `hsl2026!` | `RN-402` |
| **Admin / Physician** | Dr. Robert Martinez | `admin@hsl.care` | `hsl2026!` | `ADM-001` |
| **Caregiver / Tech** | Alex Rivera | `caregiver@hsl.care` | `hsl2026!` | `CG-108` |

### Hero Demo Resident
- **Name**: Mary Johnson
- **Room**: Room 102 (Hero Room)
- **Item**: Morning Cardiovascular & Metabolic Regimen (Metformin, Lisinopril, Aspirin)
- **Fallback PIN**: `1234`

---

## 🎛️ Dual Operation Modes

The system abstracts the rover interface behind a common contract (`RoverAdapter`). You can switch modes without restarting the database.

### Virtual Simulation Mode (Default)
In `server/.env`:
```ini
ROVER_MODE=SIMULATION
```
- Completely self-contained software robot.
- Computes smooth waypoint physics between the Dock, Hallways, and Rooms.
- Emits real-time coordinate updates and battery drain over Socket.IO.
- Automatically handles room arrival and return-to-dock transitions.

### Hardware Mode (Waveshare UGV-Beast + Raspberry Pi)
In `server/.env`:
```ini
ROVER_MODE=HARDWARE
```
1. Connect the Raspberry Pi 4B/5 and your host computer to the same Wi-Fi / hotspot.
2. Note your laptop’s local IP (e.g. `192.168.1.100`).
3. On the Raspberry Pi terminal:
   ```bash
   cd rover-pi
   pip install "python-socketio[client]" requests
   python3 rover_client.py --server http://192.168.1.100:4000
   ```
4. When a resident is verified at the kiosk, the server emits `rover:unlock_compartment`, actuating **GPIO Pin 18 HIGH** on the UGV-Beast to release the mechanical solenoid latch.

---

## 🖥️ Core Application Modules

### 1. Caregiver Operations Dashboard
- **Top Metrics**: Total Deliveries Today, Completion Rate, Rover Battery Level, and Active Deliveries.
- **Hero Dispatch Card**: Quick-action dispatch button to launch Rover-01 to Room 102.
- **Schedule Management**: Create and configure recurring delivery times, compartments, and medication dosages.

### 2. 2D Mission Monitor & Floorplan CAD
- Visual layout based on the **13 ft × 20 ft** senior living demo floorplan.
- Tracks live rover position marker `(x, y)` along dashed corridor waypoints.
- Includes a live hardware video feed toggle and a prominent **Emergency Stop (E-STOP)** button.

### 3. Bedside Rover Touchscreen Kiosk
- Resident-facing touch interface simulating the screen mounted on the rover chassis.
- **Audio Welcome**: Welcomes the resident by name upon arrival using speech synthesis.
- **Biometric Face Scan**: Uses the device camera to verify resident identity.
- **PIN Fallback**: Supports 4-digit PIN verification (`1234`).
- **Medication Manifest**: Displays prescription breakdown and compartment numbers once unlocked.
- **Emergency Call**: One-tap button triggering an immediate visual and acoustic alert on the Caregiver Station.

### 4. 5-Angle Biometric Enrollment Studio
- Access from the **Residents** tab ➔ **"Biometric Face Studio"**.
- Captures 5 standardized facial angles (*Straight*, *Left*, *Right*, *Up*, *Down*) with directional badges and voice guidance.
- Stores multi-pose embeddings into the resident's record for zero-trust matching.

### 5. Regulatory Compliance & Audit Log Explorer
- Access from the **Audit** tab.
- Displays an immutable, chronologically ordered log of all system actions.
- Filter by actor (`CAREGIVER`, `RESIDENT`, `SYSTEM`, `ROVER`) or event category.
- **Export Compliance JSON**: One-click download of the complete clinical audit history for compliance verification.

---

## 🧪 Automated Verification & Test Suites

The repository contains automated end-to-end test scripts validating the state machine, API surface, and rover adapters:

```bash
# 1. Verify Phase 2: Transactional Task State Machine, Snooze/Retry & Audit Engine
npm --prefix server run test:fsm

# 2. Verify Phase 3: REST API Surface & Socket.IO Real-time Events
npm --prefix server run test:api

# 3. Verify Phase 4: Dual-Mode Rover Adapter (Waypoints, Arrival & ESTOP)
npm --prefix server run test:rover
```

---

## ⚙️ Environment Variables Reference

All backend configuration is managed in `server/.env`:

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | String | `postgresql://...` | PostgreSQL connection string |
| `PORT` | Number | `4000` | Backend API and WebSocket port |
| `ROVER_MODE` | String | `SIMULATION` | Either `SIMULATION` or `HARDWARE` |
| `FAST_FORWARD_SECONDS` | Number | `10` | Snooze compression duration for live demos |
| `CLIENT_URL` | String | `http://localhost:5173` | Allowed CORS origin for the Vite frontend |
| `JWT_SECRET` | String | `hsl-care-...` | Secret key used for signing staff JWTs |
| `AWS_ACCESS_KEY_ID` | String | *Optional* | AWS S3 access key (uses local disk if omitted) |
| `AWS_SECRET_ACCESS_KEY`| String | *Optional* | AWS S3 secret key |
| `S3_BUCKET` | String | *Optional* | AWS S3 bucket name for resident media |
| `AWS_REGION` | String | `us-east-1` | AWS S3 region |

---

## 🏆 Hackathon Demo & Live Presentation Script

Use the floating **"🏆 Judge Pitch & Demo Guide"** button in the bottom right corner of the application to access the built-in presenter assistant:

### 3-Minute Demo Runbook:
1. **0:00 - 0:45 | The Clinical Burden & Dashboard**:  
   Show the Caregiver Dashboard. Highlight that nurses walk 4+ miles per shift. Point to Mary Johnson’s ready delivery for Room 102.
2. **0:45 - 1:45 | Dispatch & Live 2D CAD Tracking**:  
   Click **"Dispatch to Room 102"**. Switch to the **2D Mission Monitor** and observe Rover-01 navigating along corridor waypoints.
3. **1:45 - 2:45 | Bedside Kiosk, Biometrics & Solenoid Unlock**:  
   Switch to the **On-Rover Kiosk** tab. Show the camera reticle, click **"Verify Identity & Unlock"**, listen to the audio greeting, and watch the medication bay unlock. Click **"Accept & Confirm Delivery"**.
4. **2:45 - 3:15 | Snooze & Exception Handling**:  
   Demonstrate clicking **"Not Ready / Snooze 10m"**, then click **"⏩ Fast-Forward Snooze (10s)"** on the bottom toolbar to show the automated retry without waiting.
5. **3:15 - 3:45 | Immutable Audit Trail & Regulatory Export**:  
   Open the **Audit Log** tab. Show the cryptographic log entries and click **"Export Compliance JSON"**.

---

## ❓ Troubleshooting & FAQs

### 1. `Cannot connect to PostgreSQL at localhost:5432`
- Verify that your PostgreSQL service is active:
  - **Linux/WSL**: `sudo service postgresql status` (or check host connectivity)
  - **Windows**: `Get-Service *postgres*`
- Confirm that the `hsl_rover` database exists (`psql -U postgres -c "\l"`).

### 2. Node Version Error (`Vite requires Node 18+`)
- Run `node -v`. If you see an older version (e.g. `v12.x`), switch to Node 20+:
  ```bash
  source ~/.nvm/nvm.sh && nvm use 20
  ```

### 3. Port 4000 or 5173 is already in use
- Change `PORT=4000` in `server/.env` to another port (e.g. `4001`).
- If you change the backend port, update the proxy target in `client/vite.config.ts` and restart both processes.

### 4. Biometric Camera Access Denied
- Modern web browsers require either `http://localhost` or `https://` for webcam permissions (`getUserMedia`).
- If camera hardware is absent, click **"Verify Identity & Unlock"** or enter PIN `1234`—the kiosk includes a built-in simulation fallback for testing.

---

## 📄 License & Credits

Developed by the **ALEA Care Hackathon Team** for the Smart Rover Innovation Initiative.  
Licensed under the [MIT License](LICENSE).
