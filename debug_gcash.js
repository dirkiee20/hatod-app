
import { query } from './api/config/db.js';
import dotenv from 'dotenv';


import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'api', '.env') });


async function checkRestaurantGcash() {
  try {
    console.log('Checking database connection...');
    const result = await query('SELECT NOW()');
    console.log('Database connected:', result.rows[0]);

    console.log('\nChecking restaurants table columns...');
    const columns = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'restaurants' 
      AND column_name LIKE 'gcash%';
    `);
    console.log('GCash columns:', columns.rows);

    console.log('\nChecking restaurants data...');
    const restaurants = await query(`
      SELECT id, name, is_open, gcash_enabled 
      FROM restaurants;
    `);
    console.table(restaurants.rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

checkRestaurantGcash();
