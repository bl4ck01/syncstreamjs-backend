import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// Hash password
export const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

// Verify password
export const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};
