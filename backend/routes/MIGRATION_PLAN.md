# Backend Refactoring Plan

## Overview
This document outlines the phased migration plan for breaking down the monolithic `server.py` (7,888 lines) into modular FastAPI routers.

## Current Structure
```
/app/backend/
├── server.py           # Monolithic file (7,888 lines) - EXISTING
├── routes/
│   ├── __init__.py     # Module exports
│   ├── dependencies.py # Shared dependencies (db, auth, utils)
│   ├── auth.py         # Authentication routes (ready)
│   ├── messages.py     # Messaging routes (ready)
│   ├── notifications.py # Notification routes (ready)
│   ├── marketplace.py  # Marketplace routes (ready)
│   ├── admin.py        # Admin routes (ready)
│   └── provider.py     # Unified provider routes (already exists)
```

## Target Structure (After Full Migration)
```
/app/backend/
├── server.py           # Slim main file (~200 lines) - app setup, middleware, router registration
├── routes/
│   ├── __init__.py
│   ├── dependencies.py # Shared dependencies
│   ├── auth.py         # Auth routes
│   ├── messages.py     # Messaging routes
│   ├── notifications.py
│   ├── marketplace.py
│   ├── admin.py
│   ├── provider.py     # Unified provider routes
│   ├── mom.py          # Mom-specific routes
│   ├── doula.py        # Doula-specific routes
│   ├── midwife.py      # Midwife-specific routes
│   ├── contracts.py    # Contract CRUD & templates
│   ├── invoices.py     # Invoice CRUD
│   ├── subscription.py # Subscription management
│   └── appointments.py # Appointment routes
├── models/
│   └── models.py       # Pydantic models (already exists)
├── utils/
│   └── client_utils.py # Client utility functions (already exists)
└── templates/
    ├── doula_contract_template.py
    └── midwife_contract_template.py
```

## Migration Phases

### Phase 1: Foundation (COMPLETED)
- [x] Created `routes/dependencies.py` - shared deps
- [x] Created `routes/auth.py` - auth routes
- [x] Created `routes/messages.py` - messaging routes
- [x] Created `routes/notifications.py` - notification routes
- [x] Created `routes/marketplace.py` - marketplace routes
- [x] Created `routes/admin.py` - admin routes
- [x] Updated `routes/__init__.py` - module exports

### Phase 2: Integration (COMPLETED)
- [x] Update `server.py` to import route_deps
- [x] Initialize dependencies after auth functions are defined
- [x] Verify server starts correctly with modular structure
- [x] Replace admin routes in server.py with modular router
- [x] Replace marketplace routes in server.py with modular router
- [x] Test all routes still work
- [x] Remove duplicated code from server.py (145 lines removed)

**Completed**: Admin and Marketplace routes now served from modular routers.
- `routes/admin.py` - 4 endpoints migrated
- `routes/marketplace.py` - 2 endpoints migrated
- Server.py reduced from 7,888 → 7,743 lines

### Phase 3: Notifications & Messages (COMPLETED)
- [x] Update `routes/notifications.py` for feature parity
- [x] Update `routes/messages.py` for feature parity  
- [x] Include routers in server.py
- [x] Remove duplicated code from server.py
- [x] Test all routes (19/19 tests passed)

**Completed**: Notifications and Messages routes now served from modular routers.
- `routes/notifications.py` - 3 endpoints migrated
- `routes/messages.py` - 5 endpoints migrated
- Server.py reduced from 7,743 → 7,463 lines
- Note: `/provider/clients/{client_id}/messages` moved to `/messages/client/{client_id}`

### Phase 4: Auth Routes (COMPLETED)
- [x] Update `routes/auth.py` for feature parity
- [x] Include router in server.py
- [x] Remove duplicated code from server.py
- [x] Test all routes (28/28 tests passed)

**Completed**: Auth routes now served from modular router.
- `routes/auth.py` - 7 endpoints migrated (register, login, google-session, me, logout, set-role, update-profile)
- Server.py reduced from 7,463 → 7,190 lines

### Phase 5: Subscription Routes (COMPLETED)
- [x] Create `routes/subscription.py` with feature parity
- [x] Fix datetime timezone bug (offset-naive vs offset-aware)
- [x] Include router in server.py
- [x] Remove duplicated code from server.py
- [x] Test all routes (29/29 tests passed)

**Completed**: Subscription routes now served from modular router.
- `routes/subscription.py` - 6 endpoints migrated (status, pricing, start-trial, activate, cancel, validate-receipt)
- Server.py reduced from 7,190 → 6,893 lines
- Note: IAP endpoints are MOCKED (not connected to real Apple/Google)

### Phase 6: Mom Routes (COMPLETED)
- [x] Create `routes/mom.py` with feature parity
- [x] Include router in server.py
- [x] Remove duplicated mom routes from server.py
- [x] Test all routes (32/32 tests passed)

**Completed**: Mom routes now served from modular router.
- `routes/mom.py` - 9 endpoints migrated (onboarding, profile GET/PUT, midwife-visits, team, team-providers, invoices, invoices/{id}, appointments)
- Server.py reduced from 6,893 → 6,599 lines

### Phase 7: Doula & Midwife Routes (COMPLETED)
- [x] Create `routes/doula.py` with feature parity
- [x] Create `routes/midwife.py` with feature parity
- [x] Include routers in server.py
- [x] Remove duplicated doula/midwife routes from server.py
- [x] Test all routes (36/36 tests passed)

**Completed**: Doula and Midwife core routes now served from modular routers.
- `routes/doula.py` - 6 endpoints migrated (onboarding, profile GET/PUT, dashboard, contract-defaults GET/PUT)
- `routes/midwife.py` - 4 endpoints migrated (onboarding, profile GET/PUT, dashboard)
- Server.py reduced from 6,599 → 6,483 lines

### Phase 3: Role-Specific Routes
- [ ] Create `routes/mom.py` - mom onboarding, profile, birth plan
- [ ] Create `routes/doula.py` - doula onboarding, profile, dashboard
- [ ] Create `routes/midwife.py` - midwife onboarding, profile, dashboard
- [ ] Migrate routes from server.py
- [ ] Test thoroughly

### Phase 4: Feature Routes
- [ ] Create `routes/contracts.py` - contract CRUD, templates, PDF generation
- [ ] Create `routes/invoices.py` - invoice CRUD, payment instructions
- [ ] Create `routes/subscription.py` - subscription management
- [ ] Create `routes/appointments.py` - appointment routes
- [ ] Migrate remaining routes from server.py

### Phase 5: Cleanup
- [ ] Remove all migrated code from server.py
- [ ] server.py should be ~200 lines (setup, middleware, router registration)
- [ ] Full regression testing
- [ ] Update documentation

## Integration Example

```python
# server.py (after migration)
from fastapi import FastAPI
from routes.dependencies import init_dependencies
from routes import auth, messages, notifications, marketplace, admin

app = FastAPI(title="True Joy Birthing API")

# Initialize shared dependencies
init_dependencies(
    database=db,
    password_context=pwd_context,
    secret_key=SECRET_KEY,
    algorithm=ALGORITHM,
    expire_days=ACCESS_TOKEN_EXPIRE_DAYS,
    notification_func=create_notification,
    email_func=send_notification_email,
    websocket_manager=ws_manager,
    sender_email=SENDER_EMAIL
)

# Register modular routers
api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(messages.router)
api_router.include_router(notifications.router)
api_router.include_router(marketplace.router)
api_router.include_router(admin.router)

app.include_router(api_router)
```

## Benefits
1. **Maintainability**: Each domain in its own file
2. **Testing**: Easier to test individual modules
3. **Collaboration**: Multiple developers can work on different modules
4. **Readability**: ~200-400 lines per file instead of 7,888
5. **Faster Imports**: Only import what's needed

## Risks & Mitigations
- **Risk**: Breaking existing functionality
  - **Mitigation**: Phased migration with testing after each phase
  
- **Risk**: Circular imports
  - **Mitigation**: dependencies.py holds all shared state
  
- **Risk**: Auth middleware changes
  - **Mitigation**: Keep existing auth in server.py until all routes migrated

## Notes
- The existing `routes/provider.py` uses a different pattern (init_routes function)
- New modules use direct import from dependencies.py
- All routers use APIRouter from FastAPI
- Dependency injection handled via function parameters (user_id, etc.)
