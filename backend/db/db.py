import aiosqlite, os, pathlib, asyncio

DB_PATH = pathlib.Path("data.db")

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        with open("backend/db/schema.sql") as f:
            await db.executescript(f.read())
        await db.commit()

async def get_db():
    return await aiosqlite.connect(DB_PATH, isolation_level=None)