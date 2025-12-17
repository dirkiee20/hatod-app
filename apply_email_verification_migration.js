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

    // Check if columns already exist
    const checkColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('email_verification_token', 'email_verification_token_expires_at');
    `);
    
    if (checkColumns.rows.length === 2) {
      console.log('⚠️  Email verification columns already exist. Migration already applied.');
      process.exit(0);
    }

    console.log('📝 Applying email verification migration...');

    const migrationPath = path.join(__dirname, 'database', 'migrations', '20250108_1000_add_email_verification_token.sql');
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

    // Verify columns were created
    const verifyColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('email_verification_token', 'email_verification_token_expires_at');
    `);
    
    if (verifyColumns.rows.length === 2) {
      console.log('✅ Migration applied successfully!');
      console.log('✅ Email verification columns added to users table');
    } else {
      console.warn('⚠️  Migration completed but verification failed');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

applyMigration();













