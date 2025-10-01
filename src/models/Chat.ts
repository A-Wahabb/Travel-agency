import mongoose, { Schema, Document } from 'mongoose';
import { IChat } from '../types';

export interface IChatDocument extends IChat, Document {
    isParticipant(userId: string): boolean;
    addParticipant(userId: string): void;
    removeParticipant(userId: string): void;
}

export interface IChatModel extends mongoose.Model<IChatDocument> {
    findOrCreateDirectChat(user1Id: string, user2Id: string, createdBy: string): Promise<IChatDocument>;
    getUserChats(userId: string, page?: number, limit?: number): Promise<IChatDocument[]>;
}

const chatSchema = new Schema({
    participants: [{
        type: Schema.Types.ObjectId,
        ref: 'Agent',
        required: true
    }],
    chatType: {
        type: String,
        enum: ['direct', 'group'],
        required: true,
        default: 'direct'
    },
    lastMessage: {
        type: String,
        trim: true
    },
    lastMessageAt: {
        type: Date
    },
    lastMessageBy: {
        type: Schema.Types.ObjectId,
        ref: 'Agent'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'Agent',
        required: true
    }
}, {
    timestamps: true
});

// Index for efficient querying
chatSchema.index({ participants: 1 });
chatSchema.index({ chatType: 1 });
chatSchema.index({ lastMessageAt: -1 });
chatSchema.index({ createdBy: 1 });

// Virtual for participant count
chatSchema.virtual('participantCount').get(function () {
    return (this as any).participants.length;
});

// Method to check if user is participant
chatSchema.methods.isParticipant = function (userId: string): boolean {
    return (this as any).participants.some((participant: any) =>
        participant.toString() === userId
    );
};

// Method to add participant
chatSchema.methods.addParticipant = function (userId: string): void {
    if (!this.isParticipant(userId)) {
        (this as any).participants.push(userId);
    }
};

// Method to remove participant
chatSchema.methods.removeParticipant = function (userId: string): void {
    (this as any).participants = (this as any).participants.filter((participant: any) =>
        participant.toString() !== userId
    );
};

// Static method to find or create direct chat
chatSchema.statics.findOrCreateDirectChat = async function (
    user1Id: string,
    user2Id: string,
    createdBy: string
): Promise<IChatDocument> {
    // Check if direct chat already exists
    const existingChat = await this.findOne({
        chatType: 'direct',
        participants: { $all: [user1Id, user2Id] }
    });

    if (existingChat) {
        return existingChat;
    }

    // Create new direct chat
    const newChat = new this({
        participants: [user1Id, user2Id],
        chatType: 'direct',
        createdBy
    });

    return await newChat.save() as IChatDocument;
};

// Static method to get user's chats
chatSchema.statics.getUserChats = async function (
    userId: string,
    page: number = 1,
    limit: number = 20
) {
    const skip = (page - 1) * limit;

    return await this.find({
        participants: userId,
        isActive: true
    })
        .populate('participants', 'name email role')
        .populate('lastMessageBy', 'name')
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit);
};

export default mongoose.model<IChatDocument, IChatModel>('Chat', chatSchema);
