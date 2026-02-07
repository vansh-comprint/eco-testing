"""Repository for Payout and Wallet database operations"""

from typing import Optional, List, Tuple
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Payout, EnterpriseWallet, CreditTransaction
from app.repositories.base import BaseRepository


class PayoutRepository(BaseRepository[Payout]):
    """Repository for Payout CRUD operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(Payout, session)

    async def list_with_filters(
        self,
        enterprise_id: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Payout], int]:
        """List payouts with filters"""
        base_query = select(Payout)
        conditions = []

        if enterprise_id:
            conditions.append(Payout.enterprise_id == enterprise_id)
        if status:
            conditions.append(Payout.status == status)

        if conditions:
            base_query = base_query.where(and_(*conditions))

        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0

        query = base_query.order_by(Payout.created_at.desc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        return list(result.scalars().all()), total

    async def get_by_batch_id(self, batch_id: str) -> Optional[Payout]:
        """Get payout by batch ID"""
        result = await self.session.execute(
            select(Payout).where(Payout.batch_id == batch_id)
        )
        return result.scalar_one_or_none()


class WalletRepository(BaseRepository[EnterpriseWallet]):
    """Repository for EnterpriseWallet CRUD operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(EnterpriseWallet, session)

    async def get_by_enterprise_id(self, enterprise_id: str) -> Optional[EnterpriseWallet]:
        """Get wallet by enterprise ID"""
        result = await self.session.execute(
            select(EnterpriseWallet).where(EnterpriseWallet.enterprise_id == enterprise_id)
        )
        return result.scalar_one_or_none()

    async def get_by_enterprise_id_for_update(self, enterprise_id: str) -> Optional[EnterpriseWallet]:
        """
        Get wallet by enterprise ID with pessimistic row-level lock.

        SECURITY: Uses SELECT ... FOR UPDATE to prevent race conditions
        in concurrent wallet operations (credit/debit). The lock is held
        until the transaction commits or rolls back.
        """
        result = await self.session.execute(
            select(EnterpriseWallet)
            .where(EnterpriseWallet.enterprise_id == enterprise_id)
            .with_for_update()
        )
        return result.scalar_one_or_none()

    async def get_by_id_for_update(self, wallet_id: str) -> Optional[EnterpriseWallet]:
        """
        Get wallet by ID with pessimistic row-level lock.

        SECURITY: Uses SELECT ... FOR UPDATE to prevent race conditions.
        """
        result = await self.session.execute(
            select(EnterpriseWallet)
            .where(EnterpriseWallet.id == wallet_id)
            .with_for_update()
        )
        return result.scalar_one_or_none()


class TransactionRepository(BaseRepository[CreditTransaction]):
    """Repository for CreditTransaction CRUD operations"""

    def __init__(self, session: AsyncSession):
        super().__init__(CreditTransaction, session)

    async def list_by_wallet(
        self,
        wallet_id: str,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[CreditTransaction], int]:
        """List transactions for a wallet"""
        base_query = select(CreditTransaction).where(CreditTransaction.wallet_id == wallet_id)

        count_query = select(func.count()).select_from(base_query.subquery())
        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0

        query = base_query.order_by(CreditTransaction.created_at.desc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        return list(result.scalars().all()), total

