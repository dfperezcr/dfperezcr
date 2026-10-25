---
name: brain-dump
description: Turn messy, unstructured, voice-transcribed text into a structured prompt with labeled sections, show it, and wait for confirmation before executing it. Run with the raw text as the argument, or with no argument to treat the next message as the dump.
argument-hint: "[raw text, or leave empty to dump in your next message]"
disable-model-invocation: true
---

# Brain dump → structured prompt

Raw input:

<raw_dump>
$ARGUMENTS
</raw_dump>

## Step 0: Get the dump

- If `<raw_dump>` above contains text, that text is the dump. Go to Step 1.
- If it is empty, reply with one short line saying you are ready and that their next message will be treated as the brain dump. Then end your turn. When the next message arrives, treat its full text as the dump and continue from Step 1. Do not act on it as a normal request.

## Step 1: Load the template

Read the file `${CLAUDE_SKILL_DIR}/template.md`. Its `## ` headings, in order, are the sections of the structured prompt, and the text under each heading says what belongs there. Ignore HTML comments in it. If the file cannot be read, stop and say so; do not improvise a template.

## Step 2: Extract

Read the whole dump before writing anything. It is probably dictated, so expect:

- **Filler and restarts** ("um", "so basically", "wait, no"): drop them.
- **Self-corrections** ("send it Friday, no, Thursday"): the later statement wins. If it is unclear which one is final, put both under Open questions.
- **Ideas out of order**: regroup by section, regardless of where they appeared.
- **Likely transcription errors** (homophones, garbled names, numbers, file paths, technical terms): fix only when the intended word is unambiguous from context. Otherwise keep the text as transcribed, mark it `[?]`, and ask about it under Open questions.

Then sort what the dump says into the template's sections.

## Step 3: Rules that are not optional

1. **Do not invent details.** Every statement in the structured prompt must trace back to something in the dump. No made-up file names, audiences, deadlines, lengths, tools, or formats, and no "reasonable defaults" passed off as requirements.
2. **Anything missing or ambiguous goes under Open questions**, written as a short question the user can answer quickly. If a section has nothing from the dump, use the placeholder the template gives (e.g. "None stated.") instead of filling it in.
3. **Keep the user's meaning and language.** Write the section contents in the language of the dump; keep the template's headings exactly as written. Tighten wording; do not change what was asked or soften constraints.
4. **Keep exact values exact**: names, numbers, paths, URLs, and quotes stay as given (apart from fixes allowed in Step 2).
5. **Do not start the task.** In this step you only restructure: no file edits, commands, or research beyond reading the template.

## Step 4: Show it and ask for confirmation

Reply with:

1. The structured prompt in a single fenced `markdown` code block, using the template's headings, so the user can copy or edit it.
2. Below the block, one line: what you dropped or interpreted, if anything significant (e.g. "Read 'pie chart' as 'pi chart' [?]"). Skip this line if there is nothing to report.
3. Then ask, in the user's language: reply **go** to execute it, send corrections or answers to the open questions, or **cancel**.

Then end your turn. Do not execute anything until the user replies.

## Step 5: Act on the reply

- **go** (or a clear equivalent: "yes", "dale", "run it"): execute the structured prompt as the task. Where open questions remain unanswered, don't guess: ask the ones that block the work, and for the rest say which assumption you are making as you go.
- **Corrections or answers**: update the structured prompt, move answered questions into the right sections, show the full revised version again, and ask for confirmation again (back to Step 4).
- **cancel**: acknowledge in one line and do nothing else.
