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
    from routes import auth, messages, notifications, marketplace, admin
    
    # Initialize dependencies
    init_dependencies(db, pwd_context, ...)
    
    # Include routers
    app.include_router(auth.router, prefix="/api")
    app.include_router(messages.router, prefix="/api")
    ...
"""

from .dependencies import init_dependencies
from . import auth, messages, notifications, marketplace, admin

__all__ = [
    "init_dependencies",
    "auth",
    "messages", 
    "notifications",
    "marketplace",
    "admin"
]
