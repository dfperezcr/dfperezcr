# run-check

Suggests a model tier and an effort level for the task you are about to run.

- **Above the prompt:** as you type, a line above the prompt box shows the suggested model tier and the task type. It clears when you submit.
- **`/run-check <task>`:** prints the full suggestion with a short pre-run checklist.
- Task words decide the tier: architecture and design, and debugging and investigation, go to the larger tier; precise mechanical edits (rename, format, lint) go to the smaller tier; anything else goes to the middle tier.
- It reads the words of the task only. It does not look at your code, so a vague task can get the wrong tier. Use it as a prompt for thinking, not a verdict.
- The rules follow Anthropic's guidance on choosing a Claude model and effort level in Claude Code. Effort shapes how much Claude does; it does not cap tokens.
