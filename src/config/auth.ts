import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWTPayload, UserRole } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh_token_secret_key';

// Token expiry configurations
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '24h'; // Default: 24 hours
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '30d'; // Default: 30 days

export const generateToken = (userId: string, role: UserRole, officeId?: string): string => {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
        userId,
        role,
        ...(officeId && { officeId })
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY as any // Increased access token lifetime
    });
};

export const generateRefreshToken = (userId: string): string => {
    return jwt.sign({ userId }, REFRESH_TOKEN_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRY as any // Increased refresh token lifetime
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

// Utility functions for token expiry information
export const getTokenExpiryInfo = () => {
    return {
        accessToken: ACCESS_TOKEN_EXPIRY,
        refreshToken: REFRESH_TOKEN_EXPIRY,
        description: {
            accessToken: 'How long access tokens remain valid',
            refreshToken: 'How long refresh tokens remain valid'
        }
    };
};

// Parse token expiry time for debugging
const parseExpiry = (expiry: string): number => {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));

    switch (unit) {
        case 's': return value * 1000; // seconds
        case 'm': return value * 60 * 1000; // minutes  
        case 'h': return value * 60 * 60 * 1000; // hours
        case 'd': return value * 24 * 60 * 60 * 1000; // days
        default: return value; // assume milliseconds
    }
};

export const getTokenExpiryInMs = () => {
    return {
        accessToken: parseExpiry(ACCESS_TOKEN_EXPIRY),
        refreshToken: parseExpiry(REFRESH_TOKEN_EXPIRY)
    };
};

