import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { TasklistTask as Task } from '../types/index.d.ts'

const FILE = 'TASKLIST.md'
const tasks = atom({ plugin: 'tasklist', key: 'tasks' } as const, null)
const top = atom({ plugin: 'tasklist', key: 'top' } as const, 0)
const folded = atom({ plugin: 'tasklist', key: 'folded' } as const, false)
const ROWS = 7 // list rows inside the frame

const RULES = `This project's one task list is ${FILE} at the repo root; the person sees it above the prompt.
It is only a numbered list, no heading: "1. [ ] todo", "2. [/] doing", "3. [x] done", optional indented notes.
Mark a task [/] when you start it and [x] when it is finished; append new tasks or issues you find as [ ]; keep the numbers sequential.
Edit only the lines you change and keep the person's wording. Never create the file unasked.`

// "1. [ ] todo", "2. [/] doing" ([~] and [-] too), "3. [x] done"
function parse(text: string): Task[] {
  const out: Task[] = []
  for (const line of text.split('\n')) {
    const m = line.match(/^(\d+)[.)]\s+(?:\[(.)\]\s+)?(.*\S)/)
    if (!m) continue
    const box = (m[2] ?? ' ').toLowerCase()
    const status = box === 'x' ? 'done' : '/~-'.includes(box) ? 'doing' : 'todo'
    out.push({ n: Number(m[1]), status, text: m[3].replace(/\*\*|__|`/g, '') })
  }
  return out
}

function fit(s: string, w: number) {
  const c = [...s]
  return c.length > w ? c.slice(0, Math.max(0, w - 1)).join('') + '…' : s + ' '.repeat(w - c.length)
}

let path = FILE
let last = ''
let body = ROWS

async function load($: EngineInterface) {
  let text = ''
  try { text = await $.fs.read(path) } catch {}
  if (text === last) return
  last = text
  await update($, tasks, () => (text ? parse(text) : null))
}

async function move($: EngineInterface, by: number) {
  const list = (await read($, tasks)) ?? []
  await update($, top, t => Math.max(0, Math.min((t ?? 0) + by, list.length - body)))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    try {
      const r = await $.process.run(['git', 'rev-parse', '--show-toplevel'])
      if (r.exitCode === 0 && r.stdout.trim()) path = `${r.stdout.trim()}/${FILE}`
    } catch {}
    await load($)
    $.clock.every(1000, () => load($))
    return next(e)
  })

  on('prompt.compose', async ($, e, next) => {
    const r = await next(e)
    return { sections: [...r.sections, { id: 'tasklist:rules', text: RULES, scope: 'session' as const }] }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, tasks)
    if (e.props.hasSurvey || !list || list.length === 0) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const w = Math.max(20, e.props.bodyColumns)
    const inner = w - 4 // "│ " + row + " │"
    body = Math.max(1, Math.min(ROWS, e.props.maxRows - 2))
    const scrolls = list.length > body
    const first = scrolls ? Math.max(0, Math.min(await read($, top), list.length - body)) : 0
    const shown = list.slice(first, first + body)
    const pad = String(Math.max(...list.map(t => t.n))).length
    const pos = scrolls ? ` ${first + 1}-${first + shown.length}/${list.length} ` : ''
    const isFolded = await read($, folded)
    const doing = list.filter(t => t.status === 'doing').length
    const done = list.filter(t => t.status === 'done').length
    const arrows = scrolls && !isFolded ? 4 : 0 // " ↑ ↓"
    const summary = isFolded ? ` ${done}/${list.length} done${doing ? ` · ${doing} doing` : ''} ` : ''

    const header = (
      <Box>
        <Text color="white">{isFolded ? '╶─' : '╭─'}</Text>
        <Button key="fold" plain dimColor label={isFolded ? '[+]' : '[-]'} onPress={() => update($, folded, f => !f)} />
        {arrows > 0 && <Text color="white"> </Text>}
        {arrows > 0 && <Button key="up" plain dimColor label="↑" onPress={() => move($, -1)} />}
        {arrows > 0 && <Text color="white"> </Text>}
        {arrows > 0 && <Button key="down" plain dimColor label="↓" onPress={() => move($, 1)} />}
        <Text dimColor>{summary || ' '}</Text>
        <Text color="white">{'─'.repeat(Math.max(0, w - 6 - arrows - Math.max(1, summary.length)))}{isFolded ? '╴' : '╮'}</Text>
      </Box>
    )
    if (isFolded) return header

    return (
      <Box flexDirection="column">
        {header}
        {shown.map(t => (
          <Text>
            <Text color="white">│ </Text>
            <Text dimColor={t.status === 'done'} color={t.status === 'doing' ? 'yellow' : undefined}>
              {fit(`${String(t.n).padStart(pad)}. ${t.status === 'done' ? '✓' : t.status === 'doing' ? '▶' : '○'} ${t.text}`, inner)}
            </Text>
            <Text color="white"> │</Text>
          </Text>
        ))}
        <Box>
          <Text color="white">╰{'─'.repeat(Math.max(0, w - 3 - pos.length))}</Text>
          <Text dimColor>{pos}</Text>
          <Text color="white">─╯</Text>
        </Box>
      </Box>
    )
  })
}
