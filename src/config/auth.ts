import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWTPayload, UserRole } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh_token_secret_key';

export const generateToken = (userId: string, role: UserRole, officeId?: string): string => {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
        userId,
        role,
        ...(officeId && { officeId })
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: '15m' // Shorter access token lifetime
    });
};

export const generateRefreshToken = (userId: string): string => {
    return jwt.sign({ userId }, REFRESH_TOKEN_SECRET, {
        expiresIn: '7d' // Longer refresh token lifetime
    });
};

export const verifyToken = (token: string): JWTPayload => {
    try {
        return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
        throw new Error('Invalid token');
    }
};

export const verifyRefreshToken = (token: string): { userId: string } => {
    try {
        return jwt.verify(token, REFRESH_TOKEN_SECRET) as { userId: string };
    } catch (error) {
        throw new Error('Invalid refresh token');
    }
};

export const hashPassword = async (password: string): Promise<string> => {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
    return await bcrypt.compare(password, hashedPassword);
};

