import { create } from 'zustand'
import { getDb } from '../db/sqlite'
import { uploadMedia } from '../services/upload'

const MAX_RETRIES = 3

export interface QueueItem {
  id: string
  submission_id: string
  file_uri: string
  mime_type: string
  status: 'pending' | 'uploading' | 'done' | 'failed'
  retries: number
  error: string | null
}

interface UploadQueueState {
  items: QueueItem[]
  isProcessing: boolean
  enqueue: (submissionId: string, fileUri: string, mimeType: string) => void
  load: () => void
  process: () => Promise<void>
  retryFailed: () => void
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export const useUploadQueue = create<UploadQueueState>((set, get) => ({
  items: [],
  isProcessing: false,

  load: () => {
    const db = getDb()
    const items = db.getAllSync<QueueItem>(
      "SELECT * FROM upload_queue WHERE status != 'done' ORDER BY created_at ASC"
    )
    set({ items })
  },

  enqueue: (submissionId, fileUri, mimeType) => {
    const db = getDb()
    const id = uid()
    db.runSync(
      'INSERT INTO upload_queue (id, submission_id, file_uri, mime_type, status, retries, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, submissionId, fileUri, mimeType, 'pending', 0, Date.now()]
    )
    get().load()
  },

  retryFailed: () => {
    const db = getDb()
    db.runSync(
      "UPDATE upload_queue SET status = 'pending', retries = 0, error = NULL WHERE status = 'failed'"
    )
    get().load()
  },

  process: async () => {
    if (get().isProcessing) return
    set({ isProcessing: true })

    const db = getDb()

    try {
      const pending = db.getAllSync<QueueItem>(
        `SELECT * FROM upload_queue WHERE status = 'pending' AND retries < ${MAX_RETRIES} ORDER BY created_at ASC`
      )

      for (const item of pending) {
        db.runSync("UPDATE upload_queue SET status = 'uploading' WHERE id = ?", [item.id])
        get().load()

        try {
          await uploadMedia(item.submission_id, item.file_uri, item.mime_type)
          db.runSync("UPDATE upload_queue SET status = 'done' WHERE id = ?", [item.id])
        } catch (err) {
          const newRetries = item.retries + 1
          const newStatus = newRetries >= MAX_RETRIES ? 'failed' : 'pending'
          db.runSync(
            'UPDATE upload_queue SET status = ?, retries = ?, error = ? WHERE id = ?',
            [newStatus, newRetries, String(err), item.id]
          )
        }
        get().load()
      }
    } finally {
      set({ isProcessing: false })
    }
  },
}))
