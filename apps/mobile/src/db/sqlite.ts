import * as SQLite from 'expo-sqlite'

let _db: SQLite.SQLiteDatabase | null = null

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('zuiphok.db')
    initSchema(_db)
  }
  return _db
}

function initSchema(db: SQLite.SQLiteDatabase) {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS drafts (
      key TEXT PRIMARY KEY,
      text TEXT,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS upload_queue (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      file_uri TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      retries INTEGER NOT NULL DEFAULT 0,
      error TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS offline_submissions (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      text TEXT,
      location_lat REAL,
      location_lng REAL,
      media_uris TEXT,
      created_at INTEGER NOT NULL
    );
  `)
}
