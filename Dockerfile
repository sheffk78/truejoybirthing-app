FROM python:3.12

WORKDIR /app

# Install core requirements first (fast, no grpcio)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Try to install GA4 dependencies (grpcio-heavy, may fail on some platforms)
# If this fails, GA4 endpoints return 503 but the rest of the app works fine
COPY backend/requirements-optional.txt .
RUN pip install --no-cache-dir -r requirements-optional.txt || echo "WARNING: Optional GA4 deps failed to install, analytics features will be unavailable"

# Copy backend code
COPY backend/ .

# Copy pre-built admin frontend SPA (built from admin-frontend/ before deploy)
COPY admin-frontend/dist/ /app/admin-frontend/dist/

# Railway assigns a dynamic PORT — use a start script to expand $PORT at runtime
RUN printf '#!/bin/sh\nPORT=${PORT:-8000}\necho "Starting uvicorn on port $PORT"\nexec uvicorn server:app --host 0.0.0.0 --port $PORT\n' > /app/start.sh && chmod +x /app/start.sh

EXPOSE 8000

# Create non-root user for security
RUN groupadd -r appgroup && useradd -r -g appgroup -d /app -s /bin/false appuser && \
    chown -R appuser:appgroup /app

USER appuser
CMD ["/app/start.sh"]