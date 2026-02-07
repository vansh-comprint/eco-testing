import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

async def check():
    engine = create_async_engine(str(settings.database_url))
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        result = await session.execute(text("SELECT email, role, name FROM users WHERE role IN ('logistics_admin', 'logistics_user')"))
        print('Logistics users in database:')
        for row in result:
            print(f'  {row[0]} - {row[1]} - {row[2]}')

asyncio.run(check())
