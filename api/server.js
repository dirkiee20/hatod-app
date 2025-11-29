import http from 'http';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

console.log('[STARTUP] Environment loaded');
console.log('[STARTUP] NODE_ENV:', process.env.NODE_ENV);
console.log('[STARTUP] PORT:', process.env.PORT);

// Import after dotenv.config()
import app from './app.js';
import { pool } from './config/db.js';

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
  // Don't exit on unhandled rejection - log and continue
  // This prevents Railway from thinking the app crashed
});

// Test database connection (non-blocking)
const testDatabaseConnection = async () => {
  try {
    console.log('[STARTUP] Testing database connection...');
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('⚠️ Database connection failed (server still running):', error.message);
    console.error('⚠️ Database error details:', error);
    // Don't exit - server can still serve healthcheck and other endpoints
    // Database will be checked on actual API calls
  }
};

const start = async () => {
  try {
    console.log('[STARTUP] Creating HTTP server...');
    // Start server first (healthcheck needs it)
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ HATOD API server listening on port ${PORT}`);
      console.log(`[STARTUP] Server bound to 0.0.0.0:${PORT}`);
      console.log(`[STARTUP] Health check available at: http://0.0.0.0:${PORT}/health`);
      
      // Test database connection asynchronously (non-blocking)
      // This allows Railway to see the server is ready immediately
      testDatabaseConnection().catch((error) => {
        // Already handled in testDatabaseConnection, but catch to prevent unhandled rejection
        console.error('⚠️ Database test error:', error.message);
      });
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

