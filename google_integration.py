"""Google Calendar / Google Tasks integration.

Optional: the rest of the app works fully without any Google credentials
configured. When GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are set, this
module enables OAuth login and two-way sync:

- pull_calendar_events(date)  -> imports events for a day as todos
- pull_tasks()                -> imports open Google Tasks as todos
- push_todo_to_calendar(todo) -> creates a calendar event from a todo
- push_todo_to_tasks(todo)    -> creates a Google Task from a todo

Tokens are cached in token.json (single-user, local app). Nothing here
runs at import time that requires network access or credentials.
"""

import os
import json
from datetime import datetime, timedelta, date
from pathlib import Path

TOKEN_PATH = Path(__file__).resolve().parent / "token.json"

SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/tasks",
]

CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:5000/auth/google/callback")


class GoogleNotConfigured(Exception):
    """Raised when Google API credentials/libraries are unavailable."""


def is_configured():
    return bool(CLIENT_ID and CLIENT_SECRET)


def _client_config():
    return {
        "web": {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [REDIRECT_URI],
        }
    }


def _load_libs():
    try:
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import Flow
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build
        return Credentials, Flow, Request, build
    except ImportError as e:
        raise GoogleNotConfigured(
            "google-api-python-client / google-auth-oauthlib is not installed"
        ) from e


def build_auth_url():
    if not is_configured():
        raise GoogleNotConfigured("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set")
    _, Flow, _, _ = _load_libs()
    flow = Flow.from_client_config(_client_config(), scopes=SCOPES, redirect_uri=REDIRECT_URI)
    auth_url, state = flow.authorization_url(access_type="offline", prompt="consent")
    return auth_url, state


def exchange_code(code):
    _, Flow, _, _ = _load_libs()
    flow = Flow.from_client_config(_client_config(), scopes=SCOPES, redirect_uri=REDIRECT_URI)
    flow.fetch_token(code=code)
    creds = flow.credentials
    TOKEN_PATH.write_text(creds.to_json())


def is_authenticated():
    return TOKEN_PATH.exists()


def _credentials():
    if not TOKEN_PATH.exists():
        raise GoogleNotConfigured("Not authenticated with Google yet. Visit /auth/google to connect.")
    Credentials, _, Request, _ = _load_libs()
    creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        TOKEN_PATH.write_text(creds.to_json())
    return creds


def _calendar_service():
    _, _, _, build = _load_libs()
    return build("calendar", "v3", credentials=_credentials())


def _tasks_service():
    _, _, _, build = _load_libs()
    return build("tasks", "v1", credentials=_credentials())


def pull_calendar_events(for_date=None):
    """Fetch events on `for_date` (default: today) from the primary calendar."""
    from models import find_by_external_id, create_todo, update_todo

    for_date = for_date or date.today()
    day_start = datetime.combine(for_date, datetime.min.time()).isoformat() + "Z"
    day_end = datetime.combine(for_date + timedelta(days=1), datetime.min.time()).isoformat() + "Z"

    service = _calendar_service()
    result = service.events().list(
        calendarId="primary",
        timeMin=day_start,
        timeMax=day_end,
        singleEvents=True,
        orderBy="startTime",
    ).execute()

    imported = []
    for event in result.get("items", []):
        ext_id = event["id"]
        title = event.get("summary", "(제목 없음)")
        start = event["start"].get("dateTime") or event["start"].get("date")
        end = event.get("end", {}).get("dateTime") or event.get("end", {}).get("date")
        target_minutes = None
        if start and end and "T" in start:
            try:
                dt_start = datetime.fromisoformat(start.replace("Z", "+00:00"))
                dt_end = datetime.fromisoformat(end.replace("Z", "+00:00"))
                target_minutes = int((dt_end - dt_start).total_seconds() // 60)
            except ValueError:
                pass

        existing = find_by_external_id("google_calendar", ext_id)
        if existing:
            todo = update_todo(existing["id"], title=title, due_date=for_date.isoformat(),
                                target_minutes=target_minutes)
        else:
            todo = create_todo(
                title=title,
                due_date=for_date.isoformat(),
                target_minutes=target_minutes,
                source="google_calendar",
                external_id=ext_id,
            )
        imported.append(todo)
    return imported


def pull_tasks(tasklist="@default"):
    from models import find_by_external_id, create_todo, update_todo

    service = _tasks_service()
    result = service.tasks().list(tasklist=tasklist, showCompleted=False).execute()

    imported = []
    for task in result.get("items", []):
        ext_id = task["id"]
        title = task.get("title", "(제목 없음)")
        due = task.get("due")
        due_date = due[:10] if due else None

        existing = find_by_external_id("google_tasks", ext_id)
        if existing:
            todo = update_todo(existing["id"], title=title, due_date=due_date)
        else:
            todo = create_todo(
                title=title,
                due_date=due_date,
                source="google_tasks",
                external_id=ext_id,
            )
        imported.append(todo)
    return imported


def push_todo_to_calendar(todo):
    service = _calendar_service()
    due = todo.get("due_date") or date.today().isoformat()
    duration = timedelta(minutes=todo.get("target_minutes") or 30)
    start_dt = datetime.fromisoformat(due)
    end_dt = start_dt + duration

    event = service.events().insert(calendarId="primary", body={
        "summary": todo["title"],
        "description": todo.get("description", ""),
        "start": {"date": due} if duration.total_seconds() == 0 else {"dateTime": start_dt.isoformat()},
        "end": {"date": due} if duration.total_seconds() == 0 else {"dateTime": end_dt.isoformat()},
    }).execute()

    from models import update_todo
    return update_todo(todo["id"], source="google_calendar", external_id=event["id"])


def push_todo_to_tasks(todo, tasklist="@default"):
    service = _tasks_service()
    body = {"title": todo["title"], "notes": todo.get("description", "")}
    if todo.get("due_date"):
        body["due"] = f"{todo['due_date']}T00:00:00.000Z"

    result = service.tasks().insert(tasklist=tasklist, body=body).execute()

    from models import update_todo
    return update_todo(todo["id"], source="google_tasks", external_id=result["id"])
