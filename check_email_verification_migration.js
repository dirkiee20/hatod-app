import { query, pool } from './api/config/db.js';

async function checkMigration() {
  try {
    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Connected to database\n');

    // Check if columns exist
    const checkColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('email_verification_token', 'email_verification_token_expires_at')
      ORDER BY column_name;
    `);
    
    console.log('📋 Checking email verification columns...\n');
    
    if (checkColumns.rows.length === 0) {
      console.log('❌ Email verification columns DO NOT exist!');
      console.log('\n⚠️  You need to run the migration:');
      console.log('   Run this SQL in Supabase SQL Editor:');
      console.log('\n   ALTER TABLE users');
      console.log('   ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),');
      console.log('   ADD COLUMN IF NOT EXISTS email_verification_token_expires_at TIMESTAMP WITH TIME ZONE;');
      console.log('\n   CREATE INDEX IF NOT EXISTS idx_users_email_verification_token');
      console.log('   ON users(email_verification_token)');
      console.log('   WHERE email_verification_token IS NOT NULL;');
      process.exit(1);
    } else if (checkColumns.rows.length === 1) {
      console.log('⚠️  Only one column exists:');
      checkColumns.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
      console.log('\n❌ Missing one column! Please run the migration.');
      process.exit(1);
    } else {
      console.log('✅ Email verification columns exist:');
      checkColumns.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
      
      // Check index
      const checkIndex = await pool.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'users' 
        AND indexname = 'idx_users_email_verification_token';
      `);
      
      if (checkIndex.rows.length > 0) {
        console.log('\n✅ Index exists: idx_users_email_verification_token');
      } else {
        console.log('\n⚠️  Index does not exist (optional, but recommended)');
      }
      
      console.log('\n✅ Migration is applied! Email verification should work.');
    }

  } catch (error) {
    console.error('❌ Error checking migration:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkMigration();












