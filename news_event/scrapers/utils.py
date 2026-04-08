from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import yaml

ROOT_DIR = Path(__file__).parent.parent
DATA_DIR = ROOT_DIR / "data"
CONFIG_DIR = ROOT_DIR / "config"


def load_yaml(filename: str) -> dict:
    with open(CONFIG_DIR / filename) as f:
        return yaml.safe_load(f)


def load_json(filename: str) -> list | dict:
    path = DATA_DIR / filename
    if not path.exists():
        return []
    with open(path) as f:
        return json.load(f)


def save_json(filename: str, data: list | dict) -> None:
    DATA_DIR.mkdir(exist_ok=True)
    with open(DATA_DIR / filename, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False, default=str)


def hash_url(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()[:16]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def days_ago(days: int) -> datetime:
    return datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    ) - __import__("datetime").timedelta(days=days)


def match_company(text: str, companies: list[dict]) -> dict | None:
    """Match text against company aliases. Returns the matched company dict or None."""
    text_lower = text.lower()
    for company in companies:
        for alias in company.get("aliases", []):
            if alias.lower() in text_lower:
                return company
    return None
