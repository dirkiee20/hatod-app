import http from 'http';
import dotenv from 'dotenv';
import app from './app.js';
import { pool } from './config/db.js';

dotenv.config();

const PORT = Number(process.env.PORT ?? 4000);

const server = http.createServer(app);

const start = async () => {
  try {
    await pool.query('SELECT 1');
    server.listen(PORT, () => {
      console.log(`HATOD API server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
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

