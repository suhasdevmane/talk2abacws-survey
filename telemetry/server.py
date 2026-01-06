import http.server
import socketserver
import threading
import subprocess
import time
import os
import sys
import requests

PORT = int(os.getenv("PORT", "8088"))
API_HEALTH = os.getenv("API_HEALTH", "http://api:5000/health")
VIS_HEALTH = os.getenv("VIS_HEALTH", "http://visualiser:80/health")
API_BASE = os.getenv("API_BASE", "http://api:5000/api")
INTERVAL_SECONDS = os.getenv("INTERVAL_SECONDS", "30")

child = None

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            status = {
                "status": "ok",
                "child_running": child is not None and child.poll() is None
            }
            self.wfile.write(str(status).encode('utf-8'))
        else:
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"telemetry-sender running")

def wait_for(url, timeout=180):
    start = time.time()
    while time.time() - start < timeout:
        try:
            r = requests.get(url, timeout=5)
            if r.ok:
                return True
        except Exception:
            pass
        time.sleep(2)
    return False

def run_dummy():
    global child
    env = os.environ.copy()
    env['API_BASE'] = API_BASE
    env['INTERVAL_SECONDS'] = INTERVAL_SECONDS
    # Launch the existing dummy.py in the repo root copied into image at /app/dummy.py
    child = subprocess.Popen([sys.executable, '/app/dummy.py'], env=env)
    child.wait()

if __name__ == '__main__':
    print('Waiting for API and visualiser to become healthy...')
    ok_api = wait_for(API_HEALTH)
    ok_vis = wait_for(VIS_HEALTH)
    print(f'API healthy: {ok_api}, VIS healthy: {ok_vis}')

    # Start telemetry sender in background thread
    t = threading.Thread(target=run_dummy, daemon=True)
    t.start()

    # Start simple HTTP server to keep container alive and provide health
    with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
        print(f"Serving health on port {PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('Shutting down...')
        finally:
            if child and child.poll() is None:
                child.terminate()
                try:
                    child.wait(timeout=30)
                except Exception:
                    child.kill()
