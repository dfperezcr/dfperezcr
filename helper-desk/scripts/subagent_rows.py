#!/usr/bin/env python3
"""subagentStatusLine for helper-desk: one row per sub-agent in the agent panel.

Claude Code sends the running tasks on stdin with a live tokenCount. Each output line is
a JSON object {"id", "content"}. The live token count is also saved so the taskbar can show it.
"""
import json
import sys

from common import estimate_running, fmt_tokens, fmt_usd, load, save


def main():
    event = json.load(sys.stdin)
    session = event.get("session_id", "")
    state = load(session)
    agents = state["agents"]
    changed = False

    for task in event.get("tasks", []):
        tokens = int(task.get("tokenCount") or 0)
        agent = agents.get(task["id"])
        if agent is not None and agent["status"] == "running":
            agent["live_tokens"] = tokens
            changed = True
        label = task.get("agentType") or task.get("name") or "agent"
        status = task.get("status") or "running"
        content = (
            f"{label} {status.upper()} {fmt_tokens(tokens)} tok "
            f"~{fmt_usd(estimate_running(tokens))} (est)"
        )
        print(json.dumps({"id": task["id"], "content": content}))

    if changed:
        save(session, state)


if __name__ == "__main__":
    main()
