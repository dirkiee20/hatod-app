import bcrypt from 'bcryptjs';

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);

export const hashPassword = (password) => bcrypt.hash(password, SALT_ROUNDS);

export const comparePassword = async (password, hash) => {
  console.log('Comparing password:', password, 'with hash:', hash);
  const result = await bcrypt.compare(password, hash);
  console.log('Compare result:', result);
  return result;
};

