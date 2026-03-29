"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const firebaseService_1 = require("./firebaseService");
class UpdatesService {
    db = null;
    /**
     * Initialize the service with database connection
     */
    init(db) {
        this.db = db;
        console.log('[UpdatesService] Initialized with database connection');
    }
    /**
     * Create an update entry and send push notification
     */
    async createUpdate(update) {
        if (!this.db) {
            throw new Error('UpdatesService not initialized');
        }
        try {
            // Insert update into database
            await this.db.collection('updates').insertOne({
                ...update,
                read: false,
                createdAt: new Date()
            });
            console.log(`[UpdatesService] Created update for user ${update.userId}: ${update.title}`);
            // Send push notification to user
            const user = await this.db.collection('users').findOne({ empid: update.userId });
            if (user?.fcmToken) {
                await (0, firebaseService_1.sendUpdateNotification)(user.fcmToken, update.title, update.message);
                console.log(`[UpdatesService] Sent notification to user ${update.userId}`);
            }
        }
        catch (error) {
            console.error('[UpdatesService] Error creating update:', error);
            throw error;
        }
    }
    /**
     * Get updates for a user
     */
    async getUpdates(userId, limit = 50) {
        if (!this.db) {
            throw new Error('UpdatesService not initialized');
        }
        try {
            const updates = await this.db.collection('updates')
                .find({ userId })
                .sort({ createdAt: -1 })
                .limit(limit)
                .toArray();
            console.log(`[UpdatesService] Fetched ${updates.length} updates for user ${userId}`);
            return updates;
        }
        catch (error) {
            console.error('[UpdatesService] Error fetching updates:', error);
            throw error;
        }
    }
    /**
     * Mark updates as read
     */
    async markAsRead(userId, updateIds) {
        if (!this.db) {
            throw new Error('UpdatesService not initialized');
        }
        try {
            const objectIds = updateIds.map(id => new mongodb_1.ObjectId(id));
            const result = await this.db.collection('updates').updateMany({
                userId,
                _id: { $in: objectIds }
            }, { $set: { read: true } });
            console.log(`[UpdatesService] Marked ${result.modifiedCount} updates as read for user ${userId}`);
        }
        catch (error) {
            console.error('[UpdatesService] Error marking updates as read:', error);
            throw error;
        }
    }
    /**
     * Get unread count for a user
     */
    async getUnreadCount(userId) {
        if (!this.db) {
            throw new Error('UpdatesService not initialized');
        }
        try {
            const count = await this.db.collection('updates').countDocuments({
                userId,
                read: false
            });
            console.log(`[UpdatesService] User ${userId} has ${count} unread updates`);
            return count;
        }
        catch (error) {
            console.error('[UpdatesService] Error getting unread count:', error);
            throw error;
        }
    }
}
exports.default = new UpdatesService();
//# sourceMappingURL=UpdatesService.js.map