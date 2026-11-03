# dfperezcr

Claude Code plugin marketplace by dfperezcr.

| Plugin | What it does |
| --- | --- |
| [brain-dump](plugins/brain-dump) | Turns messy, voice-transcribed input into a structured prompt and asks for confirmation before executing it. |
| [helper-desk](helper-desk) | Shows sub-agent state, tokens, tool calls and estimated cost in the status line and on demand. |

## Install

From inside Claude Code:

```
/plugin marketplace add dfperezcr/dfperezcr
/plugin install brain-dump@dfperezcr
/plugin install helper-desk@dfperezcr
```

## Requirements

- `helper-desk` needs `python3` and a Unix-like OS (Linux or macOS). It uses `fcntl`, so it does not work on Windows.
- `helper-desk` rewrites `statusLine` and `subagentStatusLine` in `~/.claude/settings.json` on session start (see its README).

## Tests

```
python3 -m unittest discover -s helper-desk/tests -v
```

## License

GPL-3.0. See [LICENSE](LICENSE).
