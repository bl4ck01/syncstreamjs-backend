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

// Hash PIN (4-digit)
export const hashPin = async (pin) => {
  return await bcrypt.hash(pin, SALT_ROUNDS);
};

// Verify PIN
export const verifyPin = async (pin, hash) => {
  return await bcrypt.compare(pin, hash);
};