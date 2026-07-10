import Database from 'better-sqlite3';
const db = new Database('app.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    khmerName TEXT,
    campus TEXT,
    department TEXT,
    position TEXT,
    category TEXT,
    supervisorId TEXT,
    supporterId TEXT,
    evalModel TEXT,
    evalPeriod TEXT
  )
`);

try { db.exec('ALTER TABLE evaluations ADD COLUMN status TEXT DEFAULT "Draft"'); } catch(e) {}
try { db.exec('ALTER TABLE evaluations ADD COLUMN department TEXT'); } catch(e) {}
try { db.exec('ALTER TABLE evaluations ADD COLUMN evalPeriod TEXT'); } catch(e) {}
try { db.exec('ALTER TABLE evaluations ADD COLUMN supporter TEXT'); } catch(e) {}

console.log("Database updated");
