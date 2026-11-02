# run-check

A strip and a card above the prompt box, plus a checklist command.

- **Status strip (always):** context fill (tokens of the window), the five-hour window's percentage and reset time, the weekly percentage, and an estimate of how long the prompt cache stays warm. The cache time is an estimate from the last main-turn end plus one hour; the engine does not report minutes.
- **Effort card (while you type):** the suggested effort for the draft, with **Lower**, **Higher** and **Hide** buttons. Lower and Higher move the effort one step for the message you then send. Hide clears the card until you send.
- **`/run-check <task>`:** prints the model tier, the effort and a short pre-run checklist.
- Task words decide the tier: architecture, design, debugging and investigation go to the larger tier (suggested effort: high); precise mechanical edits (rename, format, lint) go to the smaller tier (low); anything else goes to the middle tier (medium).
- The effort applies to the main conversation's requests in that turn. Subagents keep their own effort.
- The card reads the words of the task only. It does not look at your code, so a vague task can get the wrong tier.
- The effort rules follow Anthropic's guidance on choosing a Claude model and effort level in Claude Code, read from a summary. Effort shapes how much Claude does; it does not cap tokens.
