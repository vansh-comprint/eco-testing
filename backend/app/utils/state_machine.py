"""
State Machine Validation for EcoTribe Entities

This module enforces valid state transitions for assets, batches, and pickups.
Invalid transitions will raise StateTransitionError.
"""

from typing import Dict, Set, Optional, List
from enum import Enum

from app.utils.exceptions import ValidationError


class StateTransitionError(ValidationError):
    """Raised when an invalid state transition is attempted."""

    def __init__(self, entity_type: str, current_status: str, target_status: str, allowed: Set[str]):
        allowed_str = ", ".join(sorted(allowed)) if allowed else "none"
        message = (
            f"Invalid {entity_type} status transition: '{current_status}' → '{target_status}'. "
            f"Allowed transitions from '{current_status}': [{allowed_str}]"
        )
        super().__init__(message)
        self.entity_type = entity_type
        self.current_status = current_status
        self.target_status = target_status
        self.allowed_transitions = allowed


# =============================================================================
# ASSET STATE MACHINE
# =============================================================================

# Valid transitions for assets
# Format: current_status -> set of valid next statuses
ASSET_TRANSITIONS: Dict[str, Set[str]] = {
    # Initial state - can be assigned to employee
    "pending_assignment": {"assigned"},

    # Assigned to employee - can start evaluation or be unassigned
    "assigned": {"check_in_started", "pending_assignment"},

    # Employee started evaluation - must complete submission
    "check_in_started": {"submitted"},

    # Submitted - auto-transitions to review
    "submitted": {"remote_review"},

    # Under remote review - tech decides accept/reject
    "remote_review": {"conditionally_accepted", "remote_rejected"},

    # Rejected remotely - can be disputed or re-reviewed
    "remote_rejected": {"disputed", "remote_review"},

    # Disputed - goes back to review or stays disputed
    "disputed": {"remote_review", "conditionally_accepted", "remote_rejected"},

    # Conditionally accepted - ready for pickup flow
    "conditionally_accepted": {"ready_for_pickup", "pickup_requested"},

    # Ready for pickup (batch approved) - waiting for pickup request
    "ready_for_pickup": {"pickup_requested"},

    # Pickup requested - waiting for logistics assignment
    "pickup_requested": {"pickup_scheduled"},

    # Pickup scheduled - logistics will execute
    "pickup_scheduled": {"picked_up", "pickup_failed_qc"},

    # Pickup failed on-site QC - back to scheduled or disputed
    "pickup_failed_qc": {"pickup_scheduled", "disputed"},

    # Picked up by logistics
    "picked_up": {"in_transit"},

    # In transit to facility
    "in_transit": {"facility_qc"},

    # At facility QC
    "facility_qc": {"final_accepted", "final_rejected"},

    # Final rejected at facility - can dispute
    "final_rejected": {"disputed", "facility_qc"},

    # Final accepted - ready for payout
    "final_accepted": {"payout_pending"},

    # Payout pending
    "payout_pending": {"completed"},

    # Terminal state - no further transitions
    "completed": set(),
}

# Statuses that require specific conditions
ASSET_TRANSITION_REQUIREMENTS: Dict[str, Dict[str, List[str]]] = {
    "assigned": {
        # To transition to 'assigned', assigned_to_user_id must be set
        "required_fields": ["assigned_to_user_id"],
    },
    "conditionally_accepted": {
        # To transition to 'conditionally_accepted', grade must be set
        "required_fields": ["grade"],
    },
}


def validate_asset_transition(
    current_status: str,
    target_status: str,
    asset_data: Optional[dict] = None
) -> bool:
    """
    Validate an asset status transition.

    Args:
        current_status: The current asset status
        target_status: The desired new status
        asset_data: Optional dict with asset fields for conditional validation

    Returns:
        True if transition is valid

    Raises:
        StateTransitionError: If the transition is not allowed
    """
    # Normalize statuses (handle enum values)
    if hasattr(current_status, 'value'):
        current_status = current_status.value
    if hasattr(target_status, 'value'):
        target_status = target_status.value

    # If no change, always valid
    if current_status == target_status:
        return True

    # Get allowed transitions
    allowed = ASSET_TRANSITIONS.get(current_status, set())

    if target_status not in allowed:
        raise StateTransitionError("asset", current_status, target_status, allowed)

    # Check additional requirements for target status
    if target_status in ASSET_TRANSITION_REQUIREMENTS and asset_data:
        requirements = ASSET_TRANSITION_REQUIREMENTS[target_status]
        required_fields = requirements.get("required_fields", [])

        for field in required_fields:
            if not asset_data.get(field):
                raise ValidationError(
                    f"Cannot transition to '{target_status}': "
                    f"field '{field}' is required but not provided"
                )

    return True


def get_allowed_asset_transitions(current_status: str) -> Set[str]:
    """Get all allowed next statuses for an asset."""
    if hasattr(current_status, 'value'):
        current_status = current_status.value
    return ASSET_TRANSITIONS.get(current_status, set()).copy()


# =============================================================================
# BATCH STATE MACHINE
# =============================================================================

BATCH_TRANSITIONS: Dict[str, Set[str]] = {
    # Draft - can be submitted or cancelled
    "draft": {"pending_approval", "cancelled"},

    # Pending approval - Org Admin decides
    "pending_approval": {"approved", "rejected"},

    # Approved - pickup creation initiated
    "approved": {"active", "pickup_scheduled"},

    # Rejected - can be revised back to draft
    "rejected": {"draft"},

    # Active - pickup in progress
    "active": {"pickup_scheduled", "completed"},

    # Pickup scheduled
    "pickup_scheduled": {"picked_up"},

    # Picked up - all assets collected
    "picked_up": {"in_transit", "completed"},

    # In transit
    "in_transit": {"completed"},

    # Cancelled - terminal
    "cancelled": set(),

    # Completed - terminal
    "completed": set(),
}


def validate_batch_transition(current_status: str, target_status: str) -> bool:
    """Validate a batch status transition."""
    if hasattr(current_status, 'value'):
        current_status = current_status.value
    if hasattr(target_status, 'value'):
        target_status = target_status.value

    if current_status == target_status:
        return True

    allowed = BATCH_TRANSITIONS.get(current_status, set())

    if target_status not in allowed:
        raise StateTransitionError("batch", current_status, target_status, allowed)

    return True


def get_allowed_batch_transitions(current_status: str) -> Set[str]:
    """Get all allowed next statuses for a batch."""
    if hasattr(current_status, 'value'):
        current_status = current_status.value
    return BATCH_TRANSITIONS.get(current_status, set()).copy()


# =============================================================================
# PICKUP STATE MACHINE
# =============================================================================

PICKUP_TRANSITIONS: Dict[str, Set[str]] = {
    # Created - waiting for OPS assignment
    "pending_assignment": {"assigned_to_logistics_admin"},

    # Assigned to logistics admin - waiting for driver assignment
    "assigned_to_logistics_admin": {"assigned_to_logistics_user", "pending_assignment"},

    # Assigned to driver - waiting for scheduling
    "assigned_to_logistics_user": {"scheduled", "assigned_to_logistics_admin"},

    # Scheduled - ready for execution
    "scheduled": {"in_progress", "cancelled", "rescheduled"},

    # Rescheduled
    "rescheduled": {"scheduled", "cancelled"},

    # In progress - driver is executing
    "in_progress": {"completed", "partial", "failed"},

    # Partial - some assets picked up
    "partial": {"completed", "rescheduled"},

    # Failed
    "failed": {"rescheduled", "cancelled"},

    # Cancelled - terminal
    "cancelled": set(),

    # Completed - terminal
    "completed": set(),
}


def validate_pickup_transition(current_status: str, target_status: str) -> bool:
    """Validate a pickup status transition."""
    if hasattr(current_status, 'value'):
        current_status = current_status.value
    if hasattr(target_status, 'value'):
        target_status = target_status.value

    if current_status == target_status:
        return True

    allowed = PICKUP_TRANSITIONS.get(current_status, set())

    if target_status not in allowed:
        raise StateTransitionError("pickup", current_status, target_status, allowed)

    return True


def get_allowed_pickup_transitions(current_status: str) -> Set[str]:
    """Get all allowed next statuses for a pickup."""
    if hasattr(current_status, 'value'):
        current_status = current_status.value
    return PICKUP_TRANSITIONS.get(current_status, set()).copy()


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def get_terminal_statuses(entity_type: str) -> Set[str]:
    """Get terminal (end) statuses for an entity type."""
    transitions = {
        "asset": ASSET_TRANSITIONS,
        "batch": BATCH_TRANSITIONS,
        "pickup": PICKUP_TRANSITIONS,
    }.get(entity_type, {})

    return {status for status, allowed in transitions.items() if not allowed}


def get_workflow_path(entity_type: str, start: str, end: str) -> Optional[List[str]]:
    """
    Find the shortest path between two statuses (for documentation/debugging).
    Returns None if no path exists.
    """
    transitions = {
        "asset": ASSET_TRANSITIONS,
        "batch": BATCH_TRANSITIONS,
        "pickup": PICKUP_TRANSITIONS,
    }.get(entity_type, {})

    if not transitions:
        return None

    # BFS to find shortest path
    from collections import deque

    queue = deque([(start, [start])])
    visited = {start}

    while queue:
        current, path = queue.popleft()

        if current == end:
            return path

        for next_status in transitions.get(current, set()):
            if next_status not in visited:
                visited.add(next_status)
                queue.append((next_status, path + [next_status]))

    return None  # No path found
