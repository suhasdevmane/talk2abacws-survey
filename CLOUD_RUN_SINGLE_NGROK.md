# Cloud run guide (Docker only) with SINGLE ngrok tunnel (Frontend only)

This file contains copy-paste friendly commands (PowerShell) to run all services on a cloud host without docker-compose and expose them via ngrok. **Only the frontend needs an ngrok tunnel** - the frontend dev server proxies all /api and /visualiser requests to the backend services internally.

## How it works
- The frontend's `setupProxy.js` forwards:
  - `/api/*` → `abacws-api:5000`
  - `/visualiser/*` → `abacws-visualiser:80`
- All services communicate internally over the `survey-network` Docker network
- Only ONE ngrok tunnel exposes the frontend to the internet
- No CORS issues, no cross-domain cookies, no ngrok interstitial warnings!

## Prerequisites
- Run these from the project root: `C:\Users\suhas\Documents\GitHub\User Survey Abacws`
- The commands are idempotent; if a resource exists, Docker will reuse it
- Your ngrok auth token and domain are already configured below

---

## Commands (copy-paste friendly)

```pwsh
# ============================
# 0) Optional clean up (only if needed)
# ============================
# docker rm -f abacws-survey-mongo abacws-api abacws-visualiser rasa-frontend-bldg1 abacws-sender abacws-survey-ngrok
# docker network rm survey-network
# docker volume rm mongo-data

# ============================
# 1) Network + Volume
# ============================
docker network create survey-network
docker volume create mongo-data

# ============================
# 2) MongoDB
# ============================
docker run -d --name abacws-survey-mongo --network survey-network -p 27017:27017 `
  -v mongo-data:/data/db `
  --restart always mongo

# ============================
# 3) API
# ============================
docker build -t abacws-api-img ./api
docker run -d --name abacws-api --network survey-network --hostname apihost -p 5000:5000 `
  -e API_PORT=5000 `
  -e MONGO_URL=mongodb://abacws-survey-mongo:27017 `
  -e JWT_SECRET=change-this-jwt-secret-in-production-use-strong-random-string `
  -e SESSION_SECRET=change-this-secret-in-production `
  -e API_KEY=V3rySecur3Pas3word `
  -v "${PWD}/api/src/api/data:/api/src/api/data" `
  --restart always abacws-api-img

# Sanity check
curl http://localhost:5000/health

# ============================
# 4) Visualiser (NGINX, serves port 80 → host 8090)
# ============================
docker build -t abacws-visualiser-img ./visualiser
docker run -d --name abacws-visualiser --network survey-network --hostname visualiserhost -p 8090:80 `
  -e WEB_PORT=80 `
  -e API_HOST=abacws-api:5000 `
  --restart always abacws-visualiser-img

# ============================
# 5) Frontend (development server on port 3000)
# IMPORTANT: Uses relative paths /api and /visualiser - setupProxy.js handles internal routing
# ============================
docker build -t rasa-frontend-img ./rasa-frontend
docker run -d --name rasa-frontend-bldg1 --network survey-network --hostname rasa-frontend-host-bldg1 -p 3000:3000 `
  -e NODE_ENV=development `
  -e REACT_APP_API_URL=/api `
  -e REACT_APP_VISUALIZER_URL=/visualiser `
  -v "${PWD}/rasa-frontend:/app" -v /app/node_modules `
  --restart unless-stopped rasa-frontend-img npm start

# ============================
# 6) Frontend ngrok (ONLY ngrok tunnel needed!)
# ============================
docker run -d --name abacws-survey-ngrok --network survey-network `
  -e NGROK_AUTHTOKEN=351mX4l1QmwIH9QNq3TatjyErTf_3os4QyqSDSX614JkForyL `
  -p 4046:4040 `
  ngrok/ngrok:latest http rasa-frontend-bldg1:3000 --region=us `
  --domain=wimpishly-premonarchical-keyla.ngrok-free.dev

# Inspect frontend ngrok
docker logs -f abacws-survey-ngrok

# ============================
# 7) Sender (telemetry service)
# ============================
docker build -t abacws-sender-img -f telemetry/Dockerfile .
docker run -d --name abacws-sender --network survey-network -p 8088:8088 `
  -e API_BASE=http://abacws-api:5000/api `
  -e INTERVAL_SECONDS=10 `
  -e API_HEALTH=http://abacws-api:5000/health `
  -e VIS_HEALTH=http://abacws-visualiser:80/health `
  --restart always abacws-sender-img

# ============================
# 8) Quick end-to-end test (register a user via frontend ngrok)
# ============================
$body = @{ username = 'cliuser'; password = 'test123456' } | ConvertTo-Json
Invoke-WebRequest -Uri 'https://wimpishly-premonarchical-keyla.ngrok-free.dev/api/survey/register' `
  -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing | Select-Object StatusCode

# Check API logs for 'Registration attempt'
docker logs --tail 200 abacws-api

# ============================
# 9) Useful logs
# ============================
docker logs -f abacws-api
docker logs -f abacws-survey-mongo
docker logs -f abacws-visualiser
docker logs -f rasa-frontend-bldg1
docker logs -f abacws-sender
docker logs -f abacws-survey-ngrok

# ============================
# 10) Stop / Remove (when done)
# ============================
# docker stop abacws-survey-mongo abacws-api abacws-visualiser rasa-frontend-bldg1 abacws-sender abacws-survey-ngrok
# docker rm abacws-survey-mongo abacws-api abacws-visualiser rasa-frontend-bldg1 abacws-sender abacws-survey-ngrok
```

---

## Access your application

**Frontend (login, chat, survey):**  
https://wimpishly-premonarchical-keyla.ngrok-free.dev

**API (proxied through frontend):**  
https://wimpishly-premonarchical-keyla.ngrok-free.dev/api

**Visualiser (proxied through frontend):**  
https://wimpishly-premonarchical-keyla.ngrok-free.dev/visualiser

---

## Troubleshooting

- **Registration fails:** Ensure the frontend container restarted after you added the proxy. Check `docker logs rasa-frontend-bldg1` for startup errors.
- **Visualiser shows blank/error:** The frontend proxy forwards `/visualiser` to the visualiser container. Verify the visualiser is running: `curl http://localhost:8090/health`
- **404 on /api calls:** Check that `http-proxy-middleware` is installed in the frontend: `docker exec rasa-frontend-bldg1 npm list http-proxy-middleware`
- **ngrok warning page:** This shouldn't happen anymore since everything is same-origin. If you see it, clear browser cache.

---

## What changed from the previous setup?

### Before (3 ngrok tunnels):
- Frontend ngrok: `wimpishly-premonarchical-keyla.ngrok-free.dev`
- API ngrok: `swayable-katia-nondevelopmentally.ngrok-free.dev`
- Visualiser ngrok: `micah-fountainlike-lynetta.ngrok-free.dev`
- Problem: ngrok free plan shows interstitial warnings for cross-domain iframes

### After (1 ngrok tunnel):
- Frontend ngrok only: `wimpishly-premonarchical-keyla.ngrok-free.dev`
- API accessed via: `wimpishly-premonarchical-keyla.ngrok-free.dev/api` (proxied internally)
- Visualiser accessed via: `wimpishly-premonarchical-keyla.ngrok-free.dev/visualiser` (proxied internally)
- Benefits:
  - ✅ No ngrok interstitial warnings
  - ✅ No CORS issues
  - ✅ Same-origin cookies work perfectly
  - ✅ Only one ngrok auth token needed
  - ✅ Simpler deployment

---

## Files modified in this setup

1. **rasa-frontend/src/setupProxy.js** (created)
   - Proxies `/api` → `abacws-api:5000`
   - Proxies `/visualiser` → `abacws-visualiser:80`

2. **rasa-frontend/src/components/ChatBot.js**
   - Changed: `API_BASE` default from `http://localhost:5000/api` to `/api`

3. **rasa-frontend/src/components/Login.js**
   - Changed: `API_BASE` default from `http://localhost:5000/api` to `/api`

4. **rasa-frontend/src/pages/Survey.js**
   - Changed: `visualizerUrl` default from `http://localhost:8090` to `/visualiser`

5. **rasa-frontend/package.json**
   - Added: `"http-proxy-middleware": "^2.0.6"`
