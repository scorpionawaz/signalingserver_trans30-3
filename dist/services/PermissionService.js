"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
class PermissionService {
    cache = new Map();
    db = null;
    async init(mongoUrl, dbName = 'talker') {
        try {
            const client = new mongodb_1.MongoClient(mongoUrl);
            await client.connect();
            this.db = client.db(dbName); // Use specific database name
            console.log(`[PermissionService] Connected to MongoDB database: ${dbName}`);
        }
        catch (error) {
            console.error('[PermissionService] MongoDB connection failed:', error);
            throw error;
        }
    }
    async getUserPermissions(empid) {
        const empidNormalized = String(empid); // 👈 VALUE normalization only
        const cached = this.cache.get(empidNormalized);
        if (cached && Date.now() < cached.expires) {
            console.log(`[PermissionService] Cache hit for empid: ${empidNormalized}`);
            return cached.permissions;
        }
        if (!this.db) {
            throw new Error('PermissionService not initialized');
        }
        const user = await this.db
            .collection('users')
            .findOne({ empid: empidNormalized }); // 👈 SAME FIELD NAME
        const permissions = {
            calls: user?.botSettings?.permissions?.calls ?? true,
            messages: user?.botSettings?.permissions?.messages ?? true,
        };
        console.log(`[PermissionService] Fetched permissions for empid ${empidNormalized}:`, permissions);
        this.cache.set(empidNormalized, {
            permissions,
            expires: Date.now() + 5 * 60 * 1000,
        });
        return permissions;
    }
    // Clear cache for a specific user (useful when permissions are updated)
    clearCache(empid) {
        this.cache.delete(empid);
        console.log(`[PermissionService] Cleared cache for empid: ${empid}`);
    }
    // Clear entire cache
    clearAllCache() {
        this.cache.clear();
        console.log('[PermissionService] Cleared all cache');
    }
    /**
     * Update permissions for a user
     */
    async updatePermissions(empid, permissions) {
        if (!this.db) {
            throw new Error('PermissionService not initialized');
        }
        // Update in the users collection under botSettings.permissions
        // to match where getUserPermissions reads from
        await this.db.collection('users').updateOne({ empid }, {
            $set: {
                'botSettings.permissions.calls': permissions.calls,
                'botSettings.permissions.messages': permissions.messages,
                'botSettings.updatedAt': new Date()
            }
        });
        // Clear cache for this user so next read gets fresh data
        this.clearCache(empid);
        console.log(`[PermissionService] Updated permissions for ${empid}:`, permissions);
    }
}
exports.default = new PermissionService();
//# sourceMappingURL=PermissionService.js.map