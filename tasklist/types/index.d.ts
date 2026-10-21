export type TasklistTask = { n: number; status: 'todo' | 'doing' | 'done'; text: string }

declare module 'claude-code' {
  interface PluginState {
    tasklist: { tasks: TasklistTask[] | null; back: number }
  }
}
