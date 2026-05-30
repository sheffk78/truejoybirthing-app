FROM python:3.12

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# Copy pre-built admin frontend dist into the container
COPY admin-frontend/dist/ /app/admin-frontend/dist/

EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]