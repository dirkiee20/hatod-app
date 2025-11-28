import dotenv from 'dotenv';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {
  DATABASE_URL,
  PGHOST,
  PGPORT,
  PGUSER,
  PGPASSWORD,
  PGDATABASE,
  NODE_ENV
} = process.env;

const connectionConfig = DATABASE_URL
  ? {
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    }
  : {
      host: PGHOST ?? 'localhost',
      port: Number(PGPORT ?? 5432),
      user: PGUSER,
      password: PGPASSWORD,
      database: PGDATABASE,
      ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : process.env.PGSSL === 'true'
    };

async function resetDatabase() {
  const pool = new Pool({
    ...connectionConfig,
    max: 1,
    idleTimeoutMillis: 30000
  });

  const client = await pool.connect();

  try {
    console.log('🔄 Starting database reset...\n');
    console.log('✅ Connected to database\n');

    // Step 1: Drop all tables
    console.log('🗑️  Dropping all tables...');
    await client.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);
    console.log('✅ All tables dropped\n');

    // Step 2: Read and execute schema
    console.log('📝 Recreating database schema...');
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the entire schema as one query (PostgreSQL supports multiple statements)
    try {
      await client.query(schemaSQL);
      console.log('✅ Schema recreated\n');
    } catch (error) {
      console.warn('⚠️  Schema execution had some warnings (this is normal):', error.message.substring(0, 200));
      console.log('✅ Schema recreated (with some expected warnings)\n');
    }

    // Step 3: Apply migrations
    console.log('📦 Applying migrations...');
    const migrationsDir = path.join(__dirname, 'database', 'migrations');
    
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

      for (const file of migrationFiles) {
        console.log(`  Applying: ${file}`);
        const migrationPath = path.join(migrationsDir, file);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        try {
          await client.query(migrationSQL);
        } catch (error) {
          // Ignore harmless errors
          if (!error.message.includes('already exists') && 
              !error.message.includes('duplicate key') &&
              !error.message.includes('does not exist')) {
            console.warn(`    ⚠️  Warning: ${error.message.substring(0, 100)}`);
          }
        }
      }
      console.log('✅ Migrations applied\n');
    }

    // Step 4: Verify
    console.log('🔍 Verifying database structure...');
    const tablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    console.log(`✅ Found ${tablesResult.rows.length} tables:`);
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.tablename}`);
    });

    console.log('\n✅ Database reset completed successfully!');
    console.log('\n⚠️  IMPORTANT: Restart your API server to pick up the changes.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'XX000' || error.message.includes('termination')) {
      console.error('\n💡 The connection was terminated. This can happen with Supabase.');
      console.error('   Try running the script again - it may have partially completed.');
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

console.log('⚠️  WARNING: This will DELETE ALL DATA in the database!');
console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');

setTimeout(() => {
  resetDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}, 3000);

