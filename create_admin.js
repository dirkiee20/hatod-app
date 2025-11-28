/**
 * Script to create an admin user in the database
 * 
 * Usage:
 * 1. Make sure your .env file in api/ directory has the correct DATABASE_URL
 * 2. Run: node create_admin.js
 * 
 * This will prompt you for admin details and create the user
 */

import dotenv from 'dotenv';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from api/.env
dotenv.config({ path: join(__dirname, 'api', '.env') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function createAdminUser() {
  let pool;
  try {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.error('❌ Error: DATABASE_URL not found in environment variables!');
      console.error('   Make sure api/.env file exists and contains DATABASE_URL');
      process.exit(1);
    }

    pool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('supabase') 
        ? { rejectUnauthorized: false } 
        : false
    });

    console.log('\n=== Create Admin User for HATOD ===\n');

    const email = await question('Enter admin email: ');
    const password = await question('Enter admin password (min 6 characters): ');
    const fullName = await question('Enter admin full name: ');
    const phone = await question('Enter admin phone (optional, press Enter to skip): ') || null;

    if (!email || !password || !fullName) {
      console.error('\n❌ Error: Email, password, and full name are required!');
      process.exit(1);
    }

    if (password.length < 6) {
      console.error('\n❌ Error: Password must be at least 6 characters!');
      process.exit(1);
    }

    console.log('\n⏳ Creating admin user...');

    // Hash the password using bcrypt
    const SALT_ROUNDS = 12;
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Check if user already exists
    const checkResult = await pool.query(
      'SELECT id, user_type, full_name FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (checkResult.rowCount > 0) {
      const existingUser = checkResult.rows[0];
      if (existingUser.user_type === 'admin') {
        console.log('\n⚠️  Admin user with this email already exists!');
        console.log(`   Current name: ${existingUser.full_name}`);
        const update = await question('Do you want to update the password and details? (y/n): ');
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
          console.log('✅ Admin user updated successfully!');
        } else {
          console.log('Operation cancelled.');
          process.exit(0);
        }
      } else {
        console.log(`\n⚠️  User with this email exists as "${existingUser.user_type}"!`);
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
        RETURNING id, email, full_name, user_type, is_active, email_verified, created_at`,
        [email.toLowerCase(), passwordHash, fullName, phone]
      );

      const user = result.rows[0];
      console.log('\n✅ Admin user created successfully!');
      console.log('\n📋 User Details:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.full_name}`);
      console.log(`   Type: ${user.user_type}`);
      console.log(`   Active: ${user.is_active ? 'Yes' : 'No'}`);
      console.log(`   Email Verified: ${user.email_verified ? 'Yes' : 'No'}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
    }

    console.log('\n✅ Done! You can now log in with this admin account.\n');

  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
    rl.close();
  }
}

createAdminUser();

