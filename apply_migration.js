import { query } from './api/config/db.js';
import fs from 'fs';

async function applyMigration() {
  try {
    console.log('Applying cart table migration...');

    const migrationSQL = fs.readFileSync('./database/migrations/20241121_1400_add_cart_table.sql', 'utf8');

    // Split by semicolon and execute each statement
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.trim().substring(0, 50) + '...');
        await query(statement);
      }
    }

    console.log('Migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

applyMigration();