import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './api/.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL
});

async function applyMigration() {
  try {
    await client.connect();
    console.log('Connected to database');

    const migrationPath = path.join(__dirname, 'database', 'migrations', '20250127_1000_add_payment_intents.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration: 20250127_1000_add_payment_intents.sql');
    await client.query(sql);
    
    console.log('✓ Migration applied successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
