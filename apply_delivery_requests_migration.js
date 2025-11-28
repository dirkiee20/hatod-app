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

    // Check if table already exists
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'delivery_requests'
      );
    `);
    
    if (checkTable.rows[0].exists) {
      console.log('⚠️  Table delivery_requests already exists. Skipping migration.');
      process.exit(0);
    }

    console.log('Applying delivery_requests table migration...');

    const migrationPath = path.join(__dirname, 'database', 'migrations', '20241127_1400_add_delivery_requests.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Remove comments and split by semicolon
    const lines = migrationSQL.split('\n');
    const sqlLines = lines
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('--'));
    
    const sql = sqlLines.join('\n');
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed) {
        console.log('Executing:', trimmed.substring(0, 80) + '...');
        await query(trimmed);
      }
    }

    // Verify table was created
    const verifyTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'delivery_requests'
      );
    `);
    
    if (verifyTable.rows[0].exists) {
      console.log('✅ Migration applied successfully! Table delivery_requests created.');
    } else {
      console.error('❌ Migration completed but table was not created.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

applyMigration();

