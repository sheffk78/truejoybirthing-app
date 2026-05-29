# ===== Stage 1: Build the admin dashboard frontend =====
FROM node:20-slim AS admin-builder

WORKDIR /build

# Copy frontend source
COPY admin-frontend/ ./

# Install dependencies and build
RUN npm ci && npm run build

# ===== Stage 2: Python backend =====
FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# Copy built admin frontend from builder stage
COPY --from=admin-builder /build/dist /app/admin-frontend/dist

EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]