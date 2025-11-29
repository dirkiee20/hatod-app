import dotenv from 'dotenv';
import { Pool } from 'pg';
import { internal } from '../utils/httpError.js';

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
      ssl: { rejectUnauthorized: false }   // <-- REQUIRED for Supabase
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
          : process.env.PGSSL === 'true'
    };

// ----------------------------------

export const pool = new Pool(connectionConfig);

pool.on('error', (err) => {
  console.error('Unexpected PG error', err);
});

export const query = async (text, params) => {
  try {
    return await pool.query(text, params);
  } catch (error) {
    console.error('Database query failed', { 
      text, 
      params,
      error: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    });
    // In development, include the actual error message
    if (process.env.NODE_ENV !== 'production') {
      throw internal(`Database query failed: ${error.message}`);
    }
    throw internal('Database query failed');
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
