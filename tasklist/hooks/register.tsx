import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { TasklistTask as Task } from '../types/index.d.ts'

const FILE = 'TASKLIST.md'
const ROWS = 7 // list rows inside the frame
const tasks = atom({ plugin: 'tasklist', key: 'tasks' } as const, null)
const back = atom({ plugin: 'tasklist', key: 'back' } as const, 0) // rows scrolled up from the bottom
const focused = atom({ plugin: 'tasklist', key: 'focused' } as const, false)

const RULES = `This project's one task list is ${FILE} at the repo root; the person sees it above the prompt.
It is only a numbered list, no heading: "1. [ ] todo", "2. [/] doing", "3. [x] done", optional indented notes.
Mark a task [/] when you start it and [x] when it is finished; append new tasks or issues you find as [ ]; keep the numbers sequential.
Edit only the lines you change and keep the person's wording. Never create the file unasked.`

// "1. [ ] todo", "2. [/] doing" ([~] and [-] too), "3. [x] done", sorted by number.
// A task is a numbered line at the margin, or an indented one with a box;
// other indented numbered lines are a task's notes.
function parse(text: string): Task[] {
  const out: Task[] = []
  for (const line of text.split('\n')) {
    const m = line.match(/^(\s*)(\d+)[.)]\s+(?:\[(.)\]\s+)?(.*\S)/)
    if (!m) continue
    const [, indent, n, mark, rest] = m
    if (indent && mark === undefined) continue
    const box = (mark ?? ' ').toLowerCase()
    const status = box === 'x' ? 'done' : '/~-'.includes(box) ? 'doing' : 'todo'
    out.push({ n: Number(n), status, text: rest.replace(/\*\*|__|`/g, '') })
  }
  return out.sort((a, b) => a.n - b.n)
}

function fit(s: string, w: number) {
  const c = [...s]
  return c.length > w ? c.slice(0, Math.max(0, w - 1)).join('') + '…' : s + ' '.repeat(w - c.length)
}

let path = FILE
let last = ''

async function load($: EngineInterface) {
  let text = ''
  try { text = await $.fs.read(path) } catch {}
  if (text === last) return
  last = text
  const prev = (await read($, tasks))?.length ?? 0
  const next = text ? parse(text) : null
  await update($, tasks, () => next)
  if ((next?.length ?? 0) > prev) await update($, back, () => 0) // a task was added: show it
}

let body = ROWS
let idle: { cancel: () => void } | undefined

// The engine says when the list takes focus (ui.focus) but not when Esc gives
// it back; typing at the prompt, or 4s without an arrow key, counts as leaving.
async function focus($: EngineInterface, isOn: boolean) {
  idle?.cancel()
  idle = isOn ? $.clock.after(4_000, () => focus($, false)) : undefined
  await update($, focused, f => (f === isOn ? f : isOn))
}

// ↑ scrolls toward the top of the file, ↓ back toward the newest tasks
async function move($: EngineInterface, by: number) {
  const list = (await read($, tasks)) ?? []
  await update($, back, b => Math.max(0, Math.min((b ?? 0) - by, list.length - body)))
}

export const register: Register = (on, options) => {
  const dim = options.borderColor ?? 'gray'
  const lit = options.focusColor ?? 'white'

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

  // Focused (ctrl+x tab), the ring rests on the top border. ↑/↓ would move it to
  // the corner before/after it: scroll instead and keep the ring where it is.
  on('ui.focus', { component: 'AbovePrompt' }, async ($, e, next) => {
    await focus($, e.element !== undefined)
    if (e.origin.kind !== 'person' || (e.element !== 'up' && e.element !== 'down')) return next(e)
    await move($, e.element === 'up' ? -1 : 1)
    return { deny: 'scrolled' }
  })

  on('prompt.edit', async ($, e, next) => (await focus($, false), next(e)))
  on('prompt.submit', async ($, e, next) => (await focus($, false), next(e)))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, tasks)
    if (e.props.hasSurvey || !list || list.length === 0) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const edge = (await read($, focused)) ? lit : dim
    const w = Math.max(20, e.props.bodyColumns)
    const inner = w - 4 // "│ " + row + " │"
    body = Math.max(1, Math.min(ROWS, e.props.maxRows - 2))
    // the bottom of the file, where new tasks go, unless scrolled back
    const first = Math.max(0, list.length - body - Math.min(await read($, back), list.length - body))
    const shown = list.slice(first, first + body)
    const pad = String(Math.max(...list.map(t => t.n))).length
    const pos = list.length > body ? ` ${first + 1}-${first + shown.length}/${list.length} ` : ''

    return (
      <Box flexDirection="column">
        <Box>
          <Button key="up" plain onPress={() => move($, -1)}><Text color={edge}>╭</Text></Button>
          <Button key="bar" plain autoFocus onPress={() => undefined}><Text color={edge}>{'─'.repeat(w - 2)}</Text></Button>
          <Button key="down" plain onPress={() => move($, 1)}><Text color={edge}>╮</Text></Button>
        </Box>
        {shown.map(t => (
          <Text>
            <Text color={edge}>│ </Text>
            <Text dimColor={t.status === 'done'} color={t.status === 'doing' ? 'yellow' : undefined}>
              {fit(`${String(t.n).padStart(pad)}. ${t.status === 'done' ? '✓' : t.status === 'doing' ? '▶' : '○'} ${t.text}`, inner)}
            </Text>
            <Text color={edge}> │</Text>
          </Text>
        ))}
        <Box>
          <Text color={edge}>╰{'─'.repeat(Math.max(0, w - 3 - pos.length))}</Text>
          <Text dimColor>{pos}</Text>
          <Text color={edge}>─╯</Text>
        </Box>
      </Box>
    )
  })
}
