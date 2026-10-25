#!/usr/bin/env python3
"""SessionStart hook: wires helper-desk into settings.json automatically.

Sets "statusLine" and "subagentStatusLine" to this plugin's scripts. An entry that belongs to
something else is left alone. An entry that points at an older install of this plugin is
re-pointed. Idempotent. If settings.json is not valid JSON, it is not touched.

Override the file with HELPER_DESK_SETTINGS (used by the tests).
"""
import json
import os
import pathlib
import re
import sys

SCRIPTS = pathlib.Path(__file__).resolve().parent
WIRING = {
    "statusLine": f"python3 {SCRIPTS / 'taskbar.py'}",
    "subagentStatusLine": f"python3 {SCRIPTS / 'subagent_rows.py'}",
}
OURS = re.compile(r"helper-desk\S*/scripts/(taskbar|subagent_rows)\.py")


def settings_path():
    override = os.environ.get("HELPER_DESK_SETTINGS")
    if override:
        return pathlib.Path(override)
    base = os.environ.get("CLAUDE_CONFIG_DIR") or pathlib.Path.home() / ".claude"
    return pathlib.Path(base) / "settings.json"


def wire(settings):
    """Sets our entries in place. Returns True if anything changed."""
    changed = False
    for key, command in WIRING.items():
        current = settings.get(key)
        current_cmd = current.get("command") if isinstance(current, dict) else None
        if current_cmd == command:
            continue
        if current_cmd is None or OURS.search(current_cmd):
            settings[key] = {"type": "command", "command": command}
            changed = True
    return changed


def main():
    path = settings_path()
    try:
        settings = json.loads(path.read_text()) if path.exists() else {}
    except ValueError:
        print(f"helper-desk: {path} is not valid JSON; status line not wired.", file=sys.stderr)
        return
    if not isinstance(settings, dict):
        return
    if wire(settings):
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_name(path.name + ".tmp")
        tmp.write_text(json.dumps(settings, indent=2) + "\n")
        os.replace(tmp, path)


if __name__ == "__main__":
    main()
