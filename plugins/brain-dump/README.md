# brain-dump

A Claude Code plugin that turns messy, unstructured, voice-transcribed input into a clear, structured prompt, shows it to you, and only executes it after you confirm.

It pulls out the goal, context, inputs, constraints, and expected output, and rewrites them under labeled sections. It does not invent details: anything the dump leaves missing or ambiguous goes under **Open questions**.

## Install

From inside Claude Code:

```
/plugin marketplace add dfperezcr/dfperezcr
/plugin install brain-dump@dfperezcr
```

Or load it from a local checkout for one session:

```
claude --plugin-dir ./plugins/brain-dump
```

## Usage

**Inline:** pass the raw text as the argument.

```
/brain-dump:brain-dump okay so um I need a script that like takes all the CSVs…
```

**Next message:** run it with no argument, then dictate or paste the dump as your next message.

```
/brain-dump:brain-dump
> Ready. Your next message will be treated as the brain dump.
```

Plugin commands are namespaced as `plugin:skill`, so the full name is `/brain-dump:brain-dump`. Typing `/brain-dump` in the `/` menu should bring it up.

Claude replies with the structured prompt in a code block and stops there. Then:

| You reply | What happens |
| --- | --- |
| `go` (or "yes", "dale", "run it") | Claude executes the structured prompt. It asks any open questions that block the work and states its assumptions for the rest. |
| Corrections or answers | Claude updates the prompt, shows it again, and waits for confirmation again. |
| `cancel` | Nothing is executed. |

The skill only runs when you call it: `disable-model-invocation: true` stops Claude from triggering it on its own.

## Customize the template

The sections live in [`skills/brain-dump/template.md`](skills/brain-dump/template.md), separate from the instructions. Each `## ` heading becomes a section, in order, and the text under it tells Claude what belongs there. You can rename, reorder, add, or remove sections without touching `SKILL.md`. Keep an **Open questions** section (or rename it in `SKILL.md` too), because the no-invention rule sends everything missing there.

Default sections: Goal, Context, Inputs, Constraints, Output format, Open questions.

## How it handles dictation

- Drops filler words and false starts.
- On self-corrections ("Friday, no, Thursday"), the later statement wins; if it's unclear which is final, both go to Open questions.
- Regroups ideas that came out of order.
- Fixes a likely transcription error only when the intended word is unambiguous; otherwise it marks it `[?]` and asks.
- Writes the section contents in the language of the dump and keeps the template's headings as written.

## Examples

Both examples come from real runs of the plugin, lightly trimmed.

### 1. A coding task (English)

**Before**

```
/brain-dump:brain-dump okay so um I need a script that like takes all the CSVs in the exports folder, no wait the exports-2025 folder, and merges them into one file, and uh drop duplicate rows I guess, it's for Maria in finance she uses Excel so, yeah and it should run on her Windows laptop
```

**After**

```markdown
## Goal
Write a script that merges all the CSV files in the `exports-2025` folder into one file and drops duplicate rows.

## Context
- The merged file is for Maria in finance, who uses Excel.
- The script has to run on her Windows laptop.

## Inputs
- The CSV files in the `exports-2025` folder.

## Constraints
- It must run on Maria's Windows laptop.
- Duplicate rows must be dropped (the user said "I guess", so this is a soft requirement).

## Output format
Not specified. The result is one merged file that Maria can open in Excel.

## Open questions
1. What should the merged file be called, and where should it be saved?
2. Should the output be a CSV or an .xlsx file?
3. What is the full path to `exports-2025`, and does it sit next to the script?
4. Is a row a duplicate only if every column matches, or only if certain columns match?
5. Do all the CSVs have the same columns and header row?
6. What is installed on Maria's laptop? Is Python available, or should this be PowerShell or a .bat file she can double-click?
7. Should the script look in subfolders of `exports-2025`?
8. Which duplicate should be kept, the first one or the last one?
```

> I read "exports folder, no wait the exports-2025 folder" as `exports-2025`. Reply **go** to run it, send answers or corrections to the open questions, or **cancel**.

### 2. A non-coding task (Spanish)

**Before**

```
/brain-dump:brain-dump bueno eh necesito un correo para los estudiantes del curso de turismo sostenible, que la gira a Monteverde se pasa, este, se pasa para el sábado 15, no, el 22, y que traigan ropa para lluvia y que el bus sale del TEC a las seis, o seis y media no me acuerdo, y que es obligatoria la gira, algo cortito y amable
```

**After**

```markdown
## Goal
Redactar un correo corto y amable para los estudiantes del curso de Turismo Sostenible, informándoles que la gira a Monteverde se traslada al sábado 22.

## Context
- Destinatarios: estudiantes del curso de turismo sostenible.
- La gira a Monteverde cambia de fecha. La fecha final es el sábado 22 (el usuario dijo primero 15 y luego se corrigió).
- El bus sale del TEC.
- La gira es obligatoria.

## Inputs
- Nueva fecha: sábado 22.
- Lugar de salida: TEC.
- Hora de salida del bus: 6:00 a. m. o 6:30 a. m. [?] (el usuario no recuerda cuál).
- Indicación para los estudiantes: traer ropa para lluvia.

## Constraints
- Tono amable.
- Extensión corta.
- Idioma: español.
- Debe dejar claro que la gira es obligatoria.

## Output format
Correo electrónico (asunto y cuerpo), en español.

## Open questions
1. ¿A qué hora sale el bus: 6:00 o 6:30? (Si no está seguro, ¿lo redacto sin hora o con un "[confirmar hora]"?)
2. ¿En qué mes es el sábado 22? Con la fecha de hoy (25 de octubre de 2026), el 22 no cae en sábado en octubre ni en noviembre. ¿Es otro mes o la fecha es distinta?
3. ¿Cuál era la fecha original de la gira, para mencionarla en el correo?
4. ¿Con qué nombre o cargo se firma el correo?
```

> Interpreté "el sábado 15, no, el 22" como que la fecha final es el 22, y dejé la hora marcada con `[?]`. Responda **go** para redactar el correo, envíeme correcciones o respuestas a las preguntas, o **cancel**.

## Limits

- The confirmation step is an instruction to Claude, not a hard technical gate. In practice Claude stops and waits, but nothing in the plugin system enforces it.
- The next-message mode relies on the conversation, not on a hook, so it only covers the message right after the command.

## Files

```
plugins/brain-dump/
├── .claude-plugin/plugin.json      # manifest
├── skills/brain-dump/
│   ├── SKILL.md                    # trigger, extraction rules, confirmation flow
│   └── template.md                 # editable section template
└── README.md
```
