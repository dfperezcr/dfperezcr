#!/usr/bin/env python3
"""Details panel for helper-desk: one block per sub-agent of a session.

Usage: report.py [--session ID]. Without --session it reports the most recently updated session.
"""
import argparse

from common import fmt_tokens, fmt_usd, latest_session, load, summarize


def block(agent_id, agent):
    view = summarize(agent)
    lines = [f"{agent_id[:12]}  {agent['type'] or 'agent'}  {view['state']}"]
    lines.append(f"  model: {agent['model'] or 'unknown'}   tool calls: {agent['tools']}")
    if agent["duration_ms"] is not None:
        lines.append(f"  duration: {agent['duration_ms'] / 1000:.1f}s")
    if agent["usage"]:
        u = agent["usage"]
        lines.append(
            "  tokens: input {input_tokens} | output {output_tokens} | "
            "cache write {cache_creation_input_tokens} | cache read {cache_read_input_tokens}".format(**u)
        )
    else:
        lines.append(f"  tokens: {fmt_tokens(view['tokens'])} (live total, not yet final)")
    lines.append(f"  cost: ~{fmt_usd(view['cost'])}  ({view['cost_basis']})")
    if agent.get("tool_stats"):
        lines.append("  tool stats: " + ", ".join(f"{k}={v}" for k, v in agent["tool_stats"].items() if v))
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--session")
    args = parser.parse_args()
    session = args.session or latest_session()
    if not session:
        print("helper-desk: no sub-agents recorded yet.")
        return
    agents = load(session)["agents"]
    if not agents:
        print(f"helper-desk: session {session} has no sub-agents.")
        return
    print(f"helper-desk: {len(agents)} sub-agent(s) in session {session[:8]}\n")
    print("\n\n".join(block(i, a) for i, a in agents.items()))
    print(
        "\nReal: state, tool calls, token counts, model, duration (from hook payloads)."
        "\nEstimated: cost (usage x rates in prices.json; running agents use a rough live rate)."
        "\nNot available: step progress (no step total is exposed)."
    )


if __name__ == "__main__":
    main()
