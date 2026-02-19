"""
Utility functions for client-centered architecture
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any

# Active client window: from creation until 6 weeks after due date
POSTPARTUM_ACTIVE_WEEKS = 6

def is_client_active(client: Dict[str, Any]) -> bool:
    """
    Determine if a client is active.
    A client is active from creation until 6 weeks after their due date.
    If no due date is set, they remain active indefinitely.
    If birth_date is set, use that instead of due_date for the 6-week calculation.
    """
    now = datetime.now(timezone.utc)
    
    # Use birth_date if available, otherwise due_date
    reference_date_str = client.get("birth_date") or client.get("due_date") or client.get("edd")
    
    if not reference_date_str:
        # No date set - consider active
        return True
    
    try:
        # Parse the date string
        if isinstance(reference_date_str, datetime):
            reference_date = reference_date_str
        else:
            # Try different date formats
            for fmt in ["%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S.%fZ"]:
                try:
                    reference_date = datetime.strptime(reference_date_str[:19], fmt[:len(reference_date_str)])
                    break
                except ValueError:
                    continue
            else:
                # Couldn't parse - consider active
                return True
        
        # Make timezone aware if not already
        if reference_date.tzinfo is None:
            reference_date = reference_date.replace(tzinfo=timezone.utc)
        
        # Calculate cutoff: 6 weeks after reference date
        cutoff_date = reference_date + timedelta(weeks=POSTPARTUM_ACTIVE_WEEKS)
        
        return now <= cutoff_date
        
    except Exception:
        # If any error, default to active
        return True


def calculate_client_active_status(client: Dict[str, Any]) -> Dict[str, Any]:
    """
    Add computed is_active field to client dict.
    Returns the client dict with is_active added.
    """
    client_copy = dict(client)
    client_copy["is_active"] = is_client_active(client)
    return client_copy


def get_active_clients_query(provider_id: str, include_inactive: bool = False) -> Dict[str, Any]:
    """
    Build MongoDB query for fetching clients.
    If include_inactive is False, only return clients that are still active.
    """
    base_query = {"pro_user_id": provider_id}
    
    if include_inactive:
        return base_query
    
    # For active-only, we need to filter by date
    now = datetime.now(timezone.utc)
    cutoff_date = now - timedelta(weeks=POSTPARTUM_ACTIVE_WEEKS)
    
    # Active means:
    # 1. No due_date/birth_date set, OR
    # 2. due_date/birth_date is within the last 6 weeks from now
    # Since we can't do complex OR with multiple fields easily,
    # we'll fetch all and filter in code, or use aggregation
    
    # For simplicity, return base query and filter in application code
    return base_query


def format_datetime_for_db(dt_string: str) -> datetime:
    """Convert datetime string to datetime object for MongoDB"""
    if isinstance(dt_string, datetime):
        return dt_string
    
    # Try various formats
    formats = [
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
    ]
    
    for fmt in formats:
        try:
            dt = datetime.strptime(dt_string, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    
    raise ValueError(f"Unable to parse datetime string: {dt_string}")


def format_date_for_db(date_string: str) -> str:
    """Normalize date string to YYYY-MM-DD format"""
    if not date_string:
        return date_string
    
    # If already in correct format
    if len(date_string) == 10 and date_string[4] == '-' and date_string[7] == '-':
        return date_string
    
    # Try to parse and reformat
    try:
        dt = format_datetime_for_db(date_string)
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        return date_string
