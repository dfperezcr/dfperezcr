<!--
Brain-dump output template.

Edit this file to change the sections, their order, or the guidance for each.
Rules for editing:
- Each "## " heading becomes a section of the structured prompt, in this order.
- The text under each heading tells Claude what belongs there. It is guidance,
  not output: Claude replaces it with content extracted from the dump.
- Keep "Open questions" (or an equivalent section): SKILL.md sends every
  missing or ambiguous detail there. If you rename it, update SKILL.md too.
- HTML comments like this one are ignored.
-->

## Goal
One or two sentences: what the user wants done or produced, stated as an instruction ("Write…", "Fix…", "Decide…"). If the dump contains several goals, list them and mark which one looks primary.

## Context
Background the user gave: who it is for, why it matters, what already exists, what was tried before. Only facts stated in the dump.

## Inputs
Concrete material to work from: files, paths, URLs, data, names, numbers, quotes, prior drafts. Reproduce identifiers exactly as given. Write "None given." if the dump names none.

## Constraints
Requirements and limits: deadlines, length, tone, language, tools to use or avoid, things that must not change. Write "None stated." if there are none.

## Output format
What the result should look like: type of artifact, structure, length, file name, where it goes. If the dump does not say, write "Not specified." and add a question under Open questions.

## Open questions
Numbered list. Everything needed to do the task well that the dump does not settle: missing details, contradictions, transcription errors you could not resolve, and assumptions you would otherwise have to make. Phrase each one as a question the user can answer in a few words. Write "None." only if the task is fully specified.
