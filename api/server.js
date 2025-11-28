import http from 'http';
import dotenv from 'dotenv';
import app from './app.js';
import { pool } from './config/db.js';

dotenv.config();

const PORT = Number(process.env.PORT ?? 4000);
console.log(`[STARTUP] Initializing server on port ${PORT}...`);

const server = http.createServer(app);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

const start = async () => {
  try {
    // Start server first (healthcheck needs it)
    server.listen(PORT, '0.0.0.0', async () => {
      console.log(`✅ HATOD API server listening on port ${PORT}`);
      
      // Test database connection after server starts
      try {
        await pool.query('SELECT 1');
        console.log('✅ Database connection successful');
      } catch (error) {
        console.error('⚠️ Database connection failed (server still running):', error.message);
        // Don't exit - server can still serve healthcheck and other endpoints
        // Database will be checked on actual API calls
      }
    });
    
    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
};

start();

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server terminated');
    pool.end();
  });
});

