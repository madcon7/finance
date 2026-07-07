import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), '..', 'data', 'finance.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
    runMigrations(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'другое',
      country TEXT DEFAULT 'Казахстан',
      city TEXT DEFAULT '',
      amount_kzt REAL NOT NULL DEFAULT 0,
      cash_amount REAL DEFAULT 0,
      noncash_amount REAL DEFAULT 0,
      purchase_date TEXT,
      declaration_year INTEGER,
      source_type TEXT DEFAULT 'безналичные',
      is_foreign INTEGER DEFAULT 0,
      needs_declaration INTEGER DEFAULT 0,
      is_declared INTEGER DEFAULT 0,
      status TEXT DEFAULT 'активный',
      sold_date TEXT,
      sold_amount REAL DEFAULT 0,
      profit_loss REAL DEFAULT 0,
      comment TEXT DEFAULT '',
      extra_data TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      asset_id INTEGER,
      date TEXT NOT NULL,
      year INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount_kzt REAL NOT NULL DEFAULT 0,
      cash_amount REAL DEFAULT 0,
      noncash_amount REAL DEFAULT 0,
      payment_method TEXT DEFAULT 'безналичные',
      description TEXT DEFAULT '',
      comment TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (asset_id) REFERENCES assets(id)
    );

    CREATE TABLE IF NOT EXISTS declarations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      status TEXT DEFAULT 'не сдана',
      file_path TEXT DEFAULT '',
      comment TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      related_type TEXT NOT NULL,
      related_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT DEFAULT '',
      uploaded_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS taxes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      asset_id INTEGER,
      year INTEGER NOT NULL,
      description TEXT DEFAULT '',
      buy_amount REAL DEFAULT 0,
      sell_amount REAL DEFAULT 0,
      profit REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      tax_rate REAL DEFAULT 10,
      status TEXT DEFAULT 'нужно проверить',
      comment TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (asset_id) REFERENCES assets(id)
    );
  `);
}

function runMigrations(db: Database.Database) {
  const cols = (db.prepare("PRAGMA table_info(assets)").all() as any[]).map((c: any) => c.name);
  if (!cols.includes('cash_amount')) db.exec('ALTER TABLE assets ADD COLUMN cash_amount REAL DEFAULT 0');
  if (!cols.includes('noncash_amount')) db.exec('ALTER TABLE assets ADD COLUMN noncash_amount REAL DEFAULT 0');
  if (!cols.includes('status')) db.exec("ALTER TABLE assets ADD COLUMN status TEXT DEFAULT 'активный'");
  if (!cols.includes('sold_date')) db.exec('ALTER TABLE assets ADD COLUMN sold_date TEXT');
  if (!cols.includes('sold_amount')) db.exec('ALTER TABLE assets ADD COLUMN sold_amount REAL DEFAULT 0');
  if (!cols.includes('profit_loss')) db.exec('ALTER TABLE assets ADD COLUMN profit_loss REAL DEFAULT 0');
  if (!cols.includes('extra_data')) db.exec("ALTER TABLE assets ADD COLUMN extra_data TEXT DEFAULT '{}'");

  const txCols = (db.prepare("PRAGMA table_info(transactions)").all() as any[]).map((c: any) => c.name);
  if (!txCols.includes('cash_amount')) db.exec('ALTER TABLE transactions ADD COLUMN cash_amount REAL DEFAULT 0');
  if (!txCols.includes('noncash_amount')) db.exec('ALTER TABLE transactions ADD COLUMN noncash_amount REAL DEFAULT 0');

  const declCols = (db.prepare("PRAGMA table_info(declarations)").all() as any[]).map((c: any) => c.name);
  if (!declCols.includes('deadline')) db.exec('ALTER TABLE declarations ADD COLUMN deadline TEXT');
  if (!declCols.includes('submitted_at')) db.exec('ALTER TABLE declarations ADD COLUMN submitted_at TEXT');
}
