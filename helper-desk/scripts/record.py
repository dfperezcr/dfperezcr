#!/usr/bin/env python3
"""Hook handler for helper-desk: records per-sub-agent counts and status.

Wired to SessionStart, SubagentStart, SubagentStop and PostToolUse in hooks/hooks.json.
Reads the hook payload from stdin. Stores counts and ids only.

Status sources, in the order they can arrive:
- SubagentStart: running.
- Agent tool result: final totals and status (completed, failed, killed). A background
  agent's launch result says async_launched; that means still running.
- SubagentStop: completed, unless a final status is already known. Usage is read from the
  transcript when the Agent result had no totals (background agents).
- TaskStop result: killed. SubagentStop does not fire for a stopped agent.
"""
import json
import sys
import time

from common import (
    estimate_cost,
    load,
    locked,
    new_agent,
    prune_old_states,
    save,
    TOKEN_FIELDS,
    usage_from_transcript,
)


def set_usage(agent, usage):
    agent["usage"] = {f: int(usage.get(f) or 0) for f in TOKEN_FIELDS}
    agent["tokens"] = sum(agent["usage"].values())
    agent["cost_usd"], agent["cost_known"] = estimate_cost(agent["model"] or "", agent["usage"])


def record_result(agents, result, now):
    """PostToolUse for the Agent tool: the sub-agent's launch or final result."""
    agent_id = result.get("agentId")
    if not agent_id:
        return
    agent = agents.setdefault(agent_id, new_agent(result.get("agentType", ""), now))
    agent["model"] = result.get("resolvedModel") or agent["model"]
    if result.get("status") == "async_launched":
        agent["status"] = "running"
        return
    agent["status"] = result.get("status", agent["status"])
    agent["duration_ms"] = result.get("totalDurationMs")
    agent["tools"] = int(result.get("totalToolUseCount") or agent["tools"])
    agent["tool_stats"] = {k: v for k, v in (result.get("toolStats") or {}).items() if isinstance(v, int)}
    set_usage(agent, result.get("usage") or {})
    agent["tokens"] = int(result.get("totalTokens") or agent["tokens"])
    if agent["status"] != "running":
        agent["finished"] = agent["finished"] or now


def finish(agents, agent_id, status, now):
    agent = agents.get(agent_id)
    if agent and agent["status"] == "running":
        agent["status"] = status
        agent["finished"] = now
    return agent


def main():
    event = json.load(sys.stdin)
    name = event.get("hook_event_name")
    session = event.get("session_id", "")
    now = time.time()

    if name == "SessionStart":
        prune_old_states()
        return

    with locked(session):
        apply(name, event, session, now)


def apply(name, event, session, now):
    state = load(session)
    agents = state["agents"]

    if name == "SubagentStart":
        agents[event["agent_id"]] = new_agent(event.get("agent_type", ""), now)
    elif name == "SubagentStop":
        agent = finish(agents, event.get("agent_id"), "completed", now)
        if agent and agent["usage"] is None:
            usage, model = usage_from_transcript(event.get("agent_transcript_path"))
            if usage:
                agent["model"] = model or agent["model"]
                set_usage(agent, usage)
    elif name == "PostToolUse":
        tool = event.get("tool_name")
        if tool == "Agent":
            record_result(agents, event.get("tool_response") or {}, now)
        elif tool == "TaskStop":
            finish(agents, (event.get("tool_response") or {}).get("task_id"), "killed", now)
        elif event.get("agent_id") in agents:
            agents[event["agent_id"]]["tools"] += 1
    else:
        return

    save(session, state)


if __name__ == "__main__":
    main()
