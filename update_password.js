import dotenv from 'dotenv';
import { pool } from './api/config/db.js';

dotenv.config({ path: './api/.env' });

async function updatePassword() {
  try {
    const correctHash = '$2a$12$FPlk0/LJArvqnPS5f9hR5uZXJSVuoNIkzF0PF5Mhl.XIRc50KPoLm';
    const emails = [
      'admin@hatod.com',
      'customer@example.com',
      'restaurant@example.com',
      'delivery@example.com',
      'mario@pizza.com',
      'john@rider.com'
    ];
    for (const email of emails) {
      await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [correctHash, email]);
    }
    console.log('Updated demo user passwords');
  } catch (error) {
    console.error('Error updating password:', error);
  } finally {
    await pool.end();
  }
}

updatePassword();