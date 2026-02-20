"""
Push Notification Service for True Joy Birthing

Uses Expo Push Notifications to send push notifications to mobile devices.
Integrates with the existing in-app notification system.
"""

import os
import logging
from typing import Optional, Dict, List, Tuple
from datetime import datetime, timezone
from exponent_server_sdk import (
    DeviceNotRegisteredError,
    PushClient,
    PushMessage,
    PushServerError,
    PushTicketError,
)
import requests

logger = logging.getLogger(__name__)

# Get Expo access token from environment (optional but recommended for security)
EXPO_ACCESS_TOKEN = os.environ.get("EXPO_ACCESS_TOKEN", "")

class ExpoPushService:
    """Service for sending push notifications via Expo Push API"""
    
    def __init__(self):
        # Initialize the Expo SDK client
        if EXPO_ACCESS_TOKEN:
            session = requests.Session()
            session.headers.update({
                "Authorization": f"Bearer {EXPO_ACCESS_TOKEN}",
                "accept": "application/json",
                "accept-encoding": "gzip, deflate",
                "content-type": "application/json",
            })
            self.push_client = PushClient(session=session)
        else:
            self.push_client = PushClient()
    
    def is_valid_token(self, token: str) -> bool:
        """Check if a push token has valid Expo format"""
        if not token:
            return False
        return token.startswith("ExponentPushToken[") and token.endswith("]")
    
    async def send_push_notification(
        self,
        push_token: str,
        title: str,
        body: str,
        data: Optional[Dict] = None,
        sound: str = "default",
        badge: Optional[int] = None,
        priority: str = "high"
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Send a push notification to a single device.
        
        Args:
            push_token: Expo push token (ExponentPushToken[xxx])
            title: Notification title
            body: Notification body text
            data: Additional data payload
            sound: Sound setting (default, null, or custom)
            badge: Badge count for iOS
            priority: Notification priority (high, normal, low)
            
        Returns:
            Tuple of (success: bool, ticket_id: Optional[str], error_message: Optional[str])
        """
        try:
            # Validate push token format
            if not self.is_valid_token(push_token):
                logger.warning(f"Invalid push token format: {push_token[:30]}...")
                return False, None, "Invalid push token format"
            
            # Create the push message
            message = PushMessage(
                to=push_token,
                title=title,
                body=body,
                data=data or {},
                sound=sound,
                badge=badge,
                priority=priority
            )
            
            # Send the notification
            response = self.push_client.publish(message)
            response.validate_response()
            
            ticket_id = response.id if hasattr(response, 'id') else None
            logger.info(f"Push notification sent successfully. Ticket: {ticket_id}")
            return True, ticket_id, None
            
        except DeviceNotRegisteredError as e:
            error_msg = f"Device not registered: {str(e)}"
            logger.warning(error_msg)
            return False, None, error_msg
            
        except PushServerError as e:
            error_msg = f"Expo server error: {str(e)}"
            logger.error(error_msg)
            return False, None, error_msg
            
        except PushTicketError as e:
            error_msg = f"Push ticket error: {str(e)}"
            logger.error(error_msg)
            return False, None, error_msg
            
        except Exception as e:
            error_msg = f"Unexpected error sending push notification: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return False, None, error_msg
    
    async def send_bulk_push_notifications(
        self,
        push_tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict] = None,
        sound: str = "default",
    ) -> Dict:
        """
        Send push notifications to multiple devices efficiently.
        Expo API accepts up to 100 messages per request.
        
        Returns:
            {
                'total': int,
                'successful': int,
                'failed': int,
                'tickets': List[str],
                'failed_tokens': List[Dict]
            }
        """
        result = {
            "total": len(push_tokens),
            "successful": 0,
            "failed": 0,
            "tickets": [],
            "failed_tokens": []
        }
        
        # Filter valid tokens
        valid_tokens = [t for t in push_tokens if self.is_valid_token(t)]
        
        if not valid_tokens:
            return result
        
        # Batch tokens into groups of 100 (Expo API limit)
        batch_size = 100
        for i in range(0, len(valid_tokens), batch_size):
            batch_tokens = valid_tokens[i:i + batch_size]
            
            try:
                messages = [
                    PushMessage(
                        to=token,
                        title=title,
                        body=body,
                        data=data or {},
                        sound=sound,
                    )
                    for token in batch_tokens
                ]
                
                responses = self.push_client.publish_multiple(messages)
                
                for idx, response in enumerate(responses):
                    try:
                        response.validate_response()
                        result["successful"] += 1
                        if hasattr(response, 'id'):
                            result["tickets"].append(response.id)
                    except (DeviceNotRegisteredError, PushTicketError) as e:
                        result["failed"] += 1
                        result["failed_tokens"].append({
                            "token": batch_tokens[idx][:30] + "...",
                            "error": str(e)
                        })
                        
            except Exception as e:
                logger.error(f"Error sending batch: {str(e)}", exc_info=True)
                result["failed"] += len(batch_tokens)
        
        return result


# Global instance
expo_push_service = ExpoPushService()


async def send_push_to_user(
    db,
    user_id: str,
    title: str,
    body: str,
    data: Optional[Dict] = None,
    notification_type: str = "general"
) -> Optional[str]:
    """
    Send push notification to a user's registered devices.
    
    Args:
        db: Database instance
        user_id: User's ID
        title: Notification title
        body: Notification body
        data: Additional data payload
        notification_type: Type of notification for data payload
        
    Returns:
        ticket_id if successful, None otherwise
    """
    try:
        # Get user's push tokens
        user = await db.users.find_one(
            {"user_id": user_id},
            {"push_tokens": 1, "full_name": 1}
        )
        
        if not user or "push_tokens" not in user:
            logger.debug(f"No push tokens found for user {user_id}")
            return None
        
        # Get active tokens
        active_tokens = [
            token["push_token"]
            for token in user.get("push_tokens", [])
            if token.get("is_active", True) and expo_push_service.is_valid_token(token.get("push_token", ""))
        ]
        
        if not active_tokens:
            logger.debug(f"No active push tokens for user {user_id}")
            return None
        
        # Add notification type to data
        push_data = data or {}
        push_data["notification_type"] = notification_type
        
        # Send to all devices
        if len(active_tokens) == 1:
            success, ticket_id, error = await expo_push_service.send_push_notification(
                active_tokens[0],
                title,
                body,
                push_data
            )
            
            if success:
                # Log successful push
                await db.push_logs.insert_one({
                    "user_id": user_id,
                    "push_token": active_tokens[0][:30] + "...",
                    "ticket_id": ticket_id,
                    "status": "sent",
                    "title": title,
                    "created_at": datetime.now(timezone.utc)
                })
                return ticket_id
            else:
                # Log failed push
                await db.push_logs.insert_one({
                    "user_id": user_id,
                    "push_token": active_tokens[0][:30] + "...",
                    "status": "failed",
                    "error": error,
                    "title": title,
                    "created_at": datetime.now(timezone.utc)
                })
                
                # Mark token as inactive if device not registered
                if error and "not registered" in error.lower():
                    await db.users.update_one(
                        {"user_id": user_id, "push_tokens.push_token": active_tokens[0]},
                        {"$set": {"push_tokens.$.is_active": False}}
                    )
        else:
            # Multiple devices
            result = await expo_push_service.send_bulk_push_notifications(
                active_tokens,
                title,
                body,
                push_data
            )
            
            # Log results
            await db.push_logs.insert_one({
                "user_id": user_id,
                "status": "bulk_sent",
                "total": result["total"],
                "successful": result["successful"],
                "failed": result["failed"],
                "title": title,
                "created_at": datetime.now(timezone.utc)
            })
            
            # Mark failed tokens as inactive
            for failed in result["failed_tokens"]:
                if "not registered" in failed.get("error", "").lower():
                    # Find and deactivate the token
                    for token in active_tokens:
                        if token.startswith(failed["token"].replace("...", "")):
                            await db.users.update_one(
                                {"user_id": user_id, "push_tokens.push_token": token},
                                {"$set": {"push_tokens.$.is_active": False}}
                            )
            
            return result["tickets"][0] if result["tickets"] else None
            
    except Exception as e:
        logger.error(f"Error sending push to user {user_id}: {str(e)}", exc_info=True)
        return None


async def register_push_token(
    db,
    user_id: str,
    push_token: str,
    device_type: str = "unknown"
) -> bool:
    """
    Register or update a user's push notification token.
    
    Args:
        db: Database instance
        user_id: User's ID
        push_token: Expo push token
        device_type: Device platform (ios, android, web)
        
    Returns:
        True if successful, False otherwise
    """
    try:
        if not expo_push_service.is_valid_token(push_token):
            logger.warning(f"Invalid push token format for user {user_id}")
            return False
        
        now = datetime.now(timezone.utc)
        
        # Check if token already exists for this user
        user = await db.users.find_one(
            {"user_id": user_id, "push_tokens.push_token": push_token}
        )
        
        if user:
            # Update existing token
            await db.users.update_one(
                {"user_id": user_id, "push_tokens.push_token": push_token},
                {
                    "$set": {
                        "push_tokens.$.is_active": True,
                        "push_tokens.$.device_type": device_type,
                        "push_tokens.$.last_verified": now
                    }
                }
            )
        else:
            # Add new token
            token_doc = {
                "push_token": push_token,
                "device_type": device_type,
                "is_active": True,
                "created_at": now,
                "last_verified": now
            }
            
            await db.users.update_one(
                {"user_id": user_id},
                {"$push": {"push_tokens": token_doc}}
            )
        
        logger.info(f"Push token registered for user {user_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error registering push token: {str(e)}", exc_info=True)
        return False


async def unregister_push_token(
    db,
    user_id: str,
    push_token: str
) -> bool:
    """
    Unregister a push token (mark as inactive).
    
    Args:
        db: Database instance
        user_id: User's ID
        push_token: Expo push token to unregister
        
    Returns:
        True if successful, False otherwise
    """
    try:
        result = await db.users.update_one(
            {"user_id": user_id, "push_tokens.push_token": push_token},
            {"$set": {"push_tokens.$.is_active": False}}
        )
        
        return result.modified_count > 0
        
    except Exception as e:
        logger.error(f"Error unregistering push token: {str(e)}", exc_info=True)
        return False
