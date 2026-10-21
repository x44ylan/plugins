---
description: Merge this project's TODO.md / ISSUES.md into one TASKLIST.md
---
Create `TASKLIST.md` at the repo root (git root, else the current directory) as this project's single task list.

1. Find existing lists: TODO.md, ISSUE.md, ISSUES.md, docs/tasks.md and similar (case-insensitive, depth ≤ 2). If `TASKLIST.md` already exists, merge into it instead of replacing it.
2. Turn every open item and open issue into one short imperative line. Done work is `[x]`, work clearly in progress is `[/]`, everything else `[ ]`. Put detail worth keeping on indented lines under the item. No duplicates.
3. The file is only a numbered list, no heading:
   ```
   1. [/] doing item
   2. [ ] todo item
      detail line
   3. [x] done item
   ```
4. Do not delete the source files. Show me the result and ask whether to remove the old files.

$ARGUMENTS
