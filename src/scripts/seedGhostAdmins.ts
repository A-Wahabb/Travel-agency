import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Agent from '../models/Agent';
import connectDB from '../config/db';

// Load environment variables
dotenv.config();

const ghostAdmins = [
    {
        name: 'Danial SuperAdmin',
        email: 'Danial_superadmin@agency.com',
        password: 'admin127127',
        role: 'SuperAdmin' as const,
        isActive: true,
        isGhost: true
    },
    {
        name: 'Travel SuperAdmin',
        email: 'Travel_superadmin@agency.com',
        password: 'admin111333',
        role: 'SuperAdmin' as const,
        isActive: true,
        isGhost: true
    }
];

const seedGhostAdmins = async () => {
    try {
        // Connect to database
        await connectDB();
        console.log('Connected to MongoDB');

        for (const adminData of ghostAdmins) {
            // Check if ghost admin already exists
            const existingAdmin = await Agent.findOne({ email: adminData.email });

            if (existingAdmin) {
                console.log(`Ghost admin already exists: ${adminData.email}`);

                // Update to ensure it's marked as ghost
                existingAdmin.isGhost = true;
                existingAdmin.isActive = true;
                await existingAdmin.save();
                console.log(`Updated ghost status for: ${adminData.email}`);
            } else {
                // Create new ghost admin
                const admin = await Agent.create(adminData);
                console.log(`Ghost super admin created successfully: ${admin.email}`);
            }
        }

        console.log('\n✅ Ghost super admins setup completed!');
        console.log('\nGhost Admin Accounts:');
        console.log('1. Email: Danial_superadmin@agency.com | Password: admin127127');
        console.log('2. Email: Travel_superadmin@agency.com | Password: admin111333');
        console.log('\nThese accounts can login but will not appear in agent listings.');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding ghost admins:', error);
        process.exit(1);
    }
};

seedGhostAdmins();

