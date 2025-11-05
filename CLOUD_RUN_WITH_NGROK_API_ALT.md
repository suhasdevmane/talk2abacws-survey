# Cloud run guide (Docker only) with SINGLE ngrok tunnel (Frontend only)

This file contains copy-paste friendly commands (PowerShell) to run all services on a cloud host without docker-compose and expose them via ngrok. **Only the frontend needs an ngrok tunnel** - the frontend dev server proxies all /api and /visualiser requests to the backend services internally.

Notes
- Run these from the project root: `C:\Users\suhas\Documents\GitHub\User Survey Abacws`
- The commands are idempotent; if a resource exists, Docker/ngrok will reuse it.
- Replace nothing unless you want to change ports or names. Domain and token are already filled in per your request.

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
docker run -d --name abacws-survey-mongo --network survey-network -p 27017:27017 -v mongo-data:/data/db --restart always mongo

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
# IMPORTANT: REACT_APP_API_URL MUST POINT TO A PUBLICLY REACHABLE API URL
# We'll first start API ngrok (step 7) and then restart the frontend with the correct URL.
# For now, start with placeholder so you can see the UI; we will re-run it after API ngrok is up.
# ============================
docker build -t rasa-frontend-img ./rasa-frontend
docker run -d --name rasa-frontend-bldg1 --network survey-network --hostname rasa-frontend-host-bldg1 -p 3000:3000 -e NODE_ENV=development -e REACT_APP_API_URL=https://swayable-katia-nondevelopmentally.ngrok-free.dev/api -e REACT_APP_VISUALIZER_URL=/visualiser -v "${PWD}/rasa-frontend:/app" -v /app/node_modules --restart unless-stopped rasa-frontend-img npm start


# ============================
# 6) Frontend ngrok (previous domain)
# If you already run this elsewhere, skip. Region set to US; change if needed.
# ============================
docker run -d --name abacws-survey-ngrok --network survey-network `
  -e NGROK_AUTHTOKEN=351mX4l1QmwIH9QNq3TatjyErTf_3os4QyqSDSX614JkForyL `
  -p 4046:4040 `
  ngrok/ngrok:latest http rasa-frontend-bldg1:3000 --region=us `
  --domain=wimpishly-premonarchical-keyla.ngrok-free.dev

# Inspect frontend ngrok
docker logs -f abacws-survey-ngrok

# ============================
# 7) API ngrok (NEW credentials + domain you provided)
# This exposes the API at: https://swayable-katia-nondevelopmentally.ngrok-free.dev
# ============================
docker run -d --name abacws-api-ngrok --network survey-network `
  -e NGROK_AUTHTOKEN=353dwLAqYq3fDf4gvmEzVzoM1gR_22wwdveXaYWMhRduTnbWA `
  -p 4047:4040 `
  ngrok/ngrok:latest http abacws-api:5000 --region=us `
  --domain=swayable-katia-nondevelopmentally.ngrok-free.dev

# Inspect API ngrok
docker logs -f abacws-api-ngrok

# Quick health check via public URL (API)
curl https://swayable-katia-nondevelopmentally.ngrok-free.dev/health

# ============================
# 8) Visualiser ngrok (NEW domain you provided)
# Exposes the Visualiser at: https://micah-fountainlike-lynetta.ngrok-free.dev
# ============================
docker run -d --name abacws-visualiser-ngrok --network survey-network -e NGROK_AUTHTOKEN=354BBtEmXg0bnzNHsidXQnD2iZZ_k4q7PkDSq3ujv5dufhsx -p 4047:4040  ngrok/ngrok:latest http abacws-visualiser:80 --domain=micah-fountainlike-lynetta.ngrok-free.dev

# Inspect Visualiser ngrok
docker logs -f abacws-visualiser-ngrok

# Optional quick health check via public URL (Visualiser)
curl https://micah-fountainlike-lynetta.ngrok-free.dev/health

# ============================
# 9) Restart Frontend with the CORRECT URLs (API and Visualiser ngrok)
# This fixes cross-host “registration error” and loads the Visualiser in /survey
# ============================
docker rm -f rasa-frontend-bldg1
docker run -d --name rasa-frontend-bldg1 --network survey-network --hostname rasa-frontend-host-bldg1 -p 3000:3000 -e NODE_ENV=development -e REACT_APP_API_URL=https://swayable-katia-nondevelopmentally.ngrok-free.dev/api -e REACT_APP_VISUALIZER_URL=https://micah-fountainlike-lynetta.ngrok-free.dev -v "${PWD}/rasa-frontend:/app" -v /app/node_modules --restart unless-stopped rasa-frontend-img npm start

# ============================
# 10) Sender 
# ============================
docker build -t abacws-sender-img -f telemetry/Dockerfile .
docker run -d --name abacws-sender --network survey-network -p 8088:8088 `
  -e API_BASE=http://abacws-api:5000/api `
  -e INTERVAL_SECONDS=10 `
  -e API_HEALTH=http://abacws-api:5000/health `
  -e VIS_HEALTH=http://abacws-visualiser:80/health `
  --restart always abacws-sender-img

# ============================
# 11) Quick end-to-end test (register a user via API ngrok)
# ============================
$body = @{ username = 'cliuser'; password = 'test123456' } | ConvertTo-Json
Invoke-WebRequest -Uri 'https://swayable-katia-nondevelopmentally.ngrok-free.dev/api/survey/register' -Method POST -Body $body -ContentType 'application/json' -UseBasicParsing | Select-Object StatusCode

# Check API logs for 'Registration attempt'
docker logs --tail 200 abacws-api

# ============================
# 12) Useful logs
# ============================
docker logs -f abacws-api
docker logs -f abacws-mongo
docker logs -f abacws-visualiser
docker logs -f rasa-frontend-bldg1
docker logs -f abacws-sender

# ============================
# 13) Stop / Remove (when done)
# ============================
# docker stop abacws-mongo abacws-api abacws-visualiser rasa-frontend-bldg1 abacws-sender abacws-survey-ngrok abacws-api-ngrok
# docker rm abacws-mongo abacws-api abacws-visualiser rasa-frontend-bldg1 abacws-sender abacws-survey-ngrok abacws-api-ngrok
```

Troubleshooting
- If registration still fails, it typically means the frontend is still pointing to an API URL that isn’t reachable from the browser. Ensure `REACT_APP_API_URL` uses the API ngrok domain (step 8) and then refresh your browser.
- If cookies are needed across different domains (frontend ngrok and API ngrok), modern browsers may block them unless set with `SameSite=None; Secure`. The API currently sets `SameSite='lax'`. If you want, we can switch it to `None` for better cross-domain persistence (only over HTTPS).
- Check that the API ngrok health works: `curl https://swayable-katia-nondevelopmentally.ngrok-free.dev/health`.
