# helper-desk

Shows the state of active sub-agents in Claude Code: name (type), state, tokens, tool calls and estimated cost.

- **Status line taskbar:** one compact entry per sub-agent in the session.
- **Details on demand:** `/helper-desk:helper-desk` prints a block per sub-agent.
- **Live rows:** the agent panel shows a live token count per running agent.

## Install

Load it for a session (tested):

```
claude --plugin-dir /path/to/helper-desk
```

Install it permanently from a marketplace (tested with a local marketplace folder):

```
/plugin marketplace add <folder-with-.claude-plugin/marketplace.json>
/plugin install helper-desk@<marketplace-name>
```

`/plugin install <path>` does not work: Claude Code only installs plugins listed in a marketplace.
The repository does not yet ship a `marketplace.json`.

On the first session after installing, the plugin wires the status line in `settings.json` automatically (see below).

Run the details panel with `/helper-desk:helper-desk`.

## Status line wiring (automatic)

A `SessionStart` hook (`scripts/install_statusline.py`) sets `statusLine` and `subagentStatusLine`
in `~/.claude/settings.json` (or `$CLAUDE_CONFIG_DIR/settings.json`) to this plugin's scripts.

- If either key is unset, or points at an older install of this plugin, it is set or re-pointed.
- If either key belongs to something else, it is left alone. The taskbar then does not show;
  point the key at `python3 <plugin>/scripts/taskbar.py` yourself to switch.
- Invalid JSON in `settings.json` is never touched.

Plugins cannot ship these keys themselves, which is why the hook writes them.

## Data

- Hooks write one JSON file per session to `~/.cache/helper-desk/` (override with `HELPER_DESK_DIR`).
  Files older than 7 days are removed at session start.
- Stored: agent id, type, status, timestamps, tool-call count, model, token counts, tool stats, cost estimate.
- Never stored: prompts, tool input or output, assistant messages, descriptions.

## Metrics: real vs estimated

| Metric | Status | Source |
| --- | --- | --- |
| Name (type), id | Real | `SubagentStart`, Agent tool result |
| State: RUN / OK / FAIL / KILL | Real | Agent tool result `status` (`completed`, `failed`, `killed`) |
| Tool calls | Real | `PostToolUse` with `agent_id`; final `totalToolUseCount` |
| Tokens, final | Real | Agent tool result `totalTokens` and `usage` |
| Tokens, live while running | Real (aggregate) | `subagentStatusLine` `tokenCount`; only while the agent panel is open |
| Model, duration | Real | Agent tool result `resolvedModel`, `totalDurationMs` |
| Cost, finished agents | **Estimated** | `usage` x rates in `prices.json` |
| Cost, running agents | **Rough estimate** | live `tokenCount` x `running_usd_per_mtok` |
| Step progress (x / y) | **Not available** | No step total is exposed; shown as RUN |

Cost rates in `prices.json` come from the official pricing page (fetched 2026-10-25). They exclude
1-hour cache writes, the batch discount, the data-residency multiplier and cloud-platform premiums,
so cost is an estimate. Models without an entry use `default` (Sonnet 5.5 rates) and are labelled as such.

## Tests

```
python3 -m unittest discover -s tests -v
```
