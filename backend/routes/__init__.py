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
- provider.py: Unified provider routes (clients, appointments, notes, visits)

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

