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

// Database connection config
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
  let pool;
  let client;

  try {
    console.log('🔄 Starting database reset...\n');

    // Connect to database using a single client for better control
    pool = new Pool({
      ...connectionConfig,
      max: 1, // Use only 1 connection
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });
    
    client = await pool.connect();
    await client.query('SELECT 1');
    console.log('✅ Connected to database\n');

    // Get database name
    let dbName;
    if (DATABASE_URL) {
      // Extract database name from DATABASE_URL
      const urlMatch = DATABASE_URL.match(/\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
      if (urlMatch) {
        dbName = urlMatch[5].split('?')[0]; // Remove query params
      } else {
        // Try parsing as standard PostgreSQL URL
        const url = new URL(DATABASE_URL);
        dbName = url.pathname.slice(1).split('?')[0];
      }
      console.log(`📊 Using database: ${dbName}\n`);
    } else {
      dbName = PGDATABASE;
      console.log(`📊 Using database: ${dbName}\n`);
    }

    // Step 1: Drop all tables
    console.log('🗑️  Dropping all tables...');
    try {
      const dropTablesQuery = `
        DO $$ DECLARE
          r RECORD;
        BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
            EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
          END LOOP;
        END $$;
      `;
      await client.query(dropTablesQuery);
      console.log('✅ All tables dropped\n');
    } catch (error) {
      console.warn('⚠️  Warning dropping tables:', error.message);
    }

    // Step 2: Drop all sequences (if any)
    console.log('🗑️  Dropping all sequences...');
    try {
      const dropSequencesQuery = `
        DO $$ DECLARE
          r RECORD;
        BEGIN
          FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
            EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
          END LOOP;
        END $$;
      `;
      await client.query(dropSequencesQuery);
      console.log('✅ All sequences dropped\n');
    } catch (error) {
      console.warn('⚠️  Warning dropping sequences:', error.message);
    }

    // Step 3: Recreate schema
    console.log('📝 Recreating database schema...');
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Remove comments and split by semicolon
    const statements = schemaSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      if (statement.trim() && !statement.trim().startsWith('--')) {
        try {
          await client.query(statement);
          successCount++;
        } catch (error) {
          // Ignore "already exists" errors for extensions and other harmless errors
          if (!error.message.includes('already exists') && 
              !error.message.includes('does not exist') &&
              !error.message.includes('duplicate key')) {
            console.warn(`⚠️  Warning: ${error.message.substring(0, 100)}`);
            errorCount++;
          }
        }
      }
    }
    console.log(`✅ Schema recreated (${successCount} statements executed, ${errorCount} warnings)\n`);

    // Step 4: Apply migrations
    console.log('📦 Applying migrations...');
    const migrationsDir = path.join(__dirname, 'database', 'migrations');
    
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort(); // Apply in alphabetical order

      for (const file of migrationFiles) {
        console.log(`  Applying: ${file}`);
        const migrationPath = path.join(migrationsDir, file);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        const migrationStatements = migrationSQL
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of migrationStatements) {
          if (statement.trim()) {
            try {
              await client.query(statement);
            } catch (error) {
              // Ignore "already exists" errors
              if (!error.message.includes('already exists') && 
                  !error.message.includes('duplicate key') &&
                  !error.message.includes('does not exist')) {
                console.warn(`    ⚠️  Warning: ${error.message.substring(0, 100)}`);
              }
            }
          }
        }
      }
      console.log('✅ Migrations applied\n');
    } else {
      console.log('⚠️  No migrations directory found\n');
    }

    // Step 5: Verify tables were created
    console.log('🔍 Verifying database structure...');
    try {
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
    } catch (error) {
      console.warn('⚠️  Could not verify tables:', error.message);
    }

    console.log('\n✅ Database reset completed successfully!');
    console.log('\n⚠️  IMPORTANT: Restart your API server to pick up the changes.');

  } catch (error) {
    console.error('\n❌ Error resetting database:', error.message);
    if (error.code === 'XX000' || error.message.includes('termination')) {
      console.error('\n⚠️  Database connection was terminated. This might be due to:');
      console.error('   - Supabase connection limits');
      console.error('   - Long-running transaction timeout');
      console.error('\n💡 Try running the script again, or check your Supabase dashboard.');
    }
    if (error.stack && process.env.NODE_ENV !== 'production') {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    if (pool) {
      await pool.end();
    }
    process.exit(0);
  }
}

// Confirm before proceeding
console.log('⚠️  WARNING: This will DELETE ALL DATA in the database!');
console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');

setTimeout(() => {
  resetDatabase();
}, 3000);

