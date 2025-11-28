/**
 * Quick script to generate a bcrypt password hash
 * 
 * Usage: node generate_password_hash.js
 * Enter your password when prompted, and it will output the hash
 */

import bcrypt from 'bcryptjs';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function generateHash() {
  const password = await question('Enter password to hash: ');
  const hash = await bcrypt.hashSync(password, 12);
  console.log('\n✅ Password hash generated:');
  console.log(hash);
  console.log('\nYou can use this hash in the SQL script.\n');
  rl.close();
}

generateHash();

