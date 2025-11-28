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
    console.log('Applying menu_item_variants migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', 'migrations', '20241121_1200_add_menu_item_variants.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Check if table already exists
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'menu_item_variants'
      );
    `);
    
    if (checkTable.rows[0].exists) {
      console.log('✓ menu_item_variants table already exists. Skipping migration.');
      
      // Check if has_variants column exists
      const checkColumn = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'menu_items' 
          AND column_name = 'has_variants'
        );
      `);
      
      if (!checkColumn.rows[0].exists) {
        console.log('Adding has_variants column to menu_items...');
        await client.query(`
          ALTER TABLE menu_items ADD COLUMN has_variants BOOLEAN DEFAULT false;
          UPDATE menu_items SET has_variants = false WHERE has_variants IS NULL;
        `);
        console.log('✓ has_variants column added.');
      } else {
        console.log('✓ has_variants column already exists.');
      }
      
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
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    console.log('✓ Migration applied successfully!');
    console.log('✓ Created menu_item_variants table');
    console.log('✓ Added has_variants column to menu_items');
    console.log('✓ Made price column nullable in menu_items');
    
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

