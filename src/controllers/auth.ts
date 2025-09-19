import { Request, Response } from 'express';
import { generateToken, generateRefreshToken, verifyRefreshToken, comparePassword } from '../config/auth';
import Agent from '../models/Agent';
import { AuthenticatedRequest, LoginRequest, RefreshTokenRequest, ApiResponse } from '../types';

// @desc    Login user (SuperAdmin, Admin, or Agent)
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password }: LoginRequest = req.body;

        // Check if user exists
        const user = await Agent.findOne({ email }).select('+password');
        if (!user) {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
            return;
        }

        // Check if user is active
        if (!user.isActive) {
            res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
            return;
        }

        // Check password
        const isPasswordValid = await comparePassword(password, user.password);
        if (!isPasswordValid) {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
            return;
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate tokens
        const token = generateToken(user._id.toString(), user.role, user.officeId?.toString());
        const refreshToken = generateRefreshToken(user._id.toString());

        // Store refresh token in database
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

        user.refreshTokens = user.refreshTokens || [];
        user.refreshTokens.push({
            token: refreshToken,
            createdAt: new Date(),
            expiresAt: expiresAt
        });

        // Keep only the last 5 refresh tokens
        if (user.refreshTokens.length > 5) {
            user.refreshTokens = user.refreshTokens.slice(-5);
        }

        await user.save();

        // Populate office information if officeId exists
        await user.populate('officeId', 'name address location');

        // Remove password from response
        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            officeId: user.officeId,
            phone: user.phone,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };

        res.status(200).json({
            success: true,
            message: `${user.role} login successful`,
            data: {
                user: userResponse,
                token,
                refreshToken
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const user = await Agent.findById(req.user.id).select('-password');
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }

        // Populate office information if officeId exists
        await user.populate('officeId', 'name address location');

        res.status(200).json({
            success: true,
            message: 'Profile retrieved successfully',
            data: user
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { name, phone } = req.body;

        const user = await Agent.findById(req.user.id);
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }

        // Update fields
        if (name) user.name = name;
        if (phone) user.phone = phone;

        await user.save();

        // Populate office information if officeId exists
        await user.populate('officeId', 'name address location');

        // Remove password from response
        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            officeId: user.officeId,
            phone: user.phone,
            isActive: user.isActive,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: userResponse
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { currentPassword, newPassword } = req.body;

        const user = await Agent.findById(req.user.id).select('+password');
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }

        // Verify current password
        const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
            return;
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const { refreshToken }: RefreshTokenRequest = req.body;

        if (!refreshToken) {
            res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
            return;
        }

        // Verify refresh token
        const decoded = verifyRefreshToken(refreshToken);
        const user = await Agent.findById(decoded.userId);

        if (!user || !user.isActive) {
            res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
            return;
        }

        // Check if refresh token exists in user's refresh tokens
        const tokenExists = user.refreshTokens?.some(rt => rt.token === refreshToken);
        if (!tokenExists) {
            res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
            return;
        }

        // Check if refresh token is expired
        const tokenData = user.refreshTokens?.find(rt => rt.token === refreshToken);
        if (tokenData && new Date() > tokenData.expiresAt) {
            // Remove expired token
            user.refreshTokens = user.refreshTokens?.filter(rt => rt.token !== refreshToken);
            await user.save();

            res.status(401).json({
                success: false,
                message: 'Refresh token expired'
            });
            return;
        }

        // Generate new access token
        const newToken = generateToken(user._id.toString(), user.role, user.officeId?.toString());

        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                token: newToken
            }
        });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid refresh token'
        });
    }
};

// @desc    Logout (client-side token invalidation)
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        // Remove refresh token from database
        const { refreshToken } = req.body;
        if (refreshToken) {
            const user = await Agent.findById(req.user.id);
            if (user && user.refreshTokens) {
                user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken);
                await user.save();
            }
        }

        res.status(200).json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};


updatedAt: user.updatedAt

        };



res.status(200).json({

    success: true,

    message: 'Profile updated successfully',

    data: userResponse

});

    } catch (error) {

    console.error('Update profile error:', error);

    res.status(500).json({

        success: false,

        message: 'Server error'

    });

}

};



// @desc    Change password

// @route   PUT /api/auth/change-password

// @access  Private

export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {

    try {

        if (!req.user) {

            res.status(401).json({

                success: false,

                message: 'Authentication required'

            });

            return;

        }



        const { currentPassword, newPassword } = req.body;



        const user = await Agent.findById(req.user.id).select('+password');

        if (!user) {

            res.status(404).json({

                success: false,

                message: 'User not found'

            });

            return;

        }



        // Verify current password

        const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);

        if (!isCurrentPasswordValid) {

            res.status(400).json({

                success: false,

                message: 'Current password is incorrect'

            });

            return;

        }



        // Update password

        user.password = newPassword;

        await user.save();



        res.status(200).json({

            success: true,

            message: 'Password changed successfully'

        });

    } catch (error) {

        console.error('Change password error:', error);

        res.status(500).json({

            success: false,

            message: 'Server error'

        });

    }

};



// @desc    Refresh access token

// @route   POST /api/auth/refresh

// @access  Public

export const refreshToken = async (req: Request, res: Response): Promise<void> => {

    try {

        const { refreshToken }: RefreshTokenRequest = req.body;



        if (!refreshToken) {

            res.status(400).json({

                success: false,

                message: 'Refresh token is required'

            });

            return;

        }



        // Verify refresh token

        const decoded = verifyRefreshToken(refreshToken);

        const user = await Agent.findById(decoded.userId);



        if (!user || !user.isActive) {

            res.status(401).json({

                success: false,

                message: 'Invalid refresh token'

            });

            return;

        }



        // Check if refresh token exists in user's refresh tokens

        const tokenExists = user.refreshTokens?.some(rt => rt.token === refreshToken);

        if (!tokenExists) {

            res.status(401).json({

                success: false,

                message: 'Invalid refresh token'

            });

            return;

        }



        // Check if refresh token is expired

        const tokenData = user.refreshTokens?.find(rt => rt.token === refreshToken);

        if (tokenData && new Date() > tokenData.expiresAt) {

            // Remove expired token

            user.refreshTokens = user.refreshTokens?.filter(rt => rt.token !== refreshToken);

            await user.save();



            res.status(401).json({

                success: false,

                message: 'Refresh token expired'

            });

            return;

        }



        // Generate new access token

        const newToken = generateToken(user._id.toString(), user.role, user.officeId?.toString());



        res.status(200).json({

            success: true,

            message: 'Token refreshed successfully',

            data: {

                token: newToken

            }

        });

    } catch (error) {

        console.error('Refresh token error:', error);

        res.status(401).json({

            success: false,

            message: 'Invalid refresh token'

        });

    }

};



// @desc    Logout (client-side token invalidation)

// @route   POST /api/auth/logout

// @access  Private

export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {

    try {

        if (!req.user) {

            res.status(401).json({

                success: false,

                message: 'Authentication required'

            });

            return;

        }



        // Remove refresh token from database

        const { refreshToken } = req.body;

        if (refreshToken) {

            const user = await Agent.findById(req.user.id);

            if (user && user.refreshTokens) {

                user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken);

                await user.save();

            }

        }



        res.status(200).json({

            success: true,

            message: 'Logout successful'

        });

    } catch (error) {

        console.error('Logout error:', error);

        res.status(500).json({

            success: false,

            message: 'Server error'

        });

    }

};


