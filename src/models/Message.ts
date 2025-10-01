import mongoose, { Schema, Document } from 'mongoose';
import { IMessage } from '../types';

export interface IMessageDocument extends IMessage, Document {
    markAsRead(userId: string): void;
    markAsUnread(userId: string): void;
    editMessage(newContent: string): void;
}

export interface IMessageModel extends mongoose.Model<IMessageDocument> {
    getChatMessages(chatId: string, page?: number, limit?: number): Promise<IMessageDocument[]>;
    getUnreadCount(userId: string, chatId?: string): Promise<number>;
    markMessagesAsRead(chatId: string, userId: string): Promise<any>;
}

const messageAttachmentSchema = new Schema({
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    mimetype: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    s3Key: {
        type: String
    },
    s3Url: {
        type: String
    }
}, { _id: false });

const messageSchema = new Schema({
    chatId: {
        type: Schema.Types.ObjectId,
        ref: 'Chat',
        required: true
    },
    senderId: {
        type: Schema.Types.ObjectId,
        ref: 'Agent',
        required: true
    },
    content: {
        type: String,
        required: function (this: any) {
            return this.messageType === 'text';
        },
        trim: true,
        maxlength: [2000, 'Message content cannot exceed 2000 characters']
    },
    messageType: {
        type: String,
        enum: ['text', 'file', 'image', 'system'],
        required: true,
        default: 'text'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    readBy: [{
        type: Schema.Types.ObjectId,
        ref: 'Agent'
    }],
    attachments: [messageAttachmentSchema],
    replyTo: {
        type: Schema.Types.ObjectId,
        ref: 'Message'
    },
    editedAt: {
        type: Date
    },
    isEdited: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ isRead: 1 });
messageSchema.index({ messageType: 1 });

// Virtual for sender info
messageSchema.virtual('sender', {
    ref: 'Agent',
    localField: 'senderId',
    foreignField: '_id',
    justOne: true
});

// Virtual for replied message
messageSchema.virtual('repliedMessage', {
    ref: 'Message',
    localField: 'replyTo',
    foreignField: '_id',
    justOne: true
});

// Method to mark as read
messageSchema.methods.markAsRead = function (userId: string): void {
    if (!(this as any).readBy.includes(userId)) {
        (this as any).readBy.push(userId);
    }
    (this as any).isRead = (this as any).readBy.length > 0;
};

// Method to mark as unread
messageSchema.methods.markAsUnread = function (userId: string): void {
    (this as any).readBy = (this as any).readBy.filter((readerId: any) =>
        readerId.toString() !== userId
    );
    (this as any).isRead = (this as any).readBy.length > 0;
};

// Method to edit message
messageSchema.methods.editMessage = function (newContent: string): void {
    (this as any).content = newContent;
    (this as any).isEdited = true;
    (this as any).editedAt = new Date();
};

// Static method to get chat messages
messageSchema.statics.getChatMessages = async function (
    chatId: string,
    page: number = 1,
    limit: number = 50
) {
    const skip = (page - 1) * limit;

    return await this.find({ chatId })
        .populate('senderId', 'name email role')
        .populate('replyTo', 'content senderId createdAt')
        .populate('replyTo.senderId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

// Static method to get unread message count
messageSchema.statics.getUnreadCount = async function (userId: string, chatId?: string) {
    const query: any = {
        senderId: { $ne: userId },
        readBy: { $ne: userId }
    };

    if (chatId) {
        query.chatId = chatId;
    }

    return await this.countDocuments(query);
};

// Static method to mark messages as read
messageSchema.statics.markMessagesAsRead = async function (
    chatId: string,
    userId: string
) {
    return await this.updateMany(
        {
            chatId,
            senderId: { $ne: userId },
            readBy: { $ne: userId }
        },
        {
            $addToSet: { readBy: userId },
            $set: { isRead: true }
        }
    );
};

// Pre-save middleware to update chat's last message
messageSchema.pre('save', async function (next) {
    if (this.isNew && this.messageType === 'text') {
        try {
            const Chat = mongoose.model('Chat');
            await Chat.findByIdAndUpdate(this.chatId, {
                lastMessage: this.content,
                lastMessageAt: this.createdAt,
                lastMessageBy: this.senderId
            });
        } catch (error) {
            console.error('Error updating chat last message:', error);
        }
    }
    next();
});

export default mongoose.model<IMessageDocument, IMessageModel>('Message', messageSchema);
