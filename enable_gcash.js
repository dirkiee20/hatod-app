
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars first
dotenv.config({ path: path.join(__dirname, 'api', '.env') });

// Then dynamically import db config so it sees the env vars
const { query } = await import('./api/config/db.js');

async function enableGcash() {
  try {
    console.log('Enabling GCash for all restaurants...');
    
    // Check current state first
    const beforeResult = await query('SELECT id, name, gcash_enabled FROM restaurants');
    console.log('Current state:', beforeResult.rows);

    const result = await query(`
      UPDATE restaurants 
      SET gcash_enabled = true 
      RETURNING id, name, gcash_enabled;
    `);
    
    console.log(`Updated ${result.rowCount} restaurants.`);
    console.table(result.rows);

  } catch (error) {
    console.error('Error enabling GCash:', error);
  } finally {
    process.exit();
  }
}

enableGcash();
