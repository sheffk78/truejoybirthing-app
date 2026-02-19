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

### Phase 2: Integration (NEXT)
- [ ] Update `server.py` to import and use modular routers
- [ ] Initialize dependencies from server.py
- [ ] Register new routers with `/api` prefix
- [ ] Test all routes still work
- [ ] Remove duplicated code from server.py

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
