#!/usr/bin/env bash
set -euo pipefail

# start-containers.sh
# Builds images and runs containers equivalent to docker-compose.yml
# Run from repository root: ./start-containers.sh

BASEDIR="$(cd "$(dirname "$0")" && pwd)"
NETWORK="survey-network"
VOLUME="mongo-data"

info(){ echo "[INFO] $*"; }
err(){ echo "[ERROR] $*" >&2; exit 1; }

# ensure docker available
if ! command -v docker >/dev/null 2>&1; then
  err "docker CLI not found"
fi

# create network if missing
if ! docker network ls --format '{{.Name}}' | grep -qx "$NETWORK"; then
  info "Creating docker network: $NETWORK"
  docker network create "$NETWORK"
else
  info "Network $NETWORK already exists"
fi

# create volume if missing
if ! docker volume ls --format '{{.Name}}' | grep -qx "$VOLUME"; then
  info "Creating docker volume: $VOLUME"
  docker volume create "$VOLUME"
else
  info "Volume $VOLUME already exists"
fi

# helper to stop+remove container if exists
rm_if_exists(){
  local name="$1"
  if docker ps -a --format '{{.Names}}' | grep -qx "$name"; then
    info "Stopping and removing existing container: $name"
    docker rm -f "$name"
  fi
}

# Build images
info "Building images..."
docker build -t abacws-api ./api -f ./api/Dockerfile
docker build -t abacws-visualiser ./visualiser -f ./visualiser/Dockerfile
docker build -t rasa-frontend ./rasa-frontend -f ./rasa-frontend/Dockerfile
docker build -t abacws-sender . -f telemetry/Dockerfile

# Stop/remove existing containers (idempotent)
rm_if_exists abacws-sender
rm_if_exists rasa-frontend-bldg1
rm_if_exists abacws-visualiser
rm_if_exists abacws-api
rm_if_exists abacws-mongo

# Run Mongo
info "Starting mongo"
docker run -d \
  --name abacws-mongo \
  --restart always \
  -v ${VOLUME}:/data/db \
  -p 27017:27017 \
  --network ${NETWORK} \
  mongo

# Run API (mount data dir if present)
info "Starting API"
API_MOUNT="${BASEDIR}/api/src/api/data"
API_MOUNT_FLAG=""
if [ -d "$API_MOUNT" ]; then
  API_MOUNT_FLAG="-v ${API_MOUNT}:/api/src/api/data"
  info "Binding host data dir: ${API_MOUNT}"
fi

docker run -d \
  --name abacws-api \
  --hostname apihost \
  --restart always \
  -e API_PORT=5000 \
  -e MONGO_URL=mongodb://mongo:27017 \
  -e JWT_SECRET='change-this-jwt-secret-in-production-use-strong-random-string' \
  -e SESSION_SECRET='change-this-secret-in-production' \
  -e API_KEY='V3rySecur3Pas3word' \
  -p 5000:5000 \
  ${API_MOUNT_FLAG} \
  --network ${NETWORK} \
  --health-cmd 'sh -c "wget -qO- http://localhost:5000/health | grep -q ok"' \
  --health-interval 30s \
  --health-timeout 5s \
  --health-retries 5 \
  abacws-api

# Run Visualiser
info "Starting visualiser"
docker run -d \
  --name abacws-visualiser \
  --hostname visualiserhost \
  --restart always \
  -e WEB_PORT=80 \
  -e API_HOST=api:5000 \
  -p 8090:80 \
  --network ${NETWORK} \
  --label traefik.enable=true \
  --label traefik.http.services.abacws-visualiser.loadbalancer.server.port=80 \
  --label traefik.http.routers.abacws-visualiser.rule='Host("visualiser.abacws.example.com")' \
  --label traefik.http.routers.abacws-visualiser.entrypoints=https \
  --label traefik.http.routers.abacws-visualiser.tls=true \
  --health-cmd 'sh -c "wget -qO- http://localhost/health | grep -q ok"' \
  --health-interval 30s \
  --health-timeout 10s \
  --health-retries 5 \
  abacws-visualiser

# Run Rasa frontend (development mount)
info "Starting rasa-frontend"
RASA_MOUNT="${BASEDIR}/rasa-frontend"

docker run -d \
  --name rasa-frontend-bldg1 \
  --hostname rasa-frontend-host-bldg1 \
  --restart unless-stopped \
  -e NODE_ENV=development \
  -e REACT_APP_API_URL=http://localhost:5000/api \
  -e REACT_APP_VISUALIZER_URL=http://localhost:8090 \
  -p 3000:3000 \
  -v ${RASA_MOUNT}:/app \
  -v /app/node_modules \
  --network ${NETWORK} \
  rasa-frontend

# Run Sender
info "Starting sender"
docker run -d \
  --name abacws-sender \
  --restart always \
  -e API_BASE=http://api:5000/api \
  -e INTERVAL_SECONDS=10 \
  -e API_HEALTH=http://api:5000/health \
  -e VIS_HEALTH=http://visualiser:80/health \
  -p 8088:8088 \
  --network ${NETWORK} \
  --health-cmd 'sh -c "wget -qO- http://localhost:8088/health | grep -q ok"' \
  --health-interval 30s \
  --health-timeout 5s \
  --health-retries 5 \
  abacws-sender

info "All containers started. Use 'docker ps' and 'docker logs -f <name>' to inspect." 
info "If you need the script executable: chmod +x ./start-containers.sh"
