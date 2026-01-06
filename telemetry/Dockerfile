FROM python:3.11-slim
WORKDIR /app

# Copy scripts
COPY dummy.py /app/dummy.py
COPY telemetry/server.py /app/server.py

# Install dependencies
RUN pip install --no-cache-dir requests

# Defaults for in-network service discovery
ENV API_BASE=http://api:5000/api \
    INTERVAL_SECONDS=30 \
    PORT=8088 \
    API_HEALTH=http://api:5000/health \
    VIS_HEALTH=http://visualiser:80/health

EXPOSE 8088
CMD ["python", "server.py"]
