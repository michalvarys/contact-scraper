import { verify, sign } from 'jsonwebtoken';
import { z } from 'zod';

// Schémata validace
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = loginSchema.extend({
  name: z.string().min(2),
});

// JWT utility
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production';

export const generateToken = (userId: string) => {
  return sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string) => {
  try {
    return verify(token, JWT_SECRET) as { userId: string };
  } catch (error) {
    return null;
  }
};

// TODO: Password utility
export const hashPassword = async (password: string) => {
  return '';
};

export const comparePassword = async (password: string, hashedPassword: string) => {
  return true;
};

// Typy
export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthContext {
  user: User | null;
}
