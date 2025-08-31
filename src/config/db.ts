import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI environment variable is not defined');
        }

        await mongoose.connect(process.env.MONGO_URI, {
            // These options are no longer needed in newer versions of Mongoose
            // but kept for compatibility
        } as mongoose.ConnectOptions);

        console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

export default connectDB;

