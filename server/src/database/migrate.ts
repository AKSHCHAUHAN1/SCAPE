import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { config } from '../config/index.js';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
});

/**
 * Migration runner.
 * - Creates a `_migrations` tracking table if it doesn't exist
 * - Reads all .sql files from migrations/ in alphabetical order
 * - Skips already-applied migrations
 * - Runs each new migration in a transaction
 */
async function migrate() {
  const client = await pool.connect();

  try {
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         SERIAL PRIMARY KEY,
        filename   VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);

    // Get already-applied migrations
    const { rows: applied } = await client.query(
      'SELECT filename FROM _migrations ORDER BY filename',
    );
    const appliedSet = new Set(applied.map((r) => r.filename));

    // Read migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('📭 No migration files found.');
      return;
    }

    let ranCount = 0;

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`⏭️  Skipping (already applied): ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      console.log(`🔄 Applying: ${file}`);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO _migrations (filename) VALUES ($1)',
          [file],
        );
        await client.query('COMMIT');
        console.log(`✅ Applied: ${file}`);
        ranCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Failed: ${file}`);
        throw err;
      }
    }

    if (ranCount === 0) {
      console.log('✅ All migrations are up to date.');
    } else {
      console.log(`\n🎉 Applied ${ranCount} migration(s) successfully.`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
