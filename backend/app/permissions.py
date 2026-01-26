"""
Role-based permission helpers for multi-business/location access.
Users are assigned to businesses/locations with roles (no ownership).
"""

from typing import Iterable
from sqlalchemy.orm import Session
from .models import UserBusinessRole, UserLocationRole

BUSINESS_ADMIN_ROLES = {"super_admin", "business_admin"}
BUSINESS_WRITE_ROLES = {"super_admin", "business_admin", "location_admin", "manager"}
BUSINESS_READ_ROLES = {"super_admin", "business_admin", "location_admin", "manager", "viewer"}
LOCATION_WRITE_ROLES = {"location_admin", "manager"}
LOCATION_READ_ROLES = {"location_admin", "manager", "viewer"}


def is_super_admin(db: Session, user_id: str) -> bool:
    return (
        db.query(UserBusinessRole)
        .filter(UserBusinessRole.user_id == user_id, UserBusinessRole.role == "super_admin")
        .first()
        is not None
    )


def has_business_role(db: Session, user_id: str, business_id: str, roles: Iterable[str]) -> bool:
    if is_super_admin(db, user_id):
        return True
    return (
        db.query(UserBusinessRole)
        .filter(
            UserBusinessRole.user_id == user_id,
            UserBusinessRole.business_id == business_id,
            UserBusinessRole.role.in_(list(roles)),
        )
        .first()
        is not None
    )


def has_location_role(db: Session, user_id: str, location_id: str, roles: Iterable[str]) -> bool:
    if is_super_admin(db, user_id):
        return True
    return (
        db.query(UserLocationRole)
        .filter(
            UserLocationRole.user_id == user_id,
            UserLocationRole.location_id == location_id,
            UserLocationRole.role.in_(list(roles)),
        )
        .first()
        is not None
    )
