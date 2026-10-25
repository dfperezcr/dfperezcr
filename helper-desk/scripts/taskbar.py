#!/usr/bin/env python3
"""Status line for helper-desk: one compact entry per sub-agent in the session.

Set as "statusLine" in settings.json (see README). Prints nothing when no sub-agents exist.
"""
import json
import sys

from common import fmt_tokens, fmt_usd, latest_session, load, summarize

MAX_ENTRIES = 4


def main():
    try:
        event = json.load(sys.stdin)
    except ValueError:
        event = {}
    session = event.get("session_id") or latest_session()
    if not session:
        return
    agents = list(load(session)["agents"].items())
    if not agents:
        return

    # Running agents first, then the rest in start order.
    agents.sort(key=lambda kv: (kv[1]["status"] != "running", kv[1]["start"]))
    entries = []
    for _, agent in agents[:MAX_ENTRIES]:
        view = summarize(agent)
        entries.append(
            f"{agent['type'] or 'agent'} {view['state']} {fmt_tokens(view['tokens'])} tok ~{fmt_usd(view['cost'])}"
        )
    if len(agents) > MAX_ENTRIES:
        entries.append(f"+{len(agents) - MAX_ENTRIES} more")
    print("helper-desk | " + " | ".join(entries))


if __name__ == "__main__":
    main()
