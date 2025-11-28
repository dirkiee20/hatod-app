import dotenv from 'dotenv';
import { hashPassword, comparePassword } from './api/utils/password.js';

dotenv.config({ path: './api/.env' });

async function check() {
  const hash = await hashPassword('password123');
  console.log('Hash for password123:', hash);

  const isValid = await comparePassword('password123', hash);
  console.log('Compare result:', isValid);

  // Check with seed hash
  const seedHash = '$2a$12$FPlk0/LJArvqnPS5f9hR5uZXJSVuoNIkzF0PF5Mhl.XIRc50KPoLm';
  const isValidSeed = await comparePassword('password123', seedHash);
  console.log('Seed hash valid:', isValidSeed);
}

check();