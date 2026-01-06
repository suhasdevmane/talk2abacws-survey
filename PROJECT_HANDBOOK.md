# Abacws Project Handbook

This document provides a comprehensive guide to understanding, building, and testing the **User Survey Abacws** project. Use this as a reference for debugging and development.

## 1. Project Intentions & Scope

**Project Name:** User Survey Abacws

**Core Purpose:**
A research platform designed to conduct a user survey on **Smart Building Interaction**. It enables participants to:
1.  **Review Study Info & Consent:** Read the Participant Information Sheet and simpler consent forms.
2.  **Authenticate:** Register/Login to track their session.
3.  **Interact:** Use a **Chatbot** (driven by API/Rasa) and a **3D Visualiser** to query building states (e.g., "What is the temperature in Room 2?").
4.  **Collect Data:** The system records user queries and interactions for research analysis (Natural Language Corpus generation).

---

## 2. Architecture & File Structure

The project is composed of four main localized Docker services orchestrated by `docker-compose`.

### A. API (`/api`)
*   **Technology:** Node.js, Express.
*   **Purpose:** The central nervous system.
    *   Manages the **Device Registry** (list of sensors).
    *   Stores **Telemetry Data** (sensor readings).
    *   Handles **User Authentication** (Login/Register).
    *   Stores **Consent Forms** (PDF uploads).
*   **Key Files:**
    *   `src/api/index.js`: Main entry point/router.
    *   `src/api/datastore/mongo.js`: Database interaction layer.
    *   `src/api/constants.js`: Configuration loader.

### B. Visualiser (`/visualiser`)
*   **Technology:** React, Three.js, NGINX.
*   **Purpose:** A digital twin of the building.
    *   Loads 3D models (`.glb` files).
    *   Displays sensor icons in 3D space.
    *   Fetches real-time status from the API.
*   **Key Files:**
    *   `src/views/viewer.jsx`: Main 3D view logic.

### C. Frontend / Survey UI (`/rasa-frontend`)
*   **Technology:** React.
*   **Purpose:** The user-facing portal.
    *   **Home:** Step 1 (Info), Step 2 (Consent), Step 3 (Login).
    *   **Survey:** The actual chat interface where the study happens.
*   **Key Files:**
    *   `src/components/Home.js`: The landing page with the 3-step flow.
    *   `src/components/ConsentForm.js`: Logic for PDF generation and agreement.
    *   `src/components/ChatBot.js`: The conversational interface.

### D. Telemetry Sender (`/telemetry`)
*   **Technology:** Python.
*   **Purpose:** Simulation.
    *   Generates dummy sensor data (Temperature, CO2, Humidity).
    *   Sends this data to the API every 30 seconds to simulate a live building.
*   **Key Files:**
    *   `server.py`: The HTTP server wrapper to keep the container alive and report health.
    *   `dummy.py`: The script that actually generates and POSTs data.

### E. Database (`/Mongo`)
*   **Technology:** MongoDB.
*   **Purpose:** Data persistence for users, devices, and telemetry.

---

## 3. Connection Details & Networking

The services communicate over an internal Docker network named `survey-network`.

| Service Alias | Internal Port | External (Host) Port | Dependency | URL (Internal) |
| :--- | :--- | :--- | :--- | :--- |
| `survey-mongo` | 27017 | 27018 | N/A | `mongodb://survey-mongo:27017/abacws` |
| `api` | 5000 | 5000 | depends_on `survey-mongo` | `http://api:5000/api` |
| `visualiser` | 80 | 8090 | depends_on `api` | `http://visualiser:80` |
| `frontend` | 3000 | 3000 | depends_on `api` | N/A (Client-side calls localhost:5000) |
| `sender` | 8088 | 8088 | depends_on `api` | N/A |

**Crucial Environment Variables:**
*   **API:** `MONGODB_URI` must be set to `mongodb://survey-mongo:27017/abacws`.
*   **Sender:** `API_BASE` must be `http://api:5000/api` and `INTERVAL_SECONDS` sets data frequency.
*   **Frontend:** `REACT_APP_API_URL` points to the browser-accessible API URL (`http://localhost:5000/api`).

---

## 4. How to Build & Run

### A. Recommended Method (Docker Compose)
This is the most reliable way as it handles networking and matching versions automatically.

**1. Clean Start:**
```powershell
docker-compose down -v
docker-compose up --build -d
```

**2. Viewing the Apps:**
*   **Survey Portal (User View):** [http://localhost:3000](http://localhost:3000)
*   **3D Visualiser:** [http://localhost:8090](http://localhost:8090)
*   **API Documentation:** [http://localhost:5000/api/](http://localhost:5000/api/)
*   **DB Dashboard within API:** [http://localhost:5000/health](http://localhost:5000/health)

### B. Manual Method (Debugging Individual Containers)
Use these commands if you need to run one specific container in isolation or with custom flags. Ensure `survey-network` exists first.

**1. API:**
```bash
docker run -d --name abacws-api --hostname apihost --restart always \
  -e API_PORT=5000 \
  -e MONGO_URL=mongodb://survey-mongo:27017 \
  -e MONGODB_URI=mongodb://survey-mongo:27017/abacws \
  -p 5000:5000 \
  --network survey-network --network-alias api \
  abacws-api
```

**2. Sender (Telemetry):**
```bash
docker run -d --name abacws-sender --restart always \
  -e API_BASE=http://api:5000/api \
  -e INTERVAL_SECONDS=30 \
  --network survey-network \
  abacws-sender
```

---

## 5. Testing & Debugging Guide

### Common Issues & Fixes

**1. "500 Server Error" or "Connection Timeout" in Sender:**
*   **Cause:** The sender cannot reach the API, or the API cannot reach Mongo.
*   **Check:**
    *   API Logs: `docker logs abacws-api --tail 50`
    *   Look for: `MongooseServerSelectionError: connect ECONNREFUSED`.
    *   **Fix:** Ensure `MONGODB_URI` is correct in `docker-compose.yml`.

**2. "Read timed out" in Sender:**
*   **Cause:** The API is taking too long to process the batch data upload.
*   **Fix:** The sender timeout was increased in `dummy.py`, and API database indexing was optimized in `mongo.js`. 

**3. Frontend shows "Network Error":**
*   **Cause:** The React app (browser) cannot hit `localhost:5000`.
*   **Check:** Open `http://localhost:5000/health` in your browser. If it fails, the API container isn't mapped to port 5000 correctly.

### Verification Steps
1.  **Check Containers:** `docker ps` (All 5 should be "Up").
2.  **Check Data Flow:**
    *   Run `docker logs abacws-api --tail 10` -> Should see "GET /health" or "POST /devices/reading".
    *   Run `docker logs abacws-sender --tail 10` -> Should see "Batch sent. Sleeping for 30 seconds".
3.  **Check UI:** Go to localhost:3000, verify the "Step 1, 2, 3" cards appear.

---
