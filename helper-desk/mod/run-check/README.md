# run-check

Suggests an effort level for the task you are about to run.

- **Above the prompt:** as you type, a card above the prompt box shows the suggested effort, with **Lower**, **Higher** and **Hide** buttons. Lower and Higher move the effort one step; the change applies to the message you then send. Hide clears the card until you send.
- **`/run-check <task>`:** prints the model tier, the effort and a short pre-run checklist.
- Task words decide the tier: architecture, design, debugging and investigation go to the larger tier (suggested effort: high); precise mechanical edits (rename, format, lint) go to the smaller tier (suggested effort: low); anything else goes to the middle tier (medium).
- The effort applies to the main conversation's requests in that turn. Subagents keep their own effort.
- It reads the words of the task only. It does not look at your code, so a vague task can get the wrong tier.
- The rules follow Anthropic's guidance on choosing a Claude model and effort level in Claude Code, read from a summary. Effort shapes how much Claude does; it does not cap tokens.
