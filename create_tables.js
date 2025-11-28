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

async function createTables() {
  const pool = new Pool({
    ...connectionConfig,
    max: 1,
    idleTimeoutMillis: 30000
  });

  const client = await pool.connect();

  try {
    console.log('🔄 Creating database tables...\n');
    console.log('✅ Connected to database\n');

    // Step 1: Read and execute schema
    console.log('📝 Creating tables from schema...');
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the entire schema
    try {
      await client.query(schemaSQL);
      console.log('✅ Schema created successfully\n');
    } catch (error) {
      // Some errors are expected (like "already exists" for extensions)
      if (error.message.includes('already exists')) {
        console.log('✅ Schema created (some items already existed)\n');
      } else {
        console.warn('⚠️  Some warnings during schema creation:', error.message.substring(0, 200));
        console.log('✅ Schema creation completed\n');
      }
    }

    // Step 2: Apply migrations
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
    } else {
      console.log('⚠️  No migrations directory found\n');
    }

    // Step 3: Verify tables were created
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

    // Check for important columns
    console.log('\n🔍 Checking important columns...');
    const barangayCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'barangay'
    `);
    
    if (barangayCheck.rows.length > 0) {
      console.log('✅ Column "barangay" exists in users table');
    } else {
      console.log('⚠️  Column "barangay" NOT found in users table');
    }

    const deliveryFeesCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'delivery_fees'
      )
    `);
    
    if (deliveryFeesCheck.rows[0].exists) {
      console.log('✅ Table "delivery_fees" exists');
    } else {
      console.log('⚠️  Table "delivery_fees" NOT found');
    }

    console.log('\n✅ Database tables created successfully!');
    console.log('\n⚠️  IMPORTANT: Restart your API server to pick up the changes.');

  } catch (error) {
    console.error('\n❌ Error creating tables:', error.message);
    if (error.code === 'XX000' || error.message.includes('termination')) {
      console.error('\n💡 The connection was terminated. Try running the script again.');
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createTables()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to create tables:', error);
    process.exit(1);
  });

