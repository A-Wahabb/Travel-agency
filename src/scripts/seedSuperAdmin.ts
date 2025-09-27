import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Agent from '../models/Agent';
import { UserRole } from '../types';

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('MONGO_URI is not defined in environment variables 222');
    process.exit(1);
}

const superAdminData = {
    name: 'Super Administrator',
    email: 'superadmin@travelagency.com',
    password: 'SuperAdmin123!',
    role: 'SuperAdmin' as UserRole,
    phone: '+1234567890',
    isActive: true
};

const seedSuperAdmin = async (): Promise<void> => {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');
        
        // Check if SuperAdmin already exists
        const existingSuperAdmin = await Agent.findOne({
            email: superAdminData.email,
            role: 'SuperAdmin'
        });

        if (existingSuperAdmin) {
            console.log('SuperAdmin already exists. Skipping seeding.');
            return;
        }

        // Create SuperAdmin
        const superAdmin = new Agent(superAdminData);
        await superAdmin.save();

        console.log('✅ SuperAdmin created successfully!');
        console.log('📧 Email:', superAdminData.email);
        console.log('🔑 Password:', superAdminData.password);
        console.log('👤 Role:', superAdminData.role);
        console.log('\n⚠️  Please change the password after first login!');

    } catch (error) {
        console.error('❌ Error seeding SuperAdmin:', error);
    } finally {
        // Close connection
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

// Run the seeding
seedSuperAdmin();
