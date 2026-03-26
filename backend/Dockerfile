FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY backend/ .

# Default port (Railway sets PORT env var)
ENV PORT=8000
EXPOSE 8000

# Use shell form so $PORT gets expanded
CMD uvicorn server:app --host 0.0.0.0 --port $PORT
