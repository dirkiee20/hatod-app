/**
 * Script to create an admin user in the database
 * 
 * Usage:
 * 1. Make sure your .env file has the correct DATABASE_URL
 * 2. Run: node database/create_admin_user.js
 * 
 * This will prompt you for admin details and create the user
 */

import dotenv from 'dotenv';
import { Pool } from 'pg';
import { hashPassword } from '../api/utils/password.js';
import readline from 'readline';

dotenv.config({ path: './api/.env' });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function createAdminUser() {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('supabase') 
        ? { rejectUnauthorized: false } 
        : false
    });

    console.log('\n=== Create Admin User ===\n');

    const email = await question('Enter admin email: ');
    const password = await question('Enter admin password: ');
    const fullName = await question('Enter admin full name: ');
    const phone = await question('Enter admin phone (optional, press Enter to skip): ') || null;

    if (!email || !password || !fullName) {
      console.error('Error: Email, password, and full name are required!');
      process.exit(1);
    }

    if (password.length < 6) {
      console.error('Error: Password must be at least 6 characters!');
      process.exit(1);
    }

    console.log('\nCreating admin user...');

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Check if user already exists
    const checkResult = await pool.query(
      'SELECT id, user_type FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (checkResult.rowCount > 0) {
      const existingUser = checkResult.rows[0];
      if (existingUser.user_type === 'admin') {
        console.log('\n⚠️  Admin user with this email already exists!');
        const update = await question('Do you want to update the password? (y/n): ');
        if (update.toLowerCase() === 'y') {
          await pool.query(
            `UPDATE users 
             SET password_hash = $1, 
                 full_name = $2, 
                 phone = $3,
                 user_type = 'admin',
                 is_active = true,
                 email_verified = true
             WHERE email = $4`,
            [passwordHash, fullName, phone, email.toLowerCase()]
          );
          console.log('✅ Admin user password updated successfully!');
        } else {
          console.log('Operation cancelled.');
          process.exit(0);
        }
      } else {
        console.log('\n⚠️  User with this email exists but is not an admin!');
        const convert = await question('Do you want to convert this user to admin? (y/n): ');
        if (convert.toLowerCase() === 'y') {
          await pool.query(
            `UPDATE users 
             SET password_hash = $1, 
                 full_name = $2, 
                 phone = $3,
                 user_type = 'admin',
                 is_active = true,
                 email_verified = true
             WHERE email = $4`,
            [passwordHash, fullName, phone, email.toLowerCase()]
          );
          console.log('✅ User converted to admin successfully!');
        } else {
          console.log('Operation cancelled.');
          process.exit(0);
        }
      }
    } else {
      // Create new admin user
      const result = await pool.query(
        `INSERT INTO users (
          email, 
          password_hash, 
          full_name, 
          phone, 
          user_type, 
          email_verified, 
          is_active
        )
        VALUES ($1, $2, $3, $4, 'admin', true, true)
        RETURNING id, email, full_name, user_type, created_at`,
        [email.toLowerCase(), passwordHash, fullName, phone]
      );

      const user = result.rows[0];
      console.log('\n✅ Admin user created successfully!');
      console.log('\nUser Details:');
      console.log(`  ID: ${user.id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.full_name}`);
      console.log(`  Type: ${user.user_type}`);
      console.log(`  Created: ${user.created_at}`);
    }

    await pool.end();
    rl.close();
    console.log('\n✅ Done!\n');

  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
    process.exit(1);
  }
}

createAdminUser();

