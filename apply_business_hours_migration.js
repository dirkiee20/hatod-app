import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'hatod_db',
  user: 'postgres',
  password: 'krid'
});

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting migration: Add business hours table...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'database', 'migrations', '20250104_1300_add_business_hours.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    console.log('✓ Migration applied successfully!');
    
    // Verify the table was created
    const checkResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'business_hours'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✓ Verified: business_hours table exists');
    } else {
      console.log('⚠ Warning: Could not verify table creation');
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('✗ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration().catch(console.error);

