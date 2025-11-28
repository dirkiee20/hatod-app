import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'hatod_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'krid'
};

async function applyMigration() {
    const client = new Client(dbConfig);
    
    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Connected successfully!');

        // Read migration file
        const migrationPath = path.join(__dirname, 'database', 'migrations', '20250103_1000_add_favorites_table.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('Applying favorites table migration...');
        await client.query(migrationSQL);
        
        console.log('✅ Migration applied successfully!');
        console.log('Favorites table created.');

    } catch (error) {
        console.error('❌ Error applying migration:', error.message);
        if (error.code === '42P07') {
            console.log('Note: Table might already exist. This is okay.');
        } else {
            process.exit(1);
        }
    } finally {
        await client.end();
        console.log('Database connection closed.');
    }
}

applyMigration();

