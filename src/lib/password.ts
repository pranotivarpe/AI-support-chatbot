import bcrypt from "bcryptjs";

export const DEMO_EMAIL = "demo@supportpilot.app";

export const hashPassword = (password: string) => bcrypt.hash(password, 10);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);
