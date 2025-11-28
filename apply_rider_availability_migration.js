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
    console.log('Starting migration: Add rider availability field...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'database', 'migrations', '20250104_1200_add_rider_availability.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    console.log('✓ Migration applied successfully!');
    
    // Verify the column was added
    const checkResult = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'rider_profiles' AND column_name = 'is_available'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✓ Verified: is_available column exists in rider_profiles table');
      console.log('  - Data type:', checkResult.rows[0].data_type);
      console.log('  - Default:', checkResult.rows[0].column_default);
    } else {
      console.log('⚠ Warning: Could not verify column creation');
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

