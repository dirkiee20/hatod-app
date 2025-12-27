import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load .env from the api directory first (useful when running from root)
dotenv.config({ path: path.join(__dirname, '.env') });
// Fallback to standard search if not found
dotenv.config();

console.log('[STARTUP] Environment loaded');
console.log('[STARTUP] NODE_ENV:', process.env.NODE_ENV);
console.log('[STARTUP] PORT:', process.env.PORT);
console.log('[STARTUP] Current working directory:', process.cwd());

// Import after dotenv.config()
console.log('[STARTUP] Importing modules...');
import app from './app.js';
import { pool } from './config/db.js';

console.log('[STARTUP] All modules imported successfully');

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

const start = async () => {
  try {
    console.log('[STARTUP] Creating HTTP server...');
    // Start server immediately - database will be tested on first API call
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ HATOD API server listening on port ${PORT}`);
      console.log(`[STARTUP] Server bound to 0.0.0.0:${PORT}`);
      console.log(`[STARTUP] Health check available at: http://0.0.0.0:${PORT}/health`);
      console.log('[STARTUP] Server ready - database will be tested on first API call');
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

