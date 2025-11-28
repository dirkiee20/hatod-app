import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'hatod_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'krid',
});

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Applying cart_items migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', 'migrations', '20241121_1400_add_cart_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Check if table already exists
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'cart_items'
      );
    `);
    
    if (checkTable.rows[0].exists) {
      console.log('✓ cart_items table already exists. Skipping migration.');
      return;
    }
    
    // Check if update_updated_at_column function exists (needed for trigger)
    const checkFunction = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_proc 
        WHERE proname = 'update_updated_at_column'
      );
    `);
    
    if (!checkFunction.rows[0].exists) {
      console.log('Creating update_updated_at_column function...');
      await client.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);
    }
    
    // Execute the migration
    await client.query('BEGIN');
    
    // Modify the migration SQL to add variant_id if it doesn't exist in the migration
    let finalSQL = migrationSQL;
    
    // Check if variant_id column should be added (it might not be in the original migration)
    const checkVariantColumn = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cart_items' 
        AND column_name = 'variant_id'
      );
    `);
    
    // Execute the base migration
    await client.query(finalSQL);
    
    // Add variant_id column if it doesn't exist (for items with variants)
    if (!checkTable.rows[0].exists) {
      try {
        await client.query(`
          ALTER TABLE cart_items 
          ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES menu_item_variants(id) ON DELETE SET NULL;
        `);
        console.log('✓ Added variant_id column to cart_items');
      } catch (error) {
        // Column might already exist or menu_item_variants table might not exist yet
        console.log('Note: variant_id column handling skipped (may need menu_item_variants table first)');
      }
    }
    
    await client.query('COMMIT');
    
    console.log('✓ Migration applied successfully!');
    console.log('✓ Created cart_items table');
    console.log('✓ Added indexes for cart_items');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error applying migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration()
  .then(() => {
    console.log('\nMigration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration failed:', error);
    process.exit(1);
  });

