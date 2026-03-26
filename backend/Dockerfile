FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (jq Python package needs libjq-dev + libonig-dev)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libjq-dev \
    libonig-dev \
    autoconf \
    automake \
    libtool \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

# Expose port
EXPOSE 8000

# Run with uvicorn
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
