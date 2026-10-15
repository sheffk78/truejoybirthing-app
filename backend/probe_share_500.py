import os, sys, json, traceback, asyncio
os.environ.setdefault("GW_E2E", "1")
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "truejoybirthing_test")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-local-only")
ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)
os.chdir(ROOT)

import httpx
import asyncio

async def main():
    # Run the real server via ASGI transport on a live loop
    import server
    transport = httpx.ASGITransport(app=server.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.post("/api/auth/login", json={"email": "flowtest_doula@test.com", "password": "password123"})
        print("login:", r.status_code)
        tok = r.json()["session_token"]
        r2 = await c.get("/api/provider/share-requests", headers={"Authorization": f"Bearer {tok}"})
        print("share-requests:", r2.status_code, r2.text[:500])

asyncio.run(main())