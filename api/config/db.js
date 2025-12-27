import dotenv from 'dotenv';
import { Pool } from 'pg';
import { internal } from '../utils/httpError.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the api directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const {
  DATABASE_URL,
  PGHOST,
  PGPORT,
  PGUSER,
  PGPASSWORD,
  PGDATABASE,
  NODE_ENV
} = process.env;

// ---- FIXED SSL CONFIGURATION ----
// When using Supabase DATABASE_URL, always enable:
// ssl: { rejectUnauthorized: false }
const connectionConfig = DATABASE_URL
  ? {
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },   // <-- REQUIRED for Supabase
      // Connection pool settings for Supabase/cloud databases
      max: 10, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection cannot be established
      // Supabase has connection limits, so we need to be careful
      // These settings help prevent "Connection terminated unexpectedly" errors
    }
  : {
      host: PGHOST ?? 'localhost',
      port: Number(PGPORT ?? 5432),
      user: PGUSER,
      password: PGPASSWORD,
      database: PGDATABASE,
      ssl:
        NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : process.env.PGSSL === 'true',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    };

// ----------------------------------

export const pool = new Pool(connectionConfig);

// Handle pool errors gracefully
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit - let the pool handle reconnection
});

// Handle connection errors
pool.on('connect', (client) => {
  console.log('New database client connected');
});

pool.on('remove', (client) => {
  console.log('Database client removed from pool');
});

pool.on('error', (err) => {
  console.error('Unexpected PG error', err);
});

export const query = async (text, params, retries = 2) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(text, params);
        return result;
      } finally {
        client.release(); // Always release the client back to the pool
      }
    } catch (error) {
      // If it's a connection error and we have retries left, try again
      if (
        (error.message.includes('Connection terminated') ||
         error.message.includes('Connection ended') ||
         error.code === '57P01' || // Admin shutdown
         error.code === '57P02' || // Crash shutdown
         error.code === '57P03') && // Cannot connect now
        attempt < retries
      ) {
        console.warn(`Database connection error (attempt ${attempt + 1}/${retries + 1}), retrying...`, error.message);
        // Wait a bit before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      
      console.error('Database query failed', { 
        text, 
        params,
        error: error.message,
        code: error.code,
        detail: error.detail,
        stack: error.stack,
        attempt: attempt + 1
      });
      
      // In development, include the actual error message
      if (process.env.NODE_ENV !== 'production') {
        throw internal(`Database query failed: ${error.message}`);
      }
      throw internal('Database query failed');
    }
  }
};

export const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction rolled back', error);
    throw error;
  } finally {
    client.release();
  }
};
