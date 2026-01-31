"""Branch repository for database operations"""

from typing import Optional, List, Tuple
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enterprise import Branch, BranchStatus


class BranchRepository:
    """Repository for Branch database operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, branch_id: str) -> Optional[Branch]:
        """Get branch by ID"""
        result = await self.db.execute(select(Branch).where(Branch.id == branch_id))
        return result.scalar_one_or_none()

    async def get_by_code(
        self, enterprise_id: str, branch_code: str
    ) -> Optional[Branch]:
        """Get branch by code within an enterprise"""
        result = await self.db.execute(
            select(Branch).where(
                Branch.enterprise_id == enterprise_id,
                Branch.branch_code == branch_code,
            )
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        enterprise_id: Optional[str] = None,
        it_admin_id: Optional[str] = None,
        status: Optional[BranchStatus] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[Branch], int]:
        """Get all branches with filters and pagination"""
        query = select(Branch)
        count_query = select(func.count(Branch.id))

        # Apply filters
        if enterprise_id:
            query = query.where(Branch.enterprise_id == enterprise_id)
            count_query = count_query.where(Branch.enterprise_id == enterprise_id)

        if it_admin_id:
            query = query.where(Branch.it_admin_id == it_admin_id)
            count_query = count_query.where(Branch.it_admin_id == it_admin_id)

        if status:
            query = query.where(Branch.status == status.value)
            count_query = count_query.where(Branch.status == status.value)

        if search:
            search_filter = or_(
                Branch.branch_name.ilike(f"%{search}%"),
                Branch.branch_code.ilike(f"%{search}%"),
                Branch.city.ilike(f"%{search}%"),
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        # Get total count
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Apply pagination and ordering
        query = query.order_by(Branch.branch_name).offset(skip).limit(limit)

        result = await self.db.execute(query)
        branches = list(result.scalars().all())

        return branches, total

    async def create(self, branch: Branch) -> Branch:
        """Create a new branch"""
        self.db.add(branch)
        await self.db.commit()
        await self.db.refresh(branch)
        return branch

    async def update(self, branch: Branch) -> Branch:
        """Update a branch"""
        await self.db.commit()
        await self.db.refresh(branch)
        return branch

    async def delete(self, branch_id: str) -> bool:
        """Delete a branch"""
        branch = await self.get_by_id(branch_id)
        if branch:
            await self.db.delete(branch)
            await self.db.commit()
            return True
        return False

    async def count_by_enterprise(self, enterprise_id: str) -> int:
        """Count branches by enterprise"""
        result = await self.db.execute(
            select(func.count(Branch.id)).where(Branch.enterprise_id == enterprise_id)
        )
        return result.scalar() or 0

