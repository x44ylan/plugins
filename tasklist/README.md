# tasklist

One `TASKLIST.md` per project that you and Claude both edit, shown read-only right above the Claude Code prompt.

```
1. [/] Fix login redirect     doing
2. [ ] Add dark mode          todo
3. [x] Ship v1                done
```

Claude marks tasks `[/]` when it starts them and `[x]` when it finishes them, and adds new issues as `[ ]`. The list refreshes every second.

## Install

```
/plugin install tasklist --marketplace x44ylan/plugins
```

## Usage

- Shows the last 7 tasks; the bottom-right says which (`15-21/21`)
- `ctrl+x tab` focuses it (the border turns white), `↑` `↓` scroll, `Esc` goes back to the prompt
- `[-]` or `ctrl+x ctrl+a` hides and shows it
- `/tasklist:init` merges an existing `TODO.md` / `ISSUES.md` into `TASKLIST.md`

## Colours

The border is gray, and white while focused. Change them in `/plugin` → tasklist → configure, or in `~/.claude/settings.json`:

```json
"pluginConfigs": {
  "tasklist": { "options": { "borderColor": "gray", "focusColor": "cyan" } }
}
```

Any colour name (`gray`, `white`, `cyan`, `magenta`, ...) or `#rrggbb` works.
