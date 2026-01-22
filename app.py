#!/usr/bin/env python3
# app.py - Flask API for Google Trends analysis

from flask import Flask, request, jsonify, send_file, abort
from datetime import datetime
import os
from pathlib import Path
import json
import logging

from google_trends_analyzer import analyze_keyword_report

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
REPORTS_DIR = BASE_DIR / "reports"
DATA_DIR = BASE_DIR / "data"
HISTORY_FILE = DATA_DIR / "history.json"

for d in (REPORTS_DIR, DATA_DIR):
    d.mkdir(exist_ok=True)

logging.basicConfig(level=logging.INFO)


def append_history(entry):
    history = []
    if HISTORY_FILE.exists():
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                history = json.load(f)
        except Exception:
            history = []
    history.insert(0, entry)
    # keep recent 200 entries
    history = history[:200]
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)


@app.route("/analyze", methods=["POST"])
def analyze():
    """Accepts JSON: {"keyword": "chatgpt", "top_n": 10, "geo": "", "show": false}
    Returns JSON summary and paths to generated files.
    """
    data = request.get_json(force=True)
    if not data or "keyword" not in data:
        return jsonify({"error": "Missing 'keyword' in request body"}), 400

    keyword = data["keyword"].strip()
    top_n = int(data.get("top_n", 10))
    geo = data.get("geo", "")

    try:
        summary = analyze_keyword_report(keyword, top_n=top_n, geo=geo, out_dir=REPORTS_DIR)
    except Exception as e:
        logging.exception("Analysis failed")
        return jsonify({"error": str(e)}), 500

    entry = {
        "keyword": keyword,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "summary": summary,
    }
    append_history(entry)

    return jsonify(summary)


@app.route("/history", methods=["GET"])
def history():
    if not HISTORY_FILE.exists():
        return jsonify([])
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            history = json.load(f)
    except Exception:
        history = []
    return jsonify(history)


@app.route("/report/<keyword>", methods=["GET"])
def report(keyword):
    # Try to find most recent report files for keyword
    keyword = keyword.strip()
    files = sorted(REPORTS_DIR.glob(f"{keyword}*"), key=os.path.getmtime, reverse=True)
    if not files:
        # generate on-demand
        try:
            summary = analyze_keyword_report(keyword, out_dir=REPORTS_DIR)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        return jsonify(summary)

    # return list of files and summary if JSON exists
    file_list = [str(p.name) for p in files]
    # try to load summary JSON
    summary_file = REPORTS_DIR / f"{keyword}_summary.json"
    summary = None
    if summary_file.exists():
        try:
            with open(summary_file, "r", encoding="utf-8") as f:
                summary = json.load(f)
        except Exception:
            summary = None

    return jsonify({"files": file_list, "summary": summary})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)