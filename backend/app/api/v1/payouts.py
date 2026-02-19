"""API endpoints for Payouts and Wallets"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import require_permission
from app.core.permissions import Permission
from app.models import User
from app.schemas.payout import (
    PayoutCreate,
    PayoutProcess,
    WalletCredit,
    WalletDebit,
)
from app.services.payout_service import PayoutService, WalletService
from app.utils.response import success_response, paginated_response
from app.utils.security import validate_wallet_access, validate_amount

logger = logging.getLogger(__name__)

router = APIRouter()


def _payout_to_dict(payout) -> dict:
    return {
        "id": payout.id,
        "enterprise_id": payout.enterprise_id,
        "batch_id": payout.batch_id,
        "amount": float(payout.amount) if payout.amount else None,
        "status": payout.status,
        "method": payout.method,
        "bank_account_number": payout.bank_account_number,
        "bank_ifsc_code": payout.bank_ifsc_code,
        "upi_id": payout.upi_id,
        "initiated_at": payout.initiated_at,
        "completed_at": payout.completed_at,
        "failed_at": payout.failed_at,
        "failure_reason": payout.failure_reason,
        "transaction_reference": payout.transaction_reference,
        "notes": payout.notes,
        "created_at": payout.created_at,
        "updated_at": payout.updated_at,
    }


def _wallet_to_dict(wallet) -> dict:
    return {
        "id": wallet.id,
        "enterprise_id": wallet.enterprise_id,
        "balance": float(wallet.balance) if wallet.balance else 0,
        "credit_limit": float(wallet.credit_limit) if wallet.credit_limit else None,
        "currency": wallet.currency,
        "created_at": wallet.created_at,
        "updated_at": wallet.updated_at,
    }


def _transaction_to_dict(txn) -> dict:
    return {
        "id": txn.id,
        "wallet_id": txn.wallet_id,
        "payout_id": txn.payout_id,
        "transaction_type": txn.transaction_type,
        "amount": float(txn.amount) if txn.amount else 0,
        "balance_before": float(txn.balance_before) if txn.balance_before else 0,
        "balance_after": float(txn.balance_after) if txn.balance_after else 0,
        "description": txn.description,
        "reference_id": txn.reference_id,
        "created_at": txn.created_at,
    }


# ============================================================================
# Payout Endpoints
# ============================================================================


@router.get("")
async def list_payouts(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    status: str = Query(None, description="Filter by payout status: pending, initiated, completed, failed"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.PAYOUT_VIEW)),
):
    """
    List payouts with role-based scoping.

    Super/OPS Admins see all payouts. Org Admins see payouts for their enterprise.
    Each payout is linked to a batch and enterprise, with payment method details
    (bank transfer or UPI) and processing status.

    **Required permission:** PAYOUT_VIEW
    """
    service = PayoutService(db)
    skip = (page - 1) * page_size

    try:
        payouts, total = await service.list_payouts(
            user=current_user,
            status=status,
            skip=skip,
            limit=page_size,
        )
        await db.commit()

        return paginated_response(
            data=[_payout_to_dict(p) for p in payouts],
            page=page,
            page_size=page_size,
            total=total,
        )
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail="An unexpected error occurred. Please try again.")


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_payout(
    data: PayoutCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.PAYOUT_CREATE)),
):
    """
    Create a payout request for an approved batch.

    Initiates a payout to the enterprise for a completed asset batch.
    Requires the enterprise's bank account or UPI details.

    **Required permission:** PAYOUT_CREATE
    """
    service = PayoutService(db)

    try:
        payout = await service.create_payout(data, current_user)
        await db.commit()
        return success_response(data=_payout_to_dict(payout), message="Payout created")
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{payout_id}")
async def get_payout(
    payout_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.PAYOUT_VIEW)),
):
    """
    Get a payout by ID.

    Returns full payout details including amount, payment method, processing status,
    transaction reference, and timestamps.

    **Required permission:** PAYOUT_VIEW
    """
    service = PayoutService(db)

    payout = await service.get_payout(payout_id)
    if not payout:
        raise HTTPException(status_code=404, detail="Payout not found")

    # Access check
    from app.utils.scoping import is_platform_admin, can_access_enterprise
    from app.utils.exceptions import AuthorizationError
    if not is_platform_admin(current_user):
        if not can_access_enterprise(current_user, str(payout.enterprise_id)):
            raise AuthorizationError("You do not have access to this payout")

    return success_response(data=_payout_to_dict(payout))


@router.post("/{payout_id}/process")
async def process_payout(
    payout_id: str,
    data: PayoutProcess,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.PAYOUT_PROCESS)),
):
    """
    Process a payout (mark as completed or failed).

    - Use `action='complete'` with `transaction_reference` to complete the payout
    - Use `action='fail'` with `failure_reason` to mark as failed

    **Required permission:** PAYOUT_PROCESS
    """
    service = PayoutService(db)

    try:
        payout = await service.process_payout(
            payout_id=payout_id,
            action=data.action,
            user=current_user,
            transaction_reference=data.transaction_reference,
            failure_reason=data.failure_reason,
        )
        await db.commit()
        await db.refresh(payout)
        action_msg = "completed" if data.action == "complete" else "marked as failed"
        return success_response(data=_payout_to_dict(payout), message=f"Payout {action_msg}")
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# Wallet Endpoints
# ============================================================================


@router.get("/wallet/{enterprise_id}")
async def get_wallet(
    enterprise_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.PAYOUT_VIEW)),
):
    """
    Get wallet for an enterprise.

    Returns the enterprise's wallet balance, credit limit, and currency.
    Creates a new wallet if one doesn't exist yet.
    Multi-tenant protection: users can only access wallets within their scope.

    **Required permission:** PAYOUT_VIEW
    """
    validate_wallet_access(current_user, enterprise_id)

    service = WalletService(db)

    try:
        wallet = await service.get_or_create_wallet(enterprise_id)
        await db.commit()
        return success_response(data=_wallet_to_dict(wallet))
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail="An unexpected error occurred. Please try again.")


@router.post("/wallet/{enterprise_id}/credit")
async def credit_wallet(
    enterprise_id: str,
    data: WalletCredit,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.PAYOUT_PROCESS)),
):
    """
    Credit amount to enterprise wallet.

    Adds funds to the enterprise wallet. Returns updated wallet balance
    and the credit transaction record. Multi-tenant protection and amount
    validation applied.

    **Required permission:** PAYOUT_PROCESS
    """
    validate_wallet_access(current_user, enterprise_id)
    validate_amount(data.amount, "credit amount")

    service = WalletService(db)

    try:
        wallet, transaction = await service.credit(enterprise_id, data, current_user)
        await db.commit()
        await db.refresh(wallet)
        await db.refresh(transaction)
        return success_response(
            data={
                "wallet": _wallet_to_dict(wallet),
                "transaction": _transaction_to_dict(transaction),
            },
            message="Wallet credited",
        )
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/wallet/{enterprise_id}/debit")
async def debit_wallet(
    enterprise_id: str,
    data: WalletDebit,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.PAYOUT_PROCESS)),
):
    """
    Debit amount from enterprise wallet.

    Deducts funds from the enterprise wallet. Returns updated wallet balance
    and the debit transaction record. Fails if insufficient balance.
    Multi-tenant protection and amount validation applied.

    **Required permission:** PAYOUT_PROCESS
    """
    validate_wallet_access(current_user, enterprise_id)
    validate_amount(data.amount, "debit amount")

    service = WalletService(db)

    try:
        wallet, transaction = await service.debit(enterprise_id, data, current_user)
        await db.commit()
        await db.refresh(wallet)
        await db.refresh(transaction)
        return success_response(
            data={
                "wallet": _wallet_to_dict(wallet),
                "transaction": _transaction_to_dict(transaction),
            },
            message="Wallet debited",
        )
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/wallet/{enterprise_id}/transactions")
async def list_wallet_transactions(
    enterprise_id: str,
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page (max 100)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.PAYOUT_VIEW)),
):
    """
    List transactions for an enterprise wallet.

    Returns paginated credit and debit transactions with balance snapshots.
    Multi-tenant protection: users can only access their own enterprise's transactions.

    **Required permission:** PAYOUT_VIEW
    """
    validate_wallet_access(current_user, enterprise_id)

    service = WalletService(db)
    skip = (page - 1) * page_size

    try:
        transactions, total = await service.get_transactions(
            enterprise_id, skip=skip, limit=page_size
        )
        await db.commit()

        return paginated_response(
            data=[_transaction_to_dict(t) for t in transactions],
            page=page,
            page_size=page_size,
            total=total,
        )
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(status_code=500, detail="An unexpected error occurred. Please try again.")
