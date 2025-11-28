import dotenv from 'dotenv';
import { pool } from './api/config/db.js';

dotenv.config({ path: './api/.env' });

async function queryUsers() {
  try {
    const result = await pool.query('SELECT email, user_type, is_active FROM users');
    console.log('Users in database:');
    result.rows.forEach(row => console.log(row));

    // Check admin user
    const adminResult = await pool.query('SELECT * FROM users WHERE email = $1', ['admin@hatod.com']);
    console.log('Admin user details:', adminResult.rows[0]);
  } catch (error) {
    console.error('Error querying users:', error);
  } finally {
    await pool.end();
  }
}

queryUsers();