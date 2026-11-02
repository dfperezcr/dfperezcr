# run-check

Before you start a run, `/run-check <describe the task>` suggests a model tier and an effort level and gives a short pre-run checklist.

- Task words decide the tier: architecture and design go to the larger tier; debugging and investigation to the larger tier; precise mechanical edits (rename, format, lint) to the smaller tier; anything else to the middle tier.
- It reads the words of the task only. It does not look at your code, so a vague task can get the wrong tier. Use it as a prompt for thinking, not a verdict.
- The rules follow Anthropic's guidance on choosing a Claude model and effort level in Claude Code. Effort shapes how much Claude does; it does not cap tokens.
