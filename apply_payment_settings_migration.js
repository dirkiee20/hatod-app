import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'hatod_db',
  user: 'postgres',
  password: 'krid'
};

async function applyMigration() {
  const client = new Client(dbConfig);

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');

    // Read migration file
    const migrationPath = path.join(__dirname, 'database', 'migrations', '20250104_1000_add_payment_settings.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration: 20250104_1000_add_payment_settings.sql');
    await client.query(migrationSQL);

    console.log('✅ Migration applied successfully!');
    console.log('Payment settings table created.');
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    if (error.code === '42P07') {
      console.log('Note: Table might already exist. This is okay.');
    } else {
      process.exit(1);
    }
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

applyMigration();

