# helper-desk

Shows the state of active sub-agents in Claude Code: name (type), state, tokens, tool calls and estimated cost.

- **Status line taskbar:** one compact entry per sub-agent in the session.
- **Details on demand:** `/helper-desk:helper-desk` prints a block per sub-agent.
- **Live rows:** the agent panel shows a live token count per running agent.

## Install

```
/plugin install /path/to/helper-desk
```

or load it for one session: `claude --plugin-dir /path/to/helper-desk`.

## Enable the status line (required)

Plugins cannot set `statusLine` or `subagentStatusLine`, so add this to `~/.claude/settings.json`
(or `.claude/settings.json`), using the absolute path to this plugin:

```json
{
  "statusLine": { "type": "command", "command": "python3 /ABS/PATH/helper-desk/scripts/taskbar.py" },
  "subagentStatusLine": { "type": "command", "command": "python3 /ABS/PATH/helper-desk/scripts/subagent_rows.py" }
}
```

Note: `statusLine` replaces any status line you already have.

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

Cost rates in `prices.json` are assumptions. Set them to your billing rates.
Models without an entry use `default` and are labelled as such.

## Tests

```
python3 -m unittest discover -s tests -v
```
