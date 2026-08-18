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
 * Seed runner.
 * Executes all .sql files in the seeds/ directory in alphabetical order.
 * Uses ON CONFLICT DO NOTHING so seeds are idempotent.
 */
async function seed() {
  const client = await pool.connect();

  try {
    const seedsDir = path.join(__dirname, 'seeds');
    const files = fs.readdirSync(seedsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('📭 No seed files found.');
      return;
    }

    for (const file of files) {
      const sql = fs.readFileSync(path.join(seedsDir, file), 'utf-8');
      console.log(`🌱 Seeding: ${file}`);
      await client.query(sql);
      console.log(`✅ Seeded: ${file}`);
    }

    console.log('\n🎉 All seed data applied successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
