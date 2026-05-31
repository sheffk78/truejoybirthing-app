FROM python:3.12

WORKDIR /app

# Install core requirements first (fast, no grpcio)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Try to install GA4 dependencies (grpcio-heavy, may fail on some platforms)
# If this fails, GA4 endpoints return 503 but the rest of the app works fine
COPY requirements-optional.txt .
RUN pip install --no-cache-dir -r requirements-optional.txt || echo "WARNING: Optional GA4 deps failed to install, analytics features will be unavailable"

COPY . .

# Admin frontend directory (server.py checks for index.html and mounts the
# SPA dashboard if found; an empty dir means dashboard is unavailable)
RUN mkdir -p admin-frontend/dist

# Railway assigns a dynamic PORT — use a start script to expand $PORT at runtime
RUN printf '#!/bin/sh\nPORT=${PORT:-8000}\necho "Starting uvicorn on port $PORT"\nexec uvicorn server:app --host 0.0.0.0 --port $PORT\n' > /app/start.sh && chmod +x /app/start.sh

EXPOSE 8000

CMD ["/app/start.sh"]