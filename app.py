#!/usr/bin/env python3
"""Daily Todo Management Service.

Features:
- Todo list with due dates
- Today's priority ordering
- Target time (목표시간) per todo
- Completion tracking
- Manual add + Google Calendar / Google Tasks sync
"""

from datetime import date, datetime
import logging

from flask import Flask, request, jsonify, redirect, render_template

import models
import google_integration as gcal

app = Flask(__name__, template_folder="templates", static_folder="static")
logging.basicConfig(level=logging.INFO)

models.init_db()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/hangul-game")
def hangul_game():
    return render_template("hangul_game.html")


# ---------------------------------------------------------------- todos CRUD

@app.route("/api/todos", methods=["GET"])
def api_list_todos():
    due_date = request.args.get("due_date")
    today_only = request.args.get("today_only") == "1"
    include_completed = request.args.get("include_completed", "1") != "0"
    return jsonify(models.list_todos(due_date=due_date, today_only=today_only,
                                      include_completed=include_completed))


@app.route("/api/todos/today", methods=["GET"])
def api_today_todos():
    return jsonify(models.list_todos(today_only=True))


@app.route("/api/todos", methods=["POST"])
def api_create_todo():
    data = request.get_json(force=True, silent=True) or {}
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "title is required"}), 400

    todo = models.create_todo(
        title=title,
        description=data.get("description", ""),
        due_date=data.get("due_date"),
        target_minutes=data.get("target_minutes"),
        today_priority=True if data.get("add_to_today") else None,
        source="manual",
    )
    return jsonify(todo), 201


@app.route("/api/todos/<int:todo_id>", methods=["GET"])
def api_get_todo(todo_id):
    todo = models.get_todo(todo_id)
    if not todo:
        return jsonify({"error": "not found"}), 404
    return jsonify(todo)


@app.route("/api/todos/<int:todo_id>", methods=["PUT", "PATCH"])
def api_update_todo(todo_id):
    if not models.get_todo(todo_id):
        return jsonify({"error": "not found"}), 404
    data = request.get_json(force=True, silent=True) or {}
    fields = {k: v for k, v in data.items()
              if k in ("title", "description", "due_date", "target_minutes")}
    todo = models.update_todo(todo_id, **fields)
    return jsonify(todo)


@app.route("/api/todos/<int:todo_id>", methods=["DELETE"])
def api_delete_todo(todo_id):
    if not models.get_todo(todo_id):
        return jsonify({"error": "not found"}), 404
    models.delete_todo(todo_id)
    return "", 204


@app.route("/api/todos/<int:todo_id>/complete", methods=["POST"])
def api_complete_todo(todo_id):
    if not models.get_todo(todo_id):
        return jsonify({"error": "not found"}), 404
    data = request.get_json(force=True, silent=True) or {}
    completed = bool(data.get("completed", True))
    return jsonify(models.set_completed(todo_id, completed))


# ---------------------------------------------------------- today's priority

@app.route("/api/todos/<int:todo_id>/today-priority", methods=["POST"])
def api_set_today_priority(todo_id):
    if not models.get_todo(todo_id):
        return jsonify({"error": "not found"}), 404
    data = request.get_json(force=True, silent=True) or {}
    priority = data.get("priority")
    return jsonify(models.set_today_priority(todo_id, priority))


@app.route("/api/today/order", methods=["PUT"])
def api_reorder_today():
    data = request.get_json(force=True, silent=True) or {}
    ordered_ids = data.get("ordered_ids")
    if not isinstance(ordered_ids, list) or not ordered_ids:
        return jsonify({"error": "ordered_ids (list) is required"}), 400
    return jsonify(models.reorder_today(ordered_ids))


# ------------------------------------------------------------------- Google

@app.route("/auth/google")
def auth_google():
    try:
        auth_url, _state = gcal.build_auth_url()
    except gcal.GoogleNotConfigured as e:
        return jsonify({"error": str(e)}), 400
    return redirect(auth_url)


@app.route("/auth/google/callback")
def auth_google_callback():
    code = request.args.get("code")
    if not code:
        return jsonify({"error": "missing authorization code"}), 400
    try:
        gcal.exchange_code(code)
    except gcal.GoogleNotConfigured as e:
        return jsonify({"error": str(e)}), 400
    return redirect("/")


@app.route("/api/google/status")
def api_google_status():
    return jsonify({
        "configured": gcal.is_configured(),
        "authenticated": gcal.is_authenticated(),
    })


@app.route("/api/sync/calendar", methods=["POST"])
def api_sync_calendar():
    data = request.get_json(force=True, silent=True) or {}
    for_date_str = data.get("date")
    for_date = date.fromisoformat(for_date_str) if for_date_str else date.today()
    try:
        imported = gcal.pull_calendar_events(for_date)
    except gcal.GoogleNotConfigured as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logging.exception("Calendar sync failed")
        return jsonify({"error": str(e)}), 502
    return jsonify({"imported": imported, "count": len(imported)})


@app.route("/api/sync/tasks", methods=["POST"])
def api_sync_tasks():
    try:
        imported = gcal.pull_tasks()
    except gcal.GoogleNotConfigured as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logging.exception("Tasks sync failed")
        return jsonify({"error": str(e)}), 502
    return jsonify({"imported": imported, "count": len(imported)})


@app.route("/api/todos/<int:todo_id>/push/calendar", methods=["POST"])
def api_push_calendar(todo_id):
    todo = models.get_todo(todo_id)
    if not todo:
        return jsonify({"error": "not found"}), 404
    try:
        updated = gcal.push_todo_to_calendar(todo)
    except gcal.GoogleNotConfigured as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logging.exception("Push to calendar failed")
        return jsonify({"error": str(e)}), 502
    return jsonify(updated)


@app.route("/api/todos/<int:todo_id>/push/tasks", methods=["POST"])
def api_push_tasks(todo_id):
    todo = models.get_todo(todo_id)
    if not todo:
        return jsonify({"error": "not found"}), 404
    try:
        updated = gcal.push_todo_to_tasks(todo)
    except gcal.GoogleNotConfigured as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logging.exception("Push to tasks failed")
        return jsonify({"error": str(e)}), 502
    return jsonify(updated)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
