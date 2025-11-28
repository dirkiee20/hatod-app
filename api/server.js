import http from 'http';
import dotenv from 'dotenv';
import app from './app.js';
import { pool } from './config/db.js';

dotenv.config();

const PORT = Number(process.env.PORT ?? 4000);

const server = http.createServer(app);

const start = async () => {
  // Start server first (healthcheck needs it)
  server.listen(PORT, async () => {
    console.log(`HATOD API server listening on port ${PORT}`);
    
    // Test database connection after server starts
    try {
      await pool.query('SELECT 1');
      console.log('Database connection successful');
    } catch (error) {
      console.error('Database connection failed (server still running):', error.message);
      // Don't exit - server can still serve healthcheck and other endpoints
      // Database will be checked on actual API calls
    }
  });
  
  // Handle server errors
  server.on('error', (error) => {
    console.error('Server error:', error);
    process.exit(1);
  });
};

start();

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server terminated');
    pool.end();
  });
});

