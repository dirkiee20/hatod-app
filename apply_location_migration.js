import { query, pool } from './api/config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  try {
    // Test connection first
    await pool.query('SELECT 1');
    console.log('✅ Connected to database');

    // Check if barangay column already exists
    const checkColumn = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'barangay'
      );
    `);
    
    if (checkColumn.rows[0].exists) {
      console.log('⚠️  Column barangay already exists in users table.');
    } else {
      console.log('Applying location selection migration...');
    }

    // Check if delivery_fees table exists
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'delivery_fees'
      );
    `);
    
    if (checkTable.rows[0].exists) {
      console.log('⚠️  Table delivery_fees already exists.');
    }

    const migrationPath = path.join(__dirname, 'database', 'migrations', '20250101_1000_add_location_selection.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration SQL
    console.log('Executing migration statements...');
    await query(migrationSQL);

    // Verify barangay column was added
    const verifyColumn = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'barangay'
      );
    `);
    
    // Verify delivery_fees table was created
    const verifyTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'delivery_fees'
      );
    `);
    
    if (verifyColumn.rows[0].exists && verifyTable.rows[0].exists) {
      console.log('✅ Migration applied successfully!');
      console.log('   - barangay column added to users table');
      console.log('   - delivery_fees table created');
    } else {
      console.error('❌ Migration completed but verification failed.');
      if (!verifyColumn.rows[0].exists) {
        console.error('   - barangay column not found');
      }
      if (!verifyTable.rows[0].exists) {
        console.error('   - delivery_fees table not found');
      }
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

applyMigration();
