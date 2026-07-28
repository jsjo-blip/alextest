"""SQLite-backed storage for the daily todo service."""

import sqlite3
from contextlib import contextmanager
from datetime import datetime, date
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "todos.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    due_date TEXT,
    today_priority INTEGER,
    target_minutes INTEGER,
    completed INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    external_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
CREATE INDEX IF NOT EXISTS idx_todos_external_id ON todos(source, external_id);
"""


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        conn.executescript(SCHEMA)


def _now():
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


def row_to_dict(row):
    if row is None:
        return None
    d = dict(row)
    d["completed"] = bool(d["completed"])
    return d


def list_todos(due_date=None, today_only=False, include_completed=True):
    query = "SELECT * FROM todos WHERE 1=1"
    params = []
    if due_date:
        query += " AND due_date = ?"
        params.append(due_date)
    if today_only:
        query += " AND today_priority IS NOT NULL"
    if not include_completed:
        query += " AND completed = 0"
    query += " ORDER BY (today_priority IS NULL), today_priority ASC, due_date ASC, id ASC"
    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()
    return [row_to_dict(r) for r in rows]


def get_todo(todo_id):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM todos WHERE id = ?", (todo_id,)).fetchone()
    return row_to_dict(row)


def find_by_external_id(source, external_id):
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM todos WHERE source = ? AND external_id = ?",
            (source, external_id),
        ).fetchone()
    return row_to_dict(row)


def create_todo(title, description="", due_date=None, target_minutes=None,
                 today_priority=None, source="manual", external_id=None):
    now = _now()
    if today_priority is True:
        today_priority = _next_today_priority()
    with get_db() as conn:
        cur = conn.execute(
            """INSERT INTO todos
               (title, description, due_date, today_priority, target_minutes,
                completed, completed_at, source, external_id, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, 0, NULL, ?, ?, ?, ?)""",
            (title, description, due_date, today_priority, target_minutes,
             source, external_id, now, now),
        )
        todo_id = cur.lastrowid
    return get_todo(todo_id)


def _next_today_priority():
    with get_db() as conn:
        row = conn.execute(
            "SELECT MAX(today_priority) AS m FROM todos WHERE today_priority IS NOT NULL"
        ).fetchone()
    return (row["m"] or 0) + 1


def update_todo(todo_id, **fields):
    if not fields:
        return get_todo(todo_id)
    allowed = {"title", "description", "due_date", "today_priority",
               "target_minutes", "completed", "completed_at", "source", "external_id"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return get_todo(todo_id)
    updates["updated_at"] = _now()
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    with get_db() as conn:
        conn.execute(
            f"UPDATE todos SET {set_clause} WHERE id = ?",
            (*updates.values(), todo_id),
        )
    return get_todo(todo_id)


def set_completed(todo_id, completed):
    return update_todo(
        todo_id,
        completed=1 if completed else 0,
        completed_at=_now() if completed else None,
    )


def set_today_priority(todo_id, priority):
    """Set (or clear, if priority is None) a todo's position in today's plan."""
    if priority is None:
        return update_todo(todo_id, today_priority=None)
    return update_todo(todo_id, today_priority=priority)


def reorder_today(ordered_ids):
    """Assign sequential priority (1..n) to todos in the given id order."""
    with get_db() as conn:
        for idx, todo_id in enumerate(ordered_ids, start=1):
            conn.execute(
                "UPDATE todos SET today_priority = ?, updated_at = ? WHERE id = ?",
                (idx, _now(), todo_id),
            )
    return list_todos(today_only=True)


def delete_todo(todo_id):
    with get_db() as conn:
        conn.execute("DELETE FROM todos WHERE id = ?", (todo_id,))


def today_str():
    return date.today().isoformat()
