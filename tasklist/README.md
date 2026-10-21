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
- `[-]` or `ctrl+x ctrl+a` hides and shows it
- `/tasklist:init` merges an existing `TODO.md` / `ISSUES.md` into `TASKLIST.md`
