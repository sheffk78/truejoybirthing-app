"""
Backend Routes Module

This module contains modular FastAPI routers for the True Joy Birthing API.
Each router handles a specific domain of functionality.

Structure:
- dependencies.py: Shared dependencies (db, auth, utils)
- auth.py: Authentication routes (register, login, session)
- messages.py: Messaging routes (conversations, messages)
- notifications.py: Notification routes
- marketplace.py: Provider marketplace routes
- admin.py: Admin routes (user management, content)
- mom.py: Mom-specific routes (profile, onboarding, appointments)
- doula.py: Doula-specific routes (profile, dashboard, clients, notes)
- midwife.py: Midwife-specific routes (profile, dashboard, clients, notes, visits)
- provider_unified.py: Unified provider routes (clients, appointments, notes, dashboard)
- contracts.py: Contract routes (doula and midwife contracts)
- invoices.py: Invoice routes
- visits.py: Visit routes (provider visits)
- care_plans.py: Care plan routes (birth plan, wellness, postpartum, timeline)
- subscription.py: Subscription routes

Usage:
    from routes.dependencies import init_dependencies
    
    # Initialize dependencies FIRST
    init_dependencies(db, pwd_context, ...)
    
    # THEN import routers (after init)
    from routes import admin, messages, notifications, marketplace
    
    # Include routers
    app.include_router(admin.router, prefix="/api")
    ...
    
NOTE: Route modules must be imported AFTER init_dependencies() is called
because they use Depends() with auth functions that require initialization.
"""

from .dependencies import init_dependencies

__all__ = [
    "init_dependencies",
]

