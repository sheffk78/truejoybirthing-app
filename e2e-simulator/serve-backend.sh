#!/bin/bash
# TJB e2e backend launcher — matches the verified 9/28 stack (e2e-simulator/PLAN.md):
# GW_E2E=1 (auth ceiling raise), mongo 27017, db truejoybirthing_test, uvicorn on 127.0.0.1:8011.
cd /Users/socializerender/.openclaw/workspace/Kit/life/brands/TrueJoyBirthing/projects/TrueJoyBirthing-Mobile/backend
export GW_E2E=1
export MONGO_URL="mongodb://localhost:27017"
export DB_NAME=truejoybirthing_test
export JWT_SECRET_KEY=test-secret-local-only
export REACT_APP_BACKEND_URL=http://127.0.0.1:8011
export APP_BASE_URL=http://127.0.0.1:8011
export FRONTEND_BASE_URL=http://127.0.0.1:8011
export PORT=8011
exec .venv/bin/uvicorn server:app --host 127.0.0.1 --port 8011