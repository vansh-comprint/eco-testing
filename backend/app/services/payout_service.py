"""Service layer for Payout and Wallet business logic"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import Payout, EnterpriseWallet, CreditTransaction, PayoutStatus, TransactionType, User, UserRole
from app.repositories.payout_repository import PayoutRepository, WalletRepository, TransactionRepository
from app.schemas.payout import PayoutCreate, PayoutUpdate, WalletCredit, WalletDebit
from app.utils.security import (
    strip_dangerous_content,
    validate_ifsc,
    validate_upi,
    validate_amount,
    validate_text_length,
)


class WalletService:
    """Service for handling wallet business logic"""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.wallet_repo = WalletRepository(session)
        self.transaction_repo = TransactionRepository(session)

    async def get_or_create_wallet(self, enterprise_id: str, for_update: bool = False) -> EnterpriseWallet:
        """
        Get or create wallet for an enterprise.

        Args:
            enterprise_id: The enterprise ID
            for_update: If True, acquire row-level lock (SELECT ... FOR UPDATE)

        SECURITY: When for_update=True, acquires pessimistic lock to prevent
        race conditions in concurrent balance modifications.
        """
        if for_update:
            wallet = await self.wallet_repo.get_by_enterprise_id_for_update(enterprise_id)
        else:
            wallet = await self.wallet_repo.get_by_enterprise_id(enterprise_id)

        if not wallet:
            wallet = EnterpriseWallet(
                id=f"wallet-{uuid.uuid4()}",
                enterprise_id=enterprise_id,
                balance=Decimal("0"),
                currency="INR",
            )
            await self.wallet_repo.create(wallet)
            await self.session.flush()
            # Re-fetch with lock if needed for new wallet
            if for_update:
                wallet = await self.wallet_repo.get_by_enterprise_id_for_update(enterprise_id)
        return wallet

    async def credit(
        self, enterprise_id: str, data: WalletCredit, user: User
    ) -> Tuple[EnterpriseWallet, CreditTransaction]:
        """
        Credit amount to wallet with input validation.

        SECURITY:
        - Validates amount and sanitizes description to prevent XSS/injection.
        - Uses pessimistic locking (SELECT ... FOR UPDATE) to prevent race conditions
          where concurrent credits could result in lost updates.
        """
        # SECURITY: Validate amount
        validate_amount(float(data.amount), "credit amount")

        # SECURITY: Acquire row-level lock to prevent concurrent modification
        wallet = await self.get_or_create_wallet(enterprise_id, for_update=True)
        balance_before = wallet.balance

        wallet.balance = wallet.balance + data.amount

        # SECURITY: Sanitize description
        description = None
        if data.description:
            validate_text_length(data.description, 500, "description")
            description = strip_dangerous_content(data.description)

        transaction = CreditTransaction(
            id=f"txn-{uuid.uuid4()}",
            wallet_id=wallet.id,
            transaction_type=TransactionType.CREDIT.value,
            amount=data.amount,
            balance_before=balance_before,
            balance_after=wallet.balance,
            description=description,
            reference_id=data.reference_id,
        )
        await self.transaction_repo.create(transaction)
        await self.session.flush()
        return wallet, transaction

    async def debit(
        self, enterprise_id: str, data: WalletDebit, user: User
    ) -> Tuple[EnterpriseWallet, CreditTransaction]:
        """
        Debit amount from wallet with input validation.

        SECURITY:
        - Validates amount and sanitizes description to prevent XSS/injection.
        - Uses pessimistic locking (SELECT ... FOR UPDATE) to prevent race conditions
          where concurrent debits could overdraw the wallet or cause lost updates.
        """
        # SECURITY: Validate amount
        validate_amount(float(data.amount), "debit amount")

        # SECURITY: Acquire row-level lock to prevent concurrent modification
        # This prevents the TOCTOU race condition where balance is checked and then modified
        wallet = await self.get_or_create_wallet(enterprise_id, for_update=True)

        if wallet.balance < data.amount:
            raise ValueError("Insufficient wallet balance")

        balance_before = wallet.balance
        wallet.balance = wallet.balance - data.amount

        # SECURITY: Sanitize description
        description = None
        if data.description:
            validate_text_length(data.description, 500, "description")
            description = strip_dangerous_content(data.description)

        transaction = CreditTransaction(
            id=f"txn-{uuid.uuid4()}",
            wallet_id=wallet.id,
            transaction_type=TransactionType.DEBIT.value,
            amount=data.amount,
            balance_before=balance_before,
            balance_after=wallet.balance,
            description=description,
            reference_id=data.reference_id,
        )
        await self.transaction_repo.create(transaction)
        await self.session.flush()
        return wallet, transaction

    async def get_transactions(
        self, enterprise_id: str, skip: int = 0, limit: int = 100
    ) -> Tuple[List[CreditTransaction], int]:
        """Get transactions for an enterprise wallet"""
        wallet = await self.wallet_repo.get_by_enterprise_id(enterprise_id)
        if not wallet:
            return [], 0
        return await self.transaction_repo.list_by_wallet(wallet.id, skip=skip, limit=limit)


class PayoutService:
    """Service for handling payout business logic"""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = PayoutRepository(session)
        self.wallet_service = WalletService(session)

    async def create_payout(self, data: PayoutCreate, user: User) -> Payout:
        """
        Create a payout request with input validation.

        SECURITY: Validates and sanitizes all inputs to prevent:
        - SQL injection via bank_account_number
        - SSTI via notes field
        - Invalid IFSC/UPI formats
        """
        enterprise_id = data.enterprise_id
        if user.role in [UserRole.ORG_ADMIN.value, UserRole.IT_ADMIN.value]:
            enterprise_id = user.enterprise_id

        if not enterprise_id:
            raise ValueError("Enterprise ID is required")

        # SECURITY: Validate amount
        validate_amount(float(data.amount), "payout amount")

        # SECURITY: Validate payment method specific fields
        bank_account_number = None
        bank_ifsc_code = None
        upi_id = None

        if data.method == "bank_transfer":
            if not data.bank_account_number:
                raise ValueError("Bank account number is required for bank transfers")
            if not data.bank_ifsc_code:
                raise ValueError("Bank IFSC code is required for bank transfers")

            # Validate bank account (only digits and specific length)
            bank_account_number = data.bank_account_number.strip()
            if not bank_account_number.isdigit() or len(bank_account_number) < 9 or len(bank_account_number) > 18:
                raise ValueError("Invalid bank account number. Must be 9-18 digits")
            bank_account_number = strip_dangerous_content(bank_account_number)

            # Validate IFSC
            bank_ifsc_code = validate_ifsc(data.bank_ifsc_code)

        elif data.method == "upi":
            if not data.upi_id:
                raise ValueError("UPI ID is required for UPI payments")
            upi_id = validate_upi(data.upi_id)

        # SECURITY: Sanitize notes to prevent SSTI/XSS
        notes = None
        if data.notes:
            validate_text_length(data.notes, 1000, "notes")
            notes = strip_dangerous_content(data.notes)

        payout = Payout(
            id=f"payout-{uuid.uuid4()}",
            enterprise_id=enterprise_id,
            batch_id=data.batch_id,
            amount=data.amount,
            method=data.method,
            status=PayoutStatus.PENDING.value,
            bank_account_number=bank_account_number,
            bank_ifsc_code=bank_ifsc_code,
            upi_id=upi_id,
            notes=notes,
        )

        await self.repo.create(payout)
        await self.session.flush()
        return payout

    async def get_payout(self, payout_id: str) -> Optional[Payout]:
        """Get a payout by ID"""
        return await self.repo.get_by_id(payout_id)

    async def process_payout(
        self,
        payout_id: str,
        action: str,
        user: User,
        transaction_reference: Optional[str] = None,
        failure_reason: Optional[str] = None,
    ) -> Payout:
        """
        Process a payout (mark as completed or failed).

        Args:
            payout_id: ID of the payout to process
            action: 'complete' or 'fail'
            user: User performing the action
            transaction_reference: Required when action='complete'
            failure_reason: Required when action='fail'

        Returns:
            Updated Payout

        Raises:
            ValueError: If payout not found, not pending, or missing required fields
        """
        payout = await self.repo.get_by_id(payout_id)
        if not payout:
            raise ValueError("Payout not found")

        if payout.status != PayoutStatus.PENDING.value:
            raise ValueError("Payout is not in pending status")

        now = datetime.now(timezone.utc)

        if action == "complete":
            if not transaction_reference:
                raise ValueError("Transaction reference is required to complete a payout")
            payout.status = PayoutStatus.COMPLETED.value
            payout.transaction_reference = transaction_reference
            payout.completed_at = now
        elif action == "fail":
            if not failure_reason:
                raise ValueError("Failure reason is required to mark a payout as failed")
            payout.status = PayoutStatus.FAILED.value
            payout.failure_reason = failure_reason
            payout.failed_at = now
        else:
            raise ValueError(f"Invalid action: {action}. Must be 'complete' or 'fail'")

        await self.session.flush()
        return payout

    async def list_payouts(
        self,
        user: User,
        enterprise_id: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Payout], int]:
        """List payouts with role-based filtering"""
        if user.role in [UserRole.ORG_ADMIN.value, UserRole.IT_ADMIN.value]:
            enterprise_id = user.enterprise_id

        return await self.repo.list_with_filters(
            enterprise_id=enterprise_id,
            status=status,
            skip=skip,
            limit=limit,
        )

