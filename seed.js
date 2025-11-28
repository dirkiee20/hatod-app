import { readFileSync } from 'fs';
import dotenv from 'dotenv';
import { pool } from './api/config/db.js';

dotenv.config({ path: './api/.env' });

async function seedDatabase() {
  try {
    const seedSQL = readFileSync('./database/seed.sql', 'utf8');
    await pool.query(seedSQL);
    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await pool.end();
  }
}

seedDatabase();