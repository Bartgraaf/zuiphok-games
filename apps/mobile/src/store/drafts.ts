import { getDb } from '../db/sqlite'

// Key format: `${taskId}:${teamId}`
function draftKey(taskId: string, teamId: string) {
  return `${taskId}:${teamId}`
}

export function saveDraft(taskId: string, teamId: string, text: string) {
  const db = getDb()
  const key = draftKey(taskId, teamId)
  db.runSync(
    'INSERT OR REPLACE INTO drafts (key, text, updated_at) VALUES (?, ?, ?)',
    [key, text, Date.now()]
  )
}

export function loadDraft(taskId: string, teamId: string): string | null {
  const db = getDb()
  const key = draftKey(taskId, teamId)
  const row = db.getFirstSync<{ text: string | null }>('SELECT text FROM drafts WHERE key = ?', [key])
  return row?.text ?? null
}

export function clearDraft(taskId: string, teamId: string) {
  const db = getDb()
  db.runSync('DELETE FROM drafts WHERE key = ?', [draftKey(taskId, teamId)])
}
