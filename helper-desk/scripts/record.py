#!/usr/bin/env python3
"""Hook handler for helper-desk: records per-sub-agent counts and status.

Wired to SessionStart, SubagentStart, SubagentStop and PostToolUse in hooks/hooks.json.
Reads the hook payload from stdin. Stores counts and ids only.
"""
import json
import sys
import time

from common import load, new_agent, prune_old_states, save, estimate_cost, TOKEN_FIELDS


def record_result(agents, result, now):
    """PostToolUse for the Agent tool: the sub-agent's final totals and status."""
    agent_id = result.get("agentId")
    if not agent_id:
        return
    agent = agents.setdefault(agent_id, new_agent(result.get("agentType", ""), now))
    agent["status"] = result.get("status", agent["status"])
    agent["model"] = result.get("resolvedModel")
    agent["tokens"] = int(result.get("totalTokens") or 0)
    agent["tools"] = int(result.get("totalToolUseCount") or agent["tools"])
    agent["duration_ms"] = result.get("totalDurationMs")
    agent["tool_stats"] = {k: v for k, v in (result.get("toolStats") or {}).items() if isinstance(v, int)}
    usage = result.get("usage") or {}
    agent["usage"] = {f: int(usage.get(f) or 0) for f in TOKEN_FIELDS}
    agent["cost_usd"], agent["cost_known"] = estimate_cost(agent["model"] or "", agent["usage"])
    if agent["status"] != "running":
        agent["finished"] = agent["finished"] or now


def main():
    event = json.load(sys.stdin)
    name = event.get("hook_event_name")
    session = event.get("session_id", "")
    now = time.time()

    if name == "SessionStart":
        prune_old_states()
        return

    state = load(session)
    agents = state["agents"]

    if name == "SubagentStart":
        agents[event["agent_id"]] = new_agent(event.get("agent_type", ""), now)
    elif name == "SubagentStop":
        agent = agents.get(event.get("agent_id"))
        if agent and agent["status"] == "running":
            agent["status"] = "completed"
            agent["finished"] = now
    elif name == "PostToolUse":
        if event.get("tool_name") == "Agent":
            record_result(agents, event.get("tool_response") or {}, now)
        elif event.get("agent_id") in agents:
            agents[event["agent_id"]]["tools"] += 1
    else:
        return

    save(session, state)


if __name__ == "__main__":
    main()
