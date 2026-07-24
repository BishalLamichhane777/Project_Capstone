"""Migration: add is_active column to the users table.

Safe to run multiple times — checks whether the column already exists
before attempting the ALTER TABLE, so it won't error on a fresh DB that
already has the column from db.create_all().

Usage (inside the running container):
    docker exec attendance_backend python migrate_add_is_active.py
"""

import sqlite3
import os
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(__file__), "database", "attendance.db")


def column_exists(conn: sqlite3.Connection, table: str, column: str) -> bool:
    cursor = conn.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())


def run():
    if not os.path.exists(DB_PATH):
        logger.error("Database not found at %s — is the path correct?", DB_PATH)
        raise SystemExit(1)

    conn = sqlite3.connect(DB_PATH)
    try:
        if column_exists(conn, "users", "is_active"):
            logger.info("Column 'is_active' already exists on 'users' — nothing to do.")
            return

        logger.info("Adding 'is_active' column to 'users' table …")
        # SQLite ALTER TABLE only supports ADD COLUMN.
        # DEFAULT 1 ensures every existing row gets is_active = 1 (True)
        # without requiring an UPDATE pass.
        conn.execute(
            "ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1"
        )
        conn.commit()
        logger.info("Migration complete — all existing rows set to is_active = 1.")

        # Sanity check: confirm the count
        count = conn.execute(
            "SELECT COUNT(*) FROM users WHERE is_active = 1"
        ).fetchone()[0]
        total = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        logger.info("Verification: %d / %d users marked active.", count, total)

    finally:
        conn.close()


if __name__ == "__main__":
    run()
