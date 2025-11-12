import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db';
import Agent from '../models/Agent';

dotenv.config();

const isSystemCollection = (name: string): boolean => name.startsWith('system.');

const resetDatabase = async (): Promise<void> => {
    try {
        await connectDB();

        const collections = await mongoose.connection.db.collections();

        for (const collection of collections) {
            const { collectionName } = collection;

            if (isSystemCollection(collectionName)) {
                console.log(`Skipping system collection: ${collectionName}`);
                continue;
            }

            if (collectionName === Agent.collection.collectionName) {
                const result = await collection.deleteMany({ role: { $ne: 'SuperAdmin' } });
                console.log(`Removed ${result.deletedCount ?? 0} non-super-admin agents from ${collectionName}`);
                continue;
            }

            const result = await collection.deleteMany({});
            console.log(`Cleared ${result.deletedCount ?? 0} documents from ${collectionName}`);
        }

        interface SuperAdminSummary {
            name?: string;
            email?: string;
            isGhost?: boolean;
            isActive?: boolean;
        }

        const superAdmins = await Agent.find<SuperAdminSummary>({ role: 'SuperAdmin' })
            .select('name email isGhost isActive')
            .lean();

        if (superAdmins.length === 0) {
            console.warn('⚠️ No super admin accounts remain.');
        } else {
            console.log('\n✅ Super admin accounts preserved:');
            superAdmins.forEach((admin, index) => {
                const ghostLabel = admin.isGhost ? ' (ghost)' : '';
                const activeLabel = admin.isActive === false ? ' [inactive]' : '';
                console.log(`${index + 1}. ${admin.name ?? 'Unnamed'} <${admin.email ?? 'no-email'}>${ghostLabel}${activeLabel}`);
            });
        }

        console.log('\n🎉 Database reset complete (excluding super admins).');
    } catch (error) {
        console.error('❌ Failed to reset database:', error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
};

resetDatabase();





