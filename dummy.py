import requests
import json
import time
import random
import logging
import os
from typing import List, Dict

# Configurations (can be set via environment variables)
API_BASE = os.getenv("API_BASE", "http://localhost:8090/api")
API_KEY = os.getenv("API_KEY", "V3rySecur3Pas3word")
INTERVAL_SECONDS = int(os.getenv("INTERVAL_SECONDS", "10"))
HEADERS = {"Content-Type": "application/json", "x-api-key": API_KEY}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s: %(message)s",
    datefmt="%H:%M:%S"
)

def build_device_names() -> List[str]:
    """Return list of device names, skipping 'node_5.22'."""
    return [f"node_5.{i:02d}" for i in range(1, 35) if i != 22]

def generate_sensor_data() -> Dict[str, dict]:
    """Generate synthetic sensor data payload for all channels."""
    return {
        "uv_light": {"value": round(random.uniform(0.0, 1.0), 2), "units": "UV Index"},
        "loudness": {"value": round(random.uniform(30.0, 80.0), 1), "units": "dB"},
        "pm1.0atmospheric": {"value": round(random.uniform(1.0, 3.0), 1), "units": "µg/m³"},
        "pm2.5atmospheric": {"value": round(random.uniform(2.0, 5.0), 1), "units": "µg/m³"},
        "visible_light": {"value": random.randint(200, 600), "units": "Lux"},
        "ir_light": {"value": random.randint(200, 600), "units": "Lux"},
        "mq5_sensor_voltage": {"value": round(random.uniform(0.5, 1.0), 2), "units": "Volts"},
        "humidity": {"value": round(random.uniform(15.0, 60.0), 2), "units": "%"},
        "luminance": {"value": round(random.uniform(20.0, 50.0), 2), "units": "cd/m²"},
        "no2": {"value": random.randint(100, 300), "units": ""},
    }

def send(session: requests.Session, device_name: str, payload: dict) -> bool:
    url = f"{API_BASE}/devices/{device_name}/data"
    try:
        r = session.put(url, headers=HEADERS, data=json.dumps(payload), timeout=10)
        r.raise_for_status()
        logging.debug(f"Sent data to {device_name}: {payload}")
        return True
    except Exception as e:
        logging.error(f"Error sending to {device_name}: {e}")
        return False

def main():
    device_names = build_device_names()
    error_counts = {name: 0 for name in device_names}
    logging.info(f"Sending to {len(device_names)} devices every {INTERVAL_SECONDS}s...")

    with requests.Session() as session:
        try:
            while True:
                cycle_start = time.time()
                for name in device_names:
                    payload = generate_sensor_data()
                    if not send(session, name, payload):
                        error_counts[name] += 1
                elapsed = time.time() - cycle_start
                to_sleep = max(0, INTERVAL_SECONDS - elapsed)
                logging.info(f"Batch sent. Sleeping for {to_sleep:.1f} seconds.")
                time.sleep(to_sleep)
        except KeyboardInterrupt:
            logging.info("Graceful shutdown by user.")
            failed = {k: v for k, v in error_counts.items() if v > 0}
            if failed:
                logging.info("Error summary per device:")
                for device, count in failed.items():
                    logging.info(f"{device}: {count} errors")
            logging.info("Shutdown complete.")

if __name__ == "__main__":
    main()
