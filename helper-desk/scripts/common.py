"""Shared state and cost helpers for helper-desk.

Stores only ids, types, statuses, timestamps and numeric counts.
Never stores prompts, tool input or output, or assistant messages.
"""
import contextlib
import fcntl
import json
import os
import pathlib
import time

PLUGIN_ROOT = pathlib.Path(__file__).resolve().parent.parent
TOKEN_FIELDS = (
    "input_tokens",
    "output_tokens",
    "cache_creation_input_tokens",
    "cache_read_input_tokens",
)
RATE_KEYS = {
    "input_tokens": "input",
    "output_tokens": "output",
    "cache_creation_input_tokens": "cache_write",
    "cache_read_input_tokens": "cache_read",
}
STATUS_LABELS = {"running": "RUN", "completed": "OK", "failed": "FAIL", "killed": "KILL"}
PRUNE_AFTER_SECONDS = 7 * 24 * 3600


def state_dir():
    override = os.environ.get("HELPER_DESK_DIR")
    if override:
        return pathlib.Path(override)
    return pathlib.Path.home() / ".cache" / "helper-desk"


def state_path(session_id):
    safe = "".join(c for c in str(session_id) if c.isalnum() or c in "-_") or "unknown"
    return state_dir() / f"{safe}.json"


def load(session_id):
    try:
        return json.loads(state_path(session_id).read_text())
    except (OSError, ValueError):
        return {"agents": {}}


def save(session_id, state):
    path = state_path(session_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(json.dumps(state))
    os.replace(tmp, path)


@contextlib.contextmanager
def locked(session_id):
    """Serializes read-modify-write of one session's state across concurrent hooks."""
    path = state_path(session_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path.with_name(path.name + ".lock"), "w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(lock, fcntl.LOCK_UN)


def latest_session():
    files = list(state_dir().glob("*.json")) if state_dir().is_dir() else []
    if not files:
        return None
    return max(files, key=lambda f: f.stat().st_mtime).stem


def prune_old_states():
    if not state_dir().is_dir():
        return
    cutoff = time.time() - PRUNE_AFTER_SECONDS
    for f in list(state_dir().glob("*.json")) + list(state_dir().glob("*.json.lock")):
        if f.stat().st_mtime < cutoff:
            f.unlink(missing_ok=True)


def new_agent(agent_type, now):
    return {
        "type": agent_type,
        "status": "running",
        "start": now,
        "finished": None,
        "tools": 0,
        "live_tokens": 0,
        "model": None,
        "tokens": 0,
        "usage": None,
        "tool_stats": None,
        "duration_ms": None,
        "cost_usd": None,
        "cost_known": None,
    }


def usage_from_transcript(path):
    """Sums token usage over a sub-agent transcript, counting each message once.

    Returns (usage, model). Only usage numbers and the model name are read; message content
    is not kept. Returns (None, None) when the transcript has no usage.
    """
    try:
        lines = pathlib.Path(path).read_text().splitlines()
    except (OSError, TypeError):
        return None, None
    by_message = {}
    model = None
    for line in lines:
        try:
            entry = json.loads(line)
        except ValueError:
            continue
        message = entry.get("message")
        if isinstance(message, dict) and isinstance(message.get("usage"), dict):
            by_message[message.get("id") or entry.get("uuid")] = message["usage"]
            model = message.get("model") or model
    if not by_message:
        return None, None
    usage = {f: sum(int(u.get(f) or 0) for u in by_message.values()) for f in TOKEN_FIELDS}
    return usage, model


def estimate_cost(model, usage):
    """Usage-based estimate. Returns (usd, rates_known_for_model)."""
    table = json.loads((PLUGIN_ROOT / "prices.json").read_text())
    known = bool(model) and model in table["models"]
    rates = table["models"][model] if known else table["default"]
    usd = sum(int(usage.get(f) or 0) * rates[RATE_KEYS[f]] for f in TOKEN_FIELDS)
    return round(usd / 1_000_000, 6), known


def estimate_running(tokens):
    """Rough estimate from live total tokens while a sub-agent still runs."""
    table = json.loads((PLUGIN_ROOT / "prices.json").read_text())
    return round(tokens * table["running_usd_per_mtok"] / 1_000_000, 6)


def summarize(agent):
    """Uniform view of one agent: state label, tokens, cost and how the cost was made."""
    if agent["status"] == "running":
        tokens = agent.get("live_tokens") or 0
        return {
            "state": "RUN",
            "tokens": tokens,
            "cost": estimate_running(tokens),
            "cost_basis": "rough estimate from live tokens",
        }
    if agent.get("cost_usd") is None:
        basis = "not yet priced"
    elif agent.get("cost_known"):
        basis = "estimate from usage x rates"
    else:
        basis = "estimate from usage x default rates"
    return {
        "state": STATUS_LABELS.get(agent["status"], agent["status"].upper()),
        "tokens": agent.get("tokens") or 0,
        "cost": agent.get("cost_usd"),
        "cost_basis": basis,
    }


def fmt_tokens(n):
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n / 1_000:.1f}k"
    return str(n)


def fmt_usd(usd):
    return "n/a" if usd is None else f"${usd:.4f}"
