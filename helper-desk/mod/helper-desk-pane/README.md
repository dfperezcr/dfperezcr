# helper-desk-pane

A pane that lists this session's running sub-agents: name, state, tool calls and tokens, with the description of each task.

- Opens on session start. Reopen it with the `/helper-desk-pane` command.
- Tool calls and tokens are counted from the sub-agent's own `tool.call` and `turn.complete` events, so they count from when the pane loaded.
- Finished agents leave the list; the status line and `/helper-desk:helper-desk` from the helper-desk plugin keep the cost estimate.

Load it as a mod in a session (the mods folder), or with `claude --plugin-dir /path/to/helper-desk-pane`.
